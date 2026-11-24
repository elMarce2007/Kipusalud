package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.DemoCredentialDto;
import com.kipusalud.authservice.dto.DemoSessionResponse;
import com.kipusalud.authservice.entity.DemoSession;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.DemoSessionRepository;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.security.RolePermissions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DemoSessionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DemoSessionService.class);
    private static final int MAX_ACTIVE_SESSIONS = 100;
    private static final char[] PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".toCharArray();
    private static final Map<String, String> ROLE_LABELS;

    static {
        Map<String, String> roles = new LinkedHashMap<>();
        roles.put("ADMINISTRADOR", "Administrador");
        roles.put("GERENTE_SUPERVISOR", "Gerente / Supervisor");
        roles.put("QF_REGENTE", "Químico farmacéutico");
        roles.put("EMPLEADO", "Empleado / Cajero");
        ROLE_LABELS = Collections.unmodifiableMap(roles);
    }

    private final DemoSessionRepository sessionRepository;
    private final FarmaciaRepository farmaciaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoTenantDatabase demoTenantDatabase;
    private final SecureRandom secureRandom = new SecureRandom();
    private final boolean enabled;
    private final long ttlMinutes;

    public DemoSessionService(
            DemoSessionRepository sessionRepository,
            FarmaciaRepository farmaciaRepository,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            DemoTenantDatabase demoTenantDatabase,
            @Value("${demo.sessions.enabled:false}") boolean enabled,
            @Value("${demo.sessions.ttl-minutes:60}") long ttlMinutes) {
        this.sessionRepository = sessionRepository;
        this.farmaciaRepository = farmaciaRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoTenantDatabase = demoTenantDatabase;
        this.enabled = enabled;
        this.ttlMinutes = ttlMinutes;
    }

    @Transactional
    public synchronized DemoSessionResponse crearSesion() {
        requireEnabled();
        Instant now = Instant.now();
        if (sessionRepository.countByExpiraEnAfter(now) >= MAX_ACTIVE_SESSIONS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Hay muchas sesiones de demostración activas. Inténtalo más tarde.");
        }

        UUID sessionId = UUID.randomUUID();
        Instant expiresAt = now.plusSeconds(ttlMinutes * 60);
        Farmacia farmacia = farmaciaRepository.saveAndFlush(new Farmacia("Farmacia Demo " + sessionId.toString().substring(0, 8)));
        Map<String, DemoCredentialDto> credentials = new LinkedHashMap<>();

        for (Map.Entry<String, String> role : ROLE_LABELS.entrySet()) {
            String username = "demo_" + sessionId.toString().replace("-", "").substring(0, 12)
                    + "_" + usernameSuffix(role.getKey());
            String password = randomPassword();
            Usuario usuario = new Usuario();
            usuario.setUsername(username);
            usuario.setPassword(passwordEncoder.encode(password));
            usuario.setRol(role.getKey());
            usuario.setFarmaciaId(farmacia.getId());
            usuarioRepository.save(usuario);
            credentials.put(role.getKey(),
                    new DemoCredentialDto(username, password, role.getKey(), role.getValue()));
        }

        sessionRepository.saveAndFlush(new DemoSession(sessionId, farmacia.getId(), now, expiresAt));
        try {
            demoTenantDatabase.seed(farmacia.getId(), new DemoDataset.Usuarios(
                    credentials.get("ADMINISTRADOR").username(), credentials.get("GERENTE_SUPERVISOR").username(),
                    credentials.get("QF_REGENTE").username(), credentials.get("EMPLEADO").username()));
        } catch (RuntimeException error) {
            LOGGER.error("No se pudo completar la inicialización de la sesión demo {}", sessionId, error);
            try {
                demoTenantDatabase.purge(farmacia.getId());
                removeAuthData(farmacia.getId());
                sessionRepository.deleteById(sessionId);
            } catch (RuntimeException cleanupError) {
                LOGGER.error("La limpieza de la sesión demo {} se reintentará al expirar", sessionId, cleanupError);
            }
            throw error;
        }

        return new DemoSessionResponse(farmacia.getNombre(), farmacia.getCodigo(), expiresAt, credentials);
    }

    @Scheduled(fixedDelayString = "${demo.sessions.cleanup-ms:300000}")
    public void limpiarSesionesVencidas() {
        for (DemoSession session : sessionRepository.findAllByExpiraEnBefore(Instant.now())) {
            try {
                demoTenantDatabase.purge(session.getFarmaciaId());
                removeAuthData(session.getFarmaciaId());
                sessionRepository.delete(session);
            } catch (RuntimeException error) {
                LOGGER.error("No se pudo limpiar la sesión demo {}; se reintentará", session.getId(), error);
            }
        }
    }

    private void requireEnabled() {
        if (!enabled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private void removeAuthData(Long farmaciaId) {
        List<Usuario> users = usuarioRepository.findAllByFarmaciaId(farmaciaId);
        usuarioRepository.deleteAll(users);
        farmaciaRepository.deleteById(farmaciaId);
    }

    private String usernameSuffix(String role) {
        return switch (role) {
            case "ADMINISTRADOR" -> "admin";
            case "GERENTE_SUPERVISOR" -> "gerente";
            case "QF_REGENTE" -> "qf";
            default -> "empleado";
        };
    }

    private String randomPassword() {
        char[] password = new char[24];
        for (int index = 0; index < password.length; index++) {
            password[index] = PASSWORD_CHARS[secureRandom.nextInt(PASSWORD_CHARS.length)];
        }
        return new String(password);
    }
}
