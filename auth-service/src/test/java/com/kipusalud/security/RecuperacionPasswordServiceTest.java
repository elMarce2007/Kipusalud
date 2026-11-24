package com.kipusalud.security;

import com.kipusalud.authservice.dto.CambiarPasswordRequest;
import com.kipusalud.authservice.dto.CodigoRecuperacionDto;
import com.kipusalud.authservice.dto.RecuperarPasswordRequest;
import com.kipusalud.authservice.entity.CodigoRecuperacion;
import com.kipusalud.authservice.entity.Farmacia;
import com.kipusalud.authservice.entity.Usuario;
import com.kipusalud.authservice.repository.CodigoRecuperacionRepository;
import com.kipusalud.authservice.repository.FarmaciaRepository;
import com.kipusalud.authservice.repository.UsuarioRepository;
import com.kipusalud.authservice.service.RecuperacionPasswordService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Recuperación de contraseña con código de un solo uso y cambio de la propia contraseña. */
class RecuperacionPasswordServiceTest {

    private static final Long FARMACIA = 7L;
    private static final Instant AHORA = Instant.parse("2026-11-24T15:00:00Z");
    private static final String NUEVA = "nueva-clave-segura";

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private UsuarioRepository usuarios;
    private FarmaciaRepository farmacias;
    private CodigoRecuperacionRepository codigos;
    private Clock reloj;
    private RecuperacionPasswordService service;
    private Usuario cajero;
    private Farmacia farmacia;

