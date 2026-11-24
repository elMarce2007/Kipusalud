package com.kipusalud.ventasservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.security.TenantTestSupport;
import com.kipusalud.ventasservice.dto.DetalleVentaDto;
import com.kipusalud.ventasservice.dto.VentaDto;
import com.kipusalud.ventasservice.entity.CorrelativoComprobante;
import com.kipusalud.ventasservice.entity.Venta;
import com.kipusalud.ventasservice.repository.CorrelativoComprobanteRepository;
import com.kipusalud.ventasservice.repository.VentaRepository;
import com.kipusalud.ventasservice.socket.SocketNotificationServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Reglas del comprobante de pago elegido al registrar la venta. */
class VentaComprobanteTest {

    private static final Long FARMACIA = 7L;

    private final VentaRepository ventaRepository = mock(VentaRepository.class);
    private final CatalogoClient catalogoClient = mock(CatalogoClient.class);
    private final ClienteClient clienteClient = mock(ClienteClient.class);
    private final SunatConfiguracionService sunat = mock(SunatConfiguracionService.class);
    private final CorrelativoComprobanteRepository correlativos = mock(CorrelativoComprobanteRepository.class);
    private VentaServiceImpl service;

    @BeforeEach
    void setUp() {
        TenantTestSupport.usar(FARMACIA, "EMPLEADO");
        service = new VentaServiceImpl(ventaRepository, mock(SocketNotificationServer.class), catalogoClient,
                clienteClient, new ObjectMapper(), mock(DomainEventOutbox.class), sunat, correlativos);
        when(ventaRepository.findByFarmaciaIdAndClaveIdempotencia(any(), anyString())).thenReturn(Optional.empty());
        when(ventaRepository.saveAndFlush(any(Venta.class))).thenAnswer(i -> i.getArgument(0));
        when(catalogoClient.obtenerProducto(1L)).thenReturn(new CatalogoClient.ProductoCatalogo(
                1L, "Paracetamol", new BigDecimal("8.50"), 10, "10", true));
    }

    @AfterEach
    void tearDown() {
        TenantTestSupport.limpiar();
    }

    @Test
    void boletaInternaSinClienteRecibeCorrelativoInterno() {
        CorrelativoComprobante correlativo = new CorrelativoComprobante(FARMACIA, "I001");
        correlativo.setSiguienteNumero(41L);
        when(correlativos.findForUpdate(FARMACIA, "I001")).thenReturn(Optional.of(correlativo));

        VentaDto venta = service.crear(solicitud(null, null));

        assertEquals("BOLETA_INTERNA", venta.tipoComprobante());
        assertEquals("I001", venta.serieComprobante());
        assertEquals("00000041", venta.numeroComprobante());
        assertEquals(42L, correlativo.getSiguienteNumero());
        verify(sunat, never()).validarEmisionDisponible(any(), anyString());
    }

    @Test
    void guardaQuienVendioYUnaCopiaDelCliente() {
        CorrelativoComprobante correlativo = new CorrelativoComprobante(FARMACIA, "I001");
        when(correlativos.findForUpdate(FARMACIA, "I001")).thenReturn(Optional.of(correlativo));
        when(clienteClient.obtenerCliente(5L)).thenReturn(new ClienteClient.ClienteDto(
                5L, "Ana", "Demo", "12345678", "9", "a@example.invalid", null, null, null));

        VentaDto venta = service.crear(solicitud(null, 5L));

        assertEquals("usuario-prueba", venta.registradoPor());
        assertEquals("Ana Demo", venta.clienteNombre());
        assertEquals("DNI 12345678", venta.clienteDocumento());
    }

    @Test
    void facturaSinClienteSeRechazaAntesDeTocarInventario() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.crear(solicitud("FACTURA", null)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(catalogoClient, never()).descontarPorLotes(anyString(), anyList());
    }

    @Test
    void facturaConClienteSinRucSeRechazaAntesDeTocarInventario() {
        when(clienteClient.obtenerCliente(5L)).thenReturn(new ClienteClient.ClienteDto(
                5L, "Ana", "Demo", "12345678", "9", "a@example.invalid", null, null, null));

        assertThrows(ResponseStatusException.class, () -> service.crear(solicitud("FACTURA", 5L)));
        verify(catalogoClient, never()).descontarPorLotes(anyString(), anyList());
    }

    @Test
    void comprobanteElectronicoNoHabilitadoSeRechazaAntesDeTocarInventario() {
        doThrow(new ResponseStatusException(HttpStatus.PRECONDITION_FAILED))
                .when(sunat).validarEmisionDisponible(eq(FARMACIA), eq("03"));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.crear(solicitud("BOLETA_ELECTRONICA", null)));

        assertEquals(HttpStatus.PRECONDITION_FAILED, error.getStatusCode());
        verify(catalogoClient, never()).descontarPorLotes(anyString(), anyList());
    }

    @Test
    void tipoDeComprobanteDesconocidoSeRechaza() {
        assertThrows(ResponseStatusException.class, () -> service.crear(solicitud("TICKET", null)));
    }

    private VentaDto solicitud(String tipo, Long clienteId) {
        return new VentaDto(null, null, clienteId, null,
                List.of(new DetalleVentaDto(null, 1L, 1, null, null, null, null, null)),
                "EFECTIVO", new BigDecimal("10.00"), null, false, null, null,
                "clave-" + tipo + "-" + clienteId, null, tipo, null, null, null, null, null);
    }
}
