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
import com.kipusalud.security.TenantContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

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
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        Usuario usuario = usuarioRepository.findByUsername(request.username())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (!usuario.isActivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La cuenta está desactivada");
        }
        Farmacia farmacia = farmaciaRepository.findById(usuario.getFarmaciaId())
                .orElseThrow(() -> new IllegalStateException("La cuenta no tiene una farmacia válida"));
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
                .map(usuario -> new UsuarioDto(usuario.getId(), usuario.getUsername(),
                        usuario.getRol(), usuario.isActivo()))
                .toList();
    }

    public UsuarioDto crearEmpleado(CrearUsuarioRequest request) {
        validarCuenta(request.username(), request.password());
        Long farmaciaId = TenantContext.requireFarmaciaId();
        if (usuarioRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El nombre de usuario ya está en uso");
        }
        Usuario usuario = new Usuario();
        usuario.setUsername(request.username());
        usuario.setPassword(passwordEncoder.encode(request.password()));
        usuario.setRol("EMPLEADO");
        usuario.setFarmaciaId(farmaciaId);
        Usuario saved = usuarioRepository.save(usuario);
        return new UsuarioDto(saved.getId(), saved.getUsername(), saved.getRol(), saved.isActivo());
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
        String token = jwtUtil.generateToken(usuario.getUsername(), usuario.getRol(), farmacia.getId());
        return new LoginResponse(token, usuario.getUsername(), usuario.getRol(),
                farmacia.getId(), farmacia.getNombre());
    }
}