    @BeforeEach
    void setUp() {
        usuarios = mock(UsuarioRepository.class);
        farmacias = mock(FarmaciaRepository.class);
        codigos = mock(CodigoRecuperacionRepository.class);
        reloj = Clock.fixed(AHORA, ZoneOffset.UTC);
        service = new RecuperacionPasswordService(usuarios, farmacias, codigos, encoder, reloj);
        cajero = new Usuario(5L, "cajero1", encoder.encode("clave-anterior-1"), "EMPLEADO", FARMACIA);
        farmacia = new Farmacia("Central");
        ReflectionTestUtils.setField(farmacia, "id", FARMACIA);
        ReflectionTestUtils.setField(farmacia, "codigo", "KIPU-CENTRAL");
        when(usuarios.findByIdAndFarmaciaId(5L, FARMACIA)).thenReturn(Optional.of(cajero));
        when(usuarios.findByUsername("cajero1")).thenReturn(Optional.of(cajero));
        when(farmacias.findByCodigoIgnoreCase("KIPU-CENTRAL")).thenReturn(Optional.of(farmacia));
        when(codigos.save(any(CodigoRecuperacion.class))).thenAnswer(i -> i.getArgument(0));
        usarRol("admin", "ADMINISTRADOR");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void generaCodigoDeSeisDigitosGuardandoSoloElHashYAnulaLosAnteriores() {
        CodigoRecuperacion anterior = codigoVigente("123456");
        when(codigos.findAllByUsuarioIdAndUsadoEnIsNull(5L)).thenReturn(List.of(anterior));

        CodigoRecuperacionDto dto = service.generarCodigo(5L);

        assertTrue(dto.codigo().matches("\\d{6}"));
        assertEquals(AHORA.plus(Duration.ofMinutes(15)), dto.expiraEn());
        assertNotNull(anterior.getUsadoEn());
        ArgumentCaptor<CodigoRecuperacion> guardado = ArgumentCaptor.forClass(CodigoRecuperacion.class);
        verify(codigos).save(guardado.capture());
        assertNotEquals(dto.codigo(), guardado.getValue().getCodigoHash());
        assertTrue(encoder.matches(dto.codigo(), guardado.getValue().getCodigoHash()));
    }

    @Test
    void gerenteSoloGeneraCodigosParaCajeros() {
        usarRol("gerente", "GERENTE_SUPERVISOR");
        cajero.setRol("QF_REGENTE");

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.generarCodigo(5L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(codigos, never()).save(any());
    }

    @Test
    void codigoCorrectoCambiaLaContrasenaYSeUsaUnaSolaVez() {
        CodigoRecuperacion codigo = codigoVigente("482915");
        when(codigos.findFirstByUsuarioIdAndUsadoEnIsNullOrderByCreadoEnDesc(5L)).thenReturn(Optional.of(codigo));

        service.recuperar(new RecuperarPasswordRequest(" KIPU-CENTRAL ", "cajero1", "482915", NUEVA));

        assertTrue(encoder.matches(NUEVA, cajero.getPassword()));
        assertEquals(AHORA, codigo.getUsadoEn());
    }

    @Test
    void codigoIncorrectoSumaIntentosYTrasCincoQuedaInvalidado() {
        CodigoRecuperacion codigo = codigoVigente("482915");
        when(codigos.findFirstByUsuarioIdAndUsadoEnIsNullOrderByCreadoEnDesc(5L)).thenReturn(Optional.of(codigo));
        for (int i = 0; i < 5; i++) {
            assertThrows(ResponseStatusException.class, () ->
                    service.recuperar(new RecuperarPasswordRequest("KIPU-CENTRAL", "cajero1", "000000", NUEVA)));
        }

        assertEquals(5, codigo.getIntentos());
        assertThrows(ResponseStatusException.class, () ->
                service.recuperar(new RecuperarPasswordRequest("KIPU-CENTRAL", "cajero1", "482915", NUEVA)));
        assertFalse(encoder.matches(NUEVA, cajero.getPassword()));
    }

    @Test
    void codigoVencidoOFarmaciaAjenaDevuelvenElMismoError() {
        CodigoRecuperacion vencido = new CodigoRecuperacion(5L, FARMACIA, encoder.encode("482915"),
                AHORA.minusSeconds(1), "admin", AHORA.minus(Duration.ofMinutes(20)));
        when(codigos.findFirstByUsuarioIdAndUsadoEnIsNullOrderByCreadoEnDesc(5L)).thenReturn(Optional.of(vencido));

        ResponseStatusException porVencido = assertThrows(ResponseStatusException.class, () ->
                service.recuperar(new RecuperarPasswordRequest("KIPU-CENTRAL", "cajero1", "482915", NUEVA)));
        ResponseStatusException porFarmacia = assertThrows(ResponseStatusException.class, () ->
                service.recuperar(new RecuperarPasswordRequest("KIPU-OTRA", "cajero1", "482915", NUEVA)));

        assertEquals(porVencido.getReason(), porFarmacia.getReason());
        assertEquals(HttpStatus.BAD_REQUEST, porVencido.getStatusCode());
    }

    @Test
    void laNuevaContrasenaDebeTenerAlMenosDoceCaracteres() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                service.recuperar(new RecuperarPasswordRequest("KIPU-CENTRAL", "cajero1", "482915", "corta")));

        assertTrue(error.getReason().contains("12"));
    }

    @Test
    void cambiarPropiaExigeLaContrasenaActual() {
        usarRol("cajero1", "EMPLEADO");

        assertThrows(ResponseStatusException.class, () ->
                service.cambiarPropia(new CambiarPasswordRequest("equivocada-123", NUEVA)));
        service.cambiarPropia(new CambiarPasswordRequest("clave-anterior-1", NUEVA));

        assertTrue(encoder.matches(NUEVA, cajero.getPassword()));
    }

    private CodigoRecuperacion codigoVigente(String codigo) {
        return new CodigoRecuperacion(5L, FARMACIA, encoder.encode(codigo), AHORA.plus(Duration.ofMinutes(10)),
                "admin", AHORA.minus(Duration.ofMinutes(5)));
    }

    private void usarRol(String usuario, String rol) {
        TenantContext.set(new TenantContext.Identity(usuario, FARMACIA, rol, Set.of()));
    }
}
