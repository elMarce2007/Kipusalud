package com.kipusalud.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.catalogoservice.dto.AjusteInventarioDto;
import com.kipusalud.catalogoservice.dto.AjusteInventarioRequest;
import com.kipusalud.catalogoservice.dto.AsignacionFefoDto;
import com.kipusalud.catalogoservice.dto.ResumenInventarioDto;
import com.kipusalud.catalogoservice.entity.LoteInventario;
import com.kipusalud.catalogoservice.entity.MovimientoInventario;
import com.kipusalud.catalogoservice.entity.Producto;
import com.kipusalud.catalogoservice.repository.IngresoMercaderiaRepository;
import com.kipusalud.catalogoservice.repository.LoteInventarioRepository;
import com.kipusalud.catalogoservice.repository.MovimientoInventarioRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.catalogoservice.repository.SalidaInventarioRepository;
import com.kipusalud.catalogoservice.service.DomainEventOutbox;
import com.kipusalud.catalogoservice.service.InventarioServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Resumen, vista previa FEFO y ajustes de stock por lote. */
class InventarioLotesServiceTest {

    private static final Long FARMACIA = 12L;
    private static final LocalDate HOY = LocalDate.now();

    private ProductoRepository productos;
    private LoteInventarioRepository lotes;
    private MovimientoInventarioRepository movimientos;
    private InventarioServiceImpl service;

    @BeforeEach
    void setUp() {
        usarRol("QF_REGENTE");
        productos = mock(ProductoRepository.class);
        lotes = mock(LoteInventarioRepository.class);
        movimientos = mock(MovimientoInventarioRepository.class);
        service = new InventarioServiceImpl(productos, lotes, mock(IngresoMercaderiaRepository.class), movimientos,
                mock(SalidaInventarioRepository.class), new ObjectMapper(), mock(DomainEventOutbox.class));
        when(movimientos.save(any(MovimientoInventario.class))).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void resumenMuestraElLoteFefoYCuentaVencidosYPorVencer() {
        Producto producto = producto(30, 10);
        when(productos.findAllByFarmaciaIdOrderByNombreAsc(FARMACIA)).thenReturn(List.of(producto));
        when(lotes.findAllByFarmaciaIdAndCantidadDisponibleGreaterThan(FARMACIA, 0)).thenReturn(List.of(
                lote(1L, "L-LEJANO", HOY.plusDays(300), 10),
                lote(2L, "L-PRONTO", HOY.plusDays(20), 15),
                lote(3L, "L-VENCIDO", HOY.minusDays(1), 5)));

        ResumenInventarioDto resumen = service.resumen(60).get(0);

        assertEquals("L-PRONTO", resumen.loteFefo().codigoLote());
        assertEquals(2, resumen.lotesVigentes());
        assertEquals(1, resumen.lotesPorVencer());
        assertEquals(5, resumen.unidadesVencidas());
    }

    @Test
    void resumenValorizaSoloLosLotesConCosto() {
        when(productos.findAllByFarmaciaIdOrderByNombreAsc(FARMACIA)).thenReturn(List.of(producto(30, 10)));
        LoteInventario conCosto = lote(1L, "L-COSTO", HOY.plusDays(300), 10);
        conCosto.setCostoUnitario(new java.math.BigDecimal("1.255"));
        when(lotes.findAllByFarmaciaIdAndCantidadDisponibleGreaterThan(FARMACIA, 0)).thenReturn(List.of(
                conCosto, lote(2L, "L-SIN", HOY.plusDays(100), 4)));

        ResumenInventarioDto resumen = service.resumen(60).get(0);

        assertEquals(new java.math.BigDecimal("12.55"), resumen.valorInventario());
        assertEquals(4, resumen.unidadesSinCosto());
    }

    @Test
    void vistaPreviaFefoReparteEntreLotesSinDescontarNada() {
        when(productos.existsByIdAndFarmaciaId(7L, FARMACIA)).thenReturn(true);
        when(lotes.findSellableLots(eq(FARMACIA), eq(7L), any())).thenReturn(List.of(
                lote(2L, "L-A", HOY.plusDays(10), 3), lote(4L, "L-B", HOY.plusDays(90), 10)));

        AsignacionFefoDto completa = service.simularFefo(7L, 5);
        AsignacionFefoDto incompleta = service.simularFefo(7L, 20);

        assertTrue(completa.completa());
        assertEquals(List.of("L-A", "L-B"), completa.lotes().stream().map(AsignacionFefoDto.LoteAsignado::codigoLote).toList());
        assertEquals(List.of(3, 2), completa.lotes().stream().map(AsignacionFefoDto.LoteAsignado::cantidad).toList());
        assertFalse(incompleta.completa());
        assertEquals(7, incompleta.faltante());
        verify(lotes, never()).save(any());
    }

    @Test
    void ajusteDescuentaDelLoteYDelProducto() {
        Producto producto = producto(15, 0);
        LoteInventario lote = lote(2L, "L-A", HOY.plusDays(10), 15);
        prepararLote(producto, lote);

        AjusteInventarioDto ajuste = service.registrarAjuste(
                new AjusteInventarioRequest("k1", 2L, 4, "merma", "Frasco roto"));

        assertEquals(11, ajuste.cantidadDisponibleLote());
        assertEquals(11, ajuste.stockProducto());
        assertEquals("MERMA", ajuste.motivo());
        assertEquals(11, producto.getStock());
    }

    @Test
    void ajusteNoPuedeDejarStockNegativo() {
        Producto producto = producto(3, 0);
        prepararLote(producto, lote(2L, "L-A", HOY.plusDays(10), 3));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                service.registrarAjuste(new AjusteInventarioRequest("k2", 2L, 4, "CONTEO", null)));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals(3, producto.getStock());
    }

