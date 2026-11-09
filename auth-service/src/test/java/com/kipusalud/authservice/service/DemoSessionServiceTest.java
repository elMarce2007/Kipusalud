package com.kipusalud.authservice.service;

import com.kipusalud.authservice.dto.DemoSessionResponse;
import com.kipusalud.authservice.entity.DemoSession;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.DemoSessionRepository;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DemoSessionServiceTest {

    private DemoSessionRepository sessionRepository;
    private FarmaciaRepository farmaciaRepository;
    private UsuarioRepository usuarioRepository;
    private PasswordEncoder passwordEncoder;
    private DemoTenantDatabase demoTenantDatabase;
    private DemoSessionService service;

    @BeforeEach
    void setUp() {
        sessionRepository = mock(DemoSessionRepository.class);
        farmaciaRepository = mock(FarmaciaRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        demoTenantDatabase = mock(DemoTenantDatabase.class);

        Farmacia farmacia = mock(Farmacia.class);
        when(farmacia.getId()).thenReturn(27L);
        when(farmacia.getNombre()).thenReturn("Farmacia Demo");
        when(farmacia.getCodigo()).thenReturn("KIPU-DEMO");
        when(farmaciaRepository.saveAndFlush(any(Farmacia.class))).thenReturn(farmacia);
        when(sessionRepository.countByExpiraEnAfter(any())).thenReturn(0L);
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");

        service = new DemoSessionService(sessionRepository, farmaciaRepository, usuarioRepository,
                passwordEncoder, demoTenantDatabase, true, 60);
    }

    @Test
    void createsFourUniqueTemporaryRoleAccountsAndSeedsAnIsolatedPharmacy() {
        DemoSessionResponse response = service.crearSesion();

        assertEquals("Farmacia Demo", response.farmaciaNombre());
        assertEquals("KIPU-DEMO", response.farmaciaCodigo());
        assertEquals(4, response.credenciales().size());
        assertEquals(Set.of("ADMINISTRADOR", "GERENTE_SUPERVISOR", "QF_REGENTE", "EMPLEADO"),
                response.credenciales().values().stream().map(credential -> credential.rol()).collect(java.util.stream.Collectors.toSet()));
        response.credenciales().values().forEach(credential -> {
            assertFalse(credential.password().isBlank());
            assertEquals(24, credential.password().length());
        });
        verify(usuarioRepository, times(4)).save(any(Usuario.class));
        verify(sessionRepository).saveAndFlush(any(DemoSession.class));
        verify(demoTenantDatabase).seed(27L);
    }

    @Test
    void rejectsCreationWhenDemoSessionsAreDisabled() {
        DemoSessionService disabled = new DemoSessionService(sessionRepository, farmaciaRepository,
                usuarioRepository, passwordEncoder, demoTenantDatabase, false, 60);

        assertThrows(ResponseStatusException.class, disabled::crearSesion);
        verifyNoInteractions(farmaciaRepository, usuarioRepository, demoTenantDatabase);
    }

    @Test
    void purgesExpiredTenantDataBeforeRemovingItsAccounts() {
        DemoSession expired = mock(DemoSession.class);
        UUID sessionId = UUID.randomUUID();
        when(expired.getId()).thenReturn(sessionId);
        when(expired.getFarmaciaId()).thenReturn(27L);
        when(sessionRepository.findAllByExpiraEnBefore(any())).thenReturn(List.of(expired));
        when(usuarioRepository.findAllByFarmaciaId(27L)).thenReturn(List.of(new Usuario()));

        service.limpiarSesionesVencidas();

        verify(demoTenantDatabase).purge(27L);
        verify(usuarioRepository).deleteAll(anyList());
        verify(farmaciaRepository).deleteById(27L);
        verify(sessionRepository).delete(expired);
    }
}
