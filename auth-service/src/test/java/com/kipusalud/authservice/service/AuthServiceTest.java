package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.LoginRequest;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.authservice.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private FarmaciaRepository farmaciaRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    @Test
    void loginReturnsTokenWhenCredentialsBelongToSelectedFarmacia() {
        Farmacia farmacia = new Farmacia("Farmacia Central");
        ReflectionTestUtils.setField(farmacia, "id", 7L);
        ReflectionTestUtils.setField(farmacia, "codigo", "KIPU-CENTRAL");
        Usuario usuario = new Usuario(3L, "admin", "encoded", "ADMINISTRADOR", 7L);
        when(farmaciaRepository.findByCodigoIgnoreCase("KIPU-CENTRAL"))
                .thenReturn(Optional.of(farmacia));
        when(usuarioRepository.findByUsername("admin")).thenReturn(Optional.of(usuario));
        when(jwtUtil.generateToken(eq("admin"), eq("ADMINISTRADOR"), eq(7L), anyCollection()))
                .thenReturn("jwt-token");

        var response = authService.login(new LoginRequest("  KIPU-CENTRAL  ", "admin", "password"));

        assertEquals("jwt-token", response.token());
        assertEquals("KIPU-CENTRAL", response.farmaciaCodigo());
        assertEquals(7L, response.farmaciaId());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void loginRejectsUserFromAnotherFarmacia() {
        Farmacia farmacia = new Farmacia("Farmacia Central");
        ReflectionTestUtils.setField(farmacia, "id", 7L);
        ReflectionTestUtils.setField(farmacia, "codigo", "KIPU-CENTRAL");
        Usuario usuario = new Usuario(3L, "admin", "encoded", "ADMINISTRADOR", 8L);
        when(farmaciaRepository.findByCodigoIgnoreCase("KIPU-CENTRAL"))
                .thenReturn(Optional.of(farmacia));
        when(usuarioRepository.findByUsername("admin")).thenReturn(Optional.of(usuario));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(new LoginRequest("KIPU-CENTRAL", "admin", "password")));

        assertEquals(401, exception.getStatusCode().value());
        verify(jwtUtil, never()).generateToken(any(), any(), any(), any());
    }

    @Test
    void loginRejectsUnknownFarmaciaBeforeAuthenticatingCredentials() {
        when(farmaciaRepository.findByCodigoIgnoreCase("UNKNOWN")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(new LoginRequest("UNKNOWN", "admin", "password")));

        assertEquals(401, exception.getStatusCode().value());
        verify(authenticationManager, never()).authenticate(any());
    }
}
