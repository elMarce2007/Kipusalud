package com.kipusalud.security;

import com.kipusalud.catalogoservice.dto.KardexValorizadoDto;
import com.kipusalud.catalogoservice.dto.ReporteMermasDto;
import com.kipusalud.catalogoservice.entity.IngresoMercaderia;
import com.kipusalud.catalogoservice.entity.LoteInventario;
import com.kipusalud.catalogoservice.entity.MovimientoInventario;
import com.kipusalud.catalogoservice.entity.Producto;
import com.kipusalud.catalogoservice.repository.IngresoMercaderiaRepository;
import com.kipusalud.catalogoservice.repository.LoteInventarioRepository;
import com.kipusalud.catalogoservice.repository.MovimientoInventarioRepository;
import com.kipusalud.catalogoservice.repository.ProductoRepository;
import com.kipusalud.catalogoservice.service.ReporteInventarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Kardex valorizado y reporte de mermas. */
class ReporteInventarioServiceTest {

    private static final Long FARMACIA = 3L;
    private static final LocalDate DESDE = LocalDate.of(2026, 11, 1);
    private static final LocalDate HASTA = LocalDate.of(2026, 11, 30);

    private ProductoRepository productos;
    private LoteInventarioRepository lotes;
    private MovimientoInventarioRepository movimientos;
    private IngresoMercaderiaRepository ingresos;
    private ReporteInventarioService service;

    @BeforeEach
    void setUp() {
        TenantContext.set(new TenantContext.Identity("qf", FARMACIA, "QF_REGENTE", Set.of()));
        productos = mock(ProductoRepository.class);
        lotes = mock(LoteInventarioRepository.class);
        movimientos = mock(MovimientoInventarioRepository.class);
        ingresos = mock(IngresoMercaderiaRepository.class);
        service = new ReporteInventarioService(productos, lotes, movimientos, ingresos);
        Producto p = new Producto();
        p.setId(9L);
        p.setFarmaciaId(FARMACIA);
        p.setNombre("Amoxicilina 500 mg");
        when(productos.findByIdAndFarmaciaId(9L, FARMACIA)).thenReturn(Optional.of(p));
        when(productos.findAllByFarmaciaIdOrderByNombreAsc(FARMACIA)).thenReturn(List.of(p));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void kardexArrastraElSaldoInicialYValorizaPorLote() {
        LoteInventario conCosto = lote(1L, "L-A", "0.25");
        LoteInventario sinCosto = lote(2L, "L-B", null);
        when(lotes.findAllByFarmaciaIdAndProductoIdOrderByFechaVencimientoAscCreadoEnAsc(FARMACIA, 9L))
                .thenReturn(List.of(conCosto, sinCosto));
        IngresoMercaderia ingreso = new IngresoMercaderia();
        ReflectionTestUtils.setField(ingreso, "id", 50L);
        ingreso.setReferenciaDocumento("FT 001-49210");
        when(ingresos.findAllByFarmaciaIdAndIdIn(eq(FARMACIA), anyCollection())).thenReturn(List.of(ingreso));
        when(movimientos.findAllByFarmaciaIdAndProductoIdAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(eq(FARMACIA), eq(9L), any()))
                .thenReturn(List.of(
                        mov(1L, "INGRESO", 1L, 100, LocalDateTime.of(2026, 10, 20, 9, 0), 50L),
                        mov(2L, "VENTA", 1L, -20, LocalDateTime.of(2026, 11, 3, 10, 0), null),
                        mov(3L, "INGRESO", 2L, 10, LocalDateTime.of(2026, 11, 5, 11, 0), 50L)));

        KardexValorizadoDto k = service.kardex(9L, DESDE, HASTA);

        assertEquals(100, k.saldoInicialUnidades());
        assertEquals(new BigDecimal("25.00"), k.saldoInicialValor());
        assertEquals(2, k.filas().size());
        assertEquals(20, k.totalSalidas());
        assertEquals(10, k.totalEntradas());
        assertEquals(90, k.saldoFinalUnidades());
        assertEquals(new BigDecimal("20.00"), k.saldoFinalValor());
        assertEquals(10, k.unidadesSinCosto());
        assertEquals("FT 001-49210", k.filas().get(1).referencia());
    }

    @Test
    void mermasCalculaLaTasaSobreLasSalidas() {
        LoteInventario lote = lote(1L, "L-A", "2.00");
        MovimientoInventario baja = mov(5L, "AJUSTE", 1L, -5, LocalDateTime.of(2026, 11, 8, 9, 0), null);
        baja.setMotivo("VENCIMIENTO");
        when(movimientos.findAllByFarmaciaIdAndTipoAndCreadoEnGreaterThanEqualAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
                eq(FARMACIA), eq("AJUSTE"), any(), any())).thenReturn(List.of(baja));
        when(movimientos.findAllByFarmaciaIdAndTipoAndCreadoEnGreaterThanEqualAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
                eq(FARMACIA), eq("VENTA"), any(), any()))
                .thenReturn(List.of(mov(6L, "VENTA", 1L, -95, LocalDateTime.of(2026, 11, 9, 9, 0), null)));
        when(lotes.findAllByFarmaciaIdAndIdIn(eq(FARMACIA), anyCollection())).thenReturn(List.of(lote));

        ReporteMermasDto r = service.mermas(DESDE, HASTA);

        assertEquals(5, r.unidadesMerma());
        assertEquals(new BigDecimal("10.00"), r.valorMerma());
        assertEquals(new BigDecimal("5.00"), r.tasaMerma());
        assertEquals("VENCIMIENTO", r.porMotivo().get(0).motivo());
        assertEquals("Amoxicilina 500 mg", r.filas().get(0).producto());
    }

    private LoteInventario lote(Long id, String codigo, String costo) {
        LoteInventario lote = new LoteInventario();
        ReflectionTestUtils.setField(lote, "id", id);
        lote.setFarmaciaId(FARMACIA);
        lote.setProductoId(9L);
        lote.setCodigoLote(codigo);
        lote.setFechaVencimiento(LocalDate.of(2027, 4, 30));
        lote.setCostoUnitario(costo == null ? null : new BigDecimal(costo));
        return lote;
    }

    private MovimientoInventario mov(Long id, String tipo, Long loteId, int cantidad, LocalDateTime fecha, Long ingresoId) {
        MovimientoInventario m = new MovimientoInventario();
        ReflectionTestUtils.setField(m, "id", id);
        m.setFarmaciaId(FARMACIA);
        m.setProductoId(9L);
        m.setLoteId(loteId);
        m.setTipo(tipo);
        m.setCantidad(cantidad);
        m.setCreadoEn(fecha);
        m.setActor("qf");
        m.setIngresoId(ingresoId);
        return m;
    }
}
