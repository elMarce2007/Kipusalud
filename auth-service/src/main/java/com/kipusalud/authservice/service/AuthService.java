package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.LoginRequest;
import com.kipusalud.authservice.dto.LoginResponse;
import com.kipusalud.authservice.dto.RegistroRequest;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.dto.CrearUsuarioRequest;
import com.kipusalud.authservice.dto.UsuarioDto;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.authservice.util.JwtUtil;
import com.kipusalud.authservice.dto.ActualizarFarmaciaRequest;
import com.kipusalud.authservice.dto.ActualizarUsuarioRequest;
import com.kipusalud.authservice.dto.FarmaciaDto;
import com.kipusalud.security.RolePermissions;
import com.kipusalud.security.TenantContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final FarmaciaRepository farmaciaRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthService(UsuarioRepository usuarioRepository, FarmaciaRepository farmaciaRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.farmaciaRepository = farmaciaRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest request) {
        String codigo = request.farmaciaCodigo() == null ? "" : request.farmaciaCodigo().trim();
        Farmacia farmacia = farmaciaRepository.findByCodigoIgnoreCase(codigo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Código de farmacia, usuario o contraseña incorrectos"));
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        Usuario usuario = usuarioRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Código de farmacia, usuario o contraseña incorrectos"));
        if (!farmacia.getId().equals(usuario.getFarmaciaId())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Código de farmacia, usuario o contraseña incorrectos");
        }
        if (!usuario.isActivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está desactivada");
        }
        return loginResponse(usuario, farmacia);
    }

    @Transactional
    public LoginResponse registrar(RegistroRequest request) {
        validarCuenta(request.username(), request.password());
        if (request.farmaciaNombre() == null || request.farmaciaNombre().isBlank()
                || request.farmaciaNombre().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El nombre de la farmacia es obligatorio y debe tener hasta 120 caracteres");
        }
        if (usuarioRepository.findByUsername(request.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        Farmacia farmacia = farmaciaRepository.save(new Farmacia(request.farmaciaNombre().trim()));
        Usuario usuario = new Usuario();
        usuario.setUsername(request.username());
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setRol("ADMINISTRADOR");
        usuario.setFarmaciaId(farmacia.getId());
        Usuario saved = usuarioRepository.save(usuario);
        return loginResponse(saved, farmacia);
    }

    public List<UsuarioDto> listarUsuarios() {
        return usuarioRepository.findAllByFarmaciaIdOrderByUsername(TenantContext.requireFarmaciaId())
                .stream()
                .map(this::toUsuarioDto)
                .toList();
    }

    public UsuarioDto crearEmpleado(CrearUsuarioRequest request) {
        String rol = request.rol() == null || request.rol().isBlank() ? "EMPLEADO" : request.rol();
        if (!Set.of("EMPLEADO", "QF_REGENTE", "GERENTE_SUPERVISOR").contains(rol)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rol solicitado no está permitido");
        }
        String callerRole = TenantContext.requireRole();
        if ("GERENTE_SUPERVISOR".equals(callerRole) && !"EMPLEADO".equals(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "El gerente solo puede crear cuentas de Empleado/Cajero");
        }
        Set<String> permisos = validarPermisos(rol, request.permisos());
        validarCuenta(request.username(), request.password());
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (usuarioRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        Usuario usuario = new Usuario();
        usuario.setUsername(request.username());
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setRol(rol);
        usuario.setFarmaciaId(farmaciaId);
        usuario.setPermisos(permisos);
        Usuario saved = usuarioRepository.save(usuario);
        return toUsuarioDto(saved);
    }

    public UsuarioDto actualizarUsuario(Long id, ActualizarUsuarioRequest request) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        Usuario usuario = usuarioRepository.findByIdAndFarmaciaId(id, farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if ("ADMINISTRADOR".equals(usuario.getRol())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La cuenta inicial de administrador no se puede modificar desde esta vista");
        }
        String callerRole = TenantContext.requireRole();
        String role = request.rol();
        if (role == null || !Set.of("EMPLEADO", "QF_REGENTE", "GERENTE_SUPERVISOR").contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rol solicitado no está permitido");
        }
        if ("GERENTE_SUPERVISOR".equals(callerRole)
                && (!"EMPLEADO".equals(usuario.getRol()) || !"EMPLEADO".equals(role))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "El gerente solo puede administrar cuentas de Empleado/Cajero");
        }
        if (usuario.getUsername().equals(TenantContext.requireUsername()) && !request.activo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No puedes desactivar tu propia cuenta");
        }
        usuario.setRol(role);
        usuario.setActivo(request.activo());
        usuario.setPermisos(validarPermisos(role, request.permisos()));
        return toUsuarioDto(usuarioRepository.save(usuario));
    }

    public FarmaciaDto obtenerFarmacia() {
        Farmacia farmacia = farmaciaRepository.findById(TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new IllegalStateException("La cuenta no tiene una farmacia válida"));
        return new FarmaciaDto(farmacia.getId(), farmacia.getNombre(), farmacia.getCodigo());
    }

    public FarmaciaDto actualizarFarmacia(ActualizarFarmaciaRequest request) {
        String nombre = request == null ? null : request.nombre();
        if (nombre == null || nombre.isBlank() || nombre.trim().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El nombre de la farmacia es obligatorio y debe tener hasta 120 caracteres");
        }
        Farmacia farmacia = farmaciaRepository.findById(TenantContext.requireFarmaciaId())
                .orElseThrow(() -> new IllegalStateException("La cuenta no tiene una farmacia válida"));
        farmacia.setNombre(nombre.trim());
        Farmacia saved = farmaciaRepository.save(farmacia);
        return new FarmaciaDto(saved.getId(), saved.getNombre(), saved.getCodigo());
    }

    private void validarCuenta(String username, String password) {
        if (username == null || !username.matches("[A-Za-z0-9._-]{3,50}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El usuario debe tener entre 3 y 50 caracteres alfanuméricos");
        }
        if (password == null || password.length() < 12 || password.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener entre 12 y 72 caracteres");
        }
    }

    private LoginResponse loginResponse(Usuario usuario, Farmacia farmacia) {
        Set<String> permissions = RolePermissions.effectivePermissions(usuario.getRol(), usuario.getPermisos());
        String token = jwtUtil.generateToken(
                usuario.getUsername(), usuario.getRol(), farmacia.getId(), permissions);
        return new LoginResponse(token, usuario.getUsername(), usuario.getRol(),
                farmacia.getId(), farmacia.getNombre(), farmacia.getCodigo(), permissions);
    }

    private UsuarioDto toUsuarioDto(Usuario usuario) {
        return new UsuarioDto(usuario.getId(), usuario.getUsername(), usuario.getRol(), usuario.isActivo(),
                RolePermissions.effectivePermissions(usuario.getRol(), usuario.getPermisos()));
    }

    private Set<String> validarPermisos(String rol, Set<String> permisos) {
        Set<String> requested = permisos == null ? Set.of() : Set.copyOf(permisos);
        if (!"GERENTE_SUPERVISOR".equals(rol) && !requested.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Los permisos delegables solo se asignan al rol Gerente/Supervisor");
        }
        if (requested.stream().anyMatch(permission -> !RolePermissions.isManagerDelegation(permission))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La delegación contiene un permiso no permitido");
        }
        return requested;
    }
}