    @Test
    void soloAdministradorOQuimicoPuedenAjustar() {
        usarRol("EMPLEADO");

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
                service.registrarAjuste(new AjusteInventarioRequest("k3", 2L, 1, "MERMA", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }

    @Test
    void motivoOtroExigeObservacion() {
        assertThrows(ResponseStatusException.class, () ->
                service.registrarAjuste(new AjusteInventarioRequest("k4", 2L, 1, "OTRO", " ")));
        assertThrows(ResponseStatusException.class, () ->
                service.registrarAjuste(new AjusteInventarioRequest("k5", 2L, 1, "ROBO_INVENTADO", null)));
    }

    private void prepararLote(Producto producto, LoteInventario lote) {
        when(movimientos.findByFarmaciaIdAndClaveIdempotencia(eq(FARMACIA), anyString())).thenReturn(Optional.empty());
        when(lotes.findById(lote.getId())).thenReturn(Optional.of(lote));
        when(lotes.findByIdAndFarmaciaIdForUpdate(lote.getId(), FARMACIA)).thenReturn(Optional.of(lote));
        when(productos.findByIdAndFarmaciaIdForUpdate(producto.getId(), FARMACIA)).thenReturn(Optional.of(producto));
    }

    private void usarRol(String rol) {
        TenantContext.set(new TenantContext.Identity("usuario", FARMACIA, rol, Set.of()));
    }

    private Producto producto(int stock, int minimo) {
        Producto producto = new Producto();
        producto.setId(7L);
        producto.setFarmaciaId(FARMACIA);
        producto.setNombre("Paracetamol");
        producto.setStock(stock);
        producto.setStockMinimo(minimo);
        return producto;
    }

    private LoteInventario lote(Long id, String codigo, LocalDate vence, int disponible) {
        LoteInventario lote = new LoteInventario();
        ReflectionTestUtils.setField(lote, "id", id);
        lote.setFarmaciaId(FARMACIA);
        lote.setProductoId(7L);
        lote.setCodigoLote(codigo);
        lote.setFechaVencimiento(vence);
        lote.setCantidadInicial(disponible);
        lote.setCantidadDisponible(disponible);
        lote.setVerificado(true);
        lote.setCreadoEn(LocalDateTime.of(2026, 1, 1, 0, 0).plusDays(id));
        return lote;
    }
}
