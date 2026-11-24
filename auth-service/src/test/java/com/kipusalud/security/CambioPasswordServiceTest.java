package com.kipusalud.security;

import com.kipusalud.authservice.dto.CambiarPasswordRequest;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.authservice.service.CambioPasswordService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CambioPasswordServiceTest {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final CambioPasswordService service = new CambioPasswordService(usuarios, encoder);
    private Usuario cajero;

    @BeforeEach
    void setUp() {
        cajero = new Usuario(5L, "cajero1", encoder.encode("clave-anterior-1"), "EMPLEADO", 7L);
        when(usuarios.findByUsername("cajero1")).thenReturn(Optional.of(cajero));
        TenantContext.set(new TenantContext.Identity("cajero1", 7L, "EMPLEADO", Set.of()));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void exigeLaContrasenaActualYUnaNuevaValida() {
        assertThrows(ResponseStatusException.class, () ->
                service.cambiarPropia(new CambiarPasswordRequest("equivocada-123", "nueva-clave-segura")));
        assertThrows(ResponseStatusException.class, () ->
                service.cambiarPropia(new CambiarPasswordRequest("clave-anterior-1", "corta")));
        assertThrows(ResponseStatusException.class, () ->
                service.cambiarPropia(new CambiarPasswordRequest("clave-anterior-1", "clave-anterior-1")));

        service.cambiarPropia(new CambiarPasswordRequest("clave-anterior-1", "nueva-clave-segura"));

        assertTrue(encoder.matches("nueva-clave-segura", cajero.getPassword()));
    }

    @Test
    void noCambiaLaContrasenaDeUnUsuarioDeOtraFarmacia() {
        TenantContext.set(new TenantContext.Identity("cajero1", 8L, "EMPLEADO", Set.of()));

        assertThrows(ResponseStatusException.class, () ->
                service.cambiarPropia(new CambiarPasswordRequest("clave-anterior-1", "nueva-clave-segura")));
        verify(usuarios, never()).save(any());
    }
}
