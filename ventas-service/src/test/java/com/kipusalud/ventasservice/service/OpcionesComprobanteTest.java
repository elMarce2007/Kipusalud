package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantTestSupport;
import com.kipusalud.ventasservice.dto.OpcionesComprobanteDto;
import com.kipusalud.ventasservice.dto.SunatConfiguracionRequest;
import com.kipusalud.ventasservice.entity.SunatConfiguracion;
import com.kipusalud.ventasservice.repository.ComprobanteElectronicoRepository;
import com.kipusalud.ventasservice.repository.SunatConfiguracionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OpcionesComprobanteTest {

    private final SunatConfiguracionRepository repository = mock(SunatConfiguracionRepository.class);
    private final ComprobanteElectronicoRepository comprobantes = mock(ComprobanteElectronicoRepository.class);
    private final SunatConfiguracionService service =
            new SunatConfiguracionService(repository, comprobantes, mock(SunatSecretCrypto.class));

    @BeforeEach
    void setUp() {
        TenantTestSupport.usar(3L, "EMPLEADO");
    }

    @AfterEach
    void tearDown() {
        TenantTestSupport.limpiar();
    }

    @Test
    void sinDatosFiscalesSoloQuedaLaBoletaInterna() {
        when(repository.findById(3L)).thenReturn(Optional.empty());

        OpcionesComprobanteDto opciones = service.opciones();

        assertFalse(opciones.boletaElectronicaDisponible());
        assertFalse(opciones.facturaDisponible());
        assertNotNull(opciones.motivoNoDisponible());
        assertNull(opciones.emisor());
    }

    @Test
    void conDatosFiscalesSinCredencialesMuestraElEmisorPeroNoHabilitaSunat() {
        when(repository.findById(3L)).thenReturn(Optional.of(perfil(false)));

        OpcionesComprobanteDto opciones = service.opciones();

        assertFalse(opciones.facturaDisponible());
        assertEquals("20999999991", opciones.emisor().ruc());
    }

    @Test
    void conCredencialesHabilitaBoletaYFactura() {
        when(repository.findById(3L)).thenReturn(Optional.of(perfil(true)));

        OpcionesComprobanteDto opciones = service.opciones();

        assertTrue(opciones.boletaElectronicaDisponible());
        assertTrue(opciones.facturaDisponible());
    }

    @Test
    void elPerfilFiscalSeGuardaSinSecretos() {
        when(repository.findForUpdate(3L)).thenReturn(Optional.empty());
        when(repository.save(any(SunatConfiguracion.class))).thenAnswer(i -> i.getArgument(0));
        when(comprobantes.ultimoNumero(any(), any(), any())).thenReturn(Optional.of("00000009"));

        var dto = service.guardarPerfil(new SunatConfiguracionRequest("20999999991", "Botica SAC",
                "Av. Uno 1", "150101", "Lima", "Lima", "Lima", "f001", "b001", null, null));

        assertEquals("F001", dto.serieFactura());
        assertEquals("B001", dto.serieBoleta());
        assertFalse(dto.credencialesConfiguradas());
    }

    private SunatConfiguracion perfil(boolean conCredenciales) {
        SunatConfiguracion config = new SunatConfiguracion();
        config.setFarmaciaId(3L);
        config.setRuc("20999999991");
        config.setRazonSocial("Botica SAC");
        config.setDireccionFiscal("Av. Uno 1");
        config.setSerieFactura("F001");
        config.setSerieBoleta("B001");
        if (conCredenciales) {
            config.setSolUsuarioCifrado(new byte[]{1});
            config.setSolClaveCifrada(new byte[]{1});
            config.setCertificadoCifrado(new byte[]{1});
            config.setCertificadoClaveCifrada(new byte[]{1});
        }
        return config;
    }
}
