package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.CambiarPasswordRequest;
import com.kipusalud.authservice.dto.CodigoRecuperacionDto;
import com.kipusalud.authservice.dto.RecuperarPasswordRequest;
import com.kipusalud.authservice.entity.CodigoRecuperacion;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.CodigoRecuperacionRepository;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

/**
 * Recuperación de contraseña sin correo: el administrador (o el gerente, para
 * cuentas de Empleado/Cajero) genera un código de 6 dígitos válido por 15 minutos
 * y se lo entrega al colaborador, que lo usa en la pantalla de inicio de sesión.
 * El código es de un solo uso, se guarda con hash y se invalida tras 5 intentos.
 */
@Service
public class RecuperacionPasswordService {

    static final Duration VIGENCIA = Duration.ofMinutes(15);
    static final int MAX_INTENTOS = 5;
    static final String CODIGO_INVALIDO = "El código no es válido o ya venció. Pide uno nuevo al administrador.";

    private final UsuarioRepository usuarioRepository;
    private final FarmaciaRepository farmaciaRepository;
    private final CodigoRecuperacionRepository codigoRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;
    /** Hash de relleno para que una cuenta inexistente tarde lo mismo que una real. */
    private final String hashDeRelleno;

    @org.springframework.beans.factory.annotation.Autowired
    public RecuperacionPasswordService(UsuarioRepository usuarioRepository, FarmaciaRepository farmaciaRepository,
                                       CodigoRecuperacionRepository codigoRepository,
                                       PasswordEncoder passwordEncoder) {
        this(usuarioRepository, farmaciaRepository, codigoRepository, passwordEncoder, Clock.systemUTC());
    }

    public RecuperacionPasswordService(UsuarioRepository usuarioRepository, FarmaciaRepository farmaciaRepository,
                                CodigoRecuperacionRepository codigoRepository, PasswordEncoder passwordEncoder,
                                Clock clock) {
        this.usuarioRepository = usuarioRepository;
        this.farmaciaRepository = farmaciaRepository;
        this.codigoRepository = codigoRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.hashDeRelleno = passwordEncoder.encode("000000");
    }

    @Transactional
    public CodigoRecuperacionDto generarCodigo(Long usuarioId) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        Usuario usuario = usuarioRepository.findByIdAndFarmaciaId(usuarioId, farmaciaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if ("ADMINISTRADOR".equals(usuario.getRol())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La contraseña del administrador se cambia desde su propia sesión");
        }
        if (usuario.getUsername().equals(TenantContext.requireUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cambia tu propia contraseña desde «Cambiar contraseña»");
        }
        if ("GERENTE_SUPERVISOR".equals(TenantContext.requireRole()) && !"EMPLEADO".equals(usuario.getRol())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "El gerente solo puede generar códigos para cuentas de Empleado/Cajero");
        }
        if (!usuario.isActivo()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La cuenta está desactivada");
        }
        Instant ahora = clock.instant();
        codigoRepository.findAllByUsuarioIdAndUsadoEnIsNull(usuario.getId()).forEach(c -> c.marcarUsado(ahora));
        String codigo = String.format("%06d", random.nextInt(1_000_000));
        Instant expira = ahora.plus(VIGENCIA);
        codigoRepository.save(new CodigoRecuperacion(usuario.getId(), farmaciaId, passwordEncoder.encode(codigo),
                expira, TenantContext.requireUsername(), ahora));
        return new CodigoRecuperacionDto(usuario.getUsername(), codigo, expira);
    }

    /** Los fallos devuelven siempre el mismo mensaje para no revelar qué dato es incorrecto. */
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void recuperar(RecuperarPasswordRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, CODIGO_INVALIDO);
        }
        validarNuevaPassword(request.nuevaPassword());
        String codigo = request.codigo() == null ? "" : request.codigo().trim();
        Optional<Usuario> usuario = buscarUsuario(request.farmaciaCodigo(), request.username());
        Optional<CodigoRecuperacion> vigente = usuario
                .flatMap(u -> codigoRepository.findFirstByUsuarioIdAndUsadoEnIsNullOrderByCreadoEnDesc(u.getId()))
                .filter(c -> c.getExpiraEn().isAfter(clock.instant()) && c.getIntentos() < MAX_INTENTOS);
        if (vigente.isEmpty()) {
            passwordEncoder.matches(codigo, hashDeRelleno);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, CODIGO_INVALIDO);
        }
        CodigoRecuperacion registro = vigente.get();
        if (!codigo.matches("\\d{6}") || !passwordEncoder.matches(codigo, registro.getCodigoHash())) {
            registro.registrarIntentoFallido();
            codigoRepository.save(registro);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, CODIGO_INVALIDO);
        }
        Usuario cuenta = usuario.get();
        cuenta.setPassword(passwordEncoder.encode(request.nuevaPassword()));
        usuarioRepository.save(cuenta);
        registro.marcarUsado(clock.instant());
        codigoRepository.save(registro);
    }

    @Transactional
    public void cambiarPropia(CambiarPasswordRequest request) {
        Usuario usuario = usuarioRepository.findByUsername(TenantContext.requireUsername())
                .filter(u -> u.getFarmaciaId().equals(TenantContext.requireFarmaciaId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión no válida"));
        if (request == null || request.passwordActual() == null
                || !passwordEncoder.matches(request.passwordActual(), usuario.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual no es correcta");
        }
        validarNuevaPassword(request.nuevaPassword());
        if (request.nuevaPassword().equals(request.passwordActual())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe ser distinta de la actual");
        }
        usuario.setPassword(passwordEncoder.encode(request.nuevaPassword()));
        usuarioRepository.save(usuario);
    }

    private Optional<Usuario> buscarUsuario(String farmaciaCodigo, String username) {
        String codigoFarmacia = farmaciaCodigo == null ? "" : farmaciaCodigo.trim();
        Optional<Farmacia> farmacia = farmaciaRepository.findByCodigoIgnoreCase(codigoFarmacia);
        if (farmacia.isEmpty() || username == null) return Optional.empty();
        return usuarioRepository.findByUsername(username.trim())
                .filter(u -> u.getFarmaciaId().equals(farmacia.get().getId()) && u.isActivo());
    }

    /** Misma regla que al crear cuentas: entre 12 y 72 caracteres. */
    private static void validarNuevaPassword(String password) {
        if (password == null || password.length() < 12 || password.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La nueva contraseña debe tener entre 12 y 72 caracteres");
        }
    }
}
