package com.kipusalud.catalogoservice.service;

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
import com.kipusalud.security.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Reportes de inventario: Kardex valorizado por producto y mermas del período. */
@Service
public class ReporteInventarioService {

    static final int MAX_DIAS = 366;

    private final ProductoRepository productoRepository;
    private final LoteInventarioRepository loteRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final IngresoMercaderiaRepository ingresoRepository;

    public ReporteInventarioService(ProductoRepository productoRepository,
                                    LoteInventarioRepository loteRepository,
                                    MovimientoInventarioRepository movimientoRepository,
                                    IngresoMercaderiaRepository ingresoRepository) {
        this.productoRepository = productoRepository;
        this.loteRepository = loteRepository;
        this.movimientoRepository = movimientoRepository;
        this.ingresoRepository = ingresoRepository;
    }

    @Transactional(readOnly = true)
    public KardexValorizadoDto kardex(Long productoId, LocalDate desde, LocalDate hasta) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        LocalDate[] rango = rango(desde, hasta);
        Producto producto = productoId == null ? null
                : productoRepository.findByIdAndFarmaciaId(productoId, farmaciaId).orElse(null);
        if (producto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        LocalDateTime inicio = rango[0].atStartOfDay();
        LocalDateTime fin = rango[1].plusDays(1).atStartOfDay();
        List<MovimientoInventario> movimientos = movimientoRepository
                .findAllByFarmaciaIdAndProductoIdAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(farmaciaId, productoId, fin);
        Map<Long, LoteInventario> lotes = loteRepository
                .findAllByFarmaciaIdAndProductoIdOrderByFechaVencimientoAscCreadoEnAsc(farmaciaId, productoId)
                .stream().collect(Collectors.toMap(LoteInventario::getId, Function.identity()));
        Map<Long, IngresoMercaderia> ingresos = ingresos(farmaciaId, movimientos);

        int saldo = 0;
        BigDecimal valor = BigDecimal.ZERO;
        int saldoInicial = 0;
        BigDecimal valorInicial = BigDecimal.ZERO;
        int entradas = 0;
        int salidas = 0;
        int sinCosto = 0;
        List<KardexValorizadoDto.Fila> filas = new ArrayList<>();
        for (MovimientoInventario m : movimientos) {
            LoteInventario lote = m.getLoteId() == null ? null : lotes.get(m.getLoteId());
            BigDecimal costo = lote == null ? null : lote.getCostoUnitario();
            saldo += m.getCantidad();
            if (costo != null) {
                valor = valor.add(costo.multiply(BigDecimal.valueOf(m.getCantidad())));
            }
            if (m.getCreadoEn().isBefore(inicio)) {
                saldoInicial = saldo;
                valorInicial = valor;
                continue;
            }
            int cantidad = m.getCantidad();
            if (cantidad > 0) entradas += cantidad; else salidas -= cantidad;
            if (costo == null) sinCosto += Math.abs(cantidad);
            filas.add(new KardexValorizadoDto.Fila(m.getId(), m.getCreadoEn(), m.getTipo(), referencia(m, ingresos),
                    lote == null ? null : lote.getCodigoLote(), lote == null ? null : lote.getFechaVencimiento(),
                    Math.max(cantidad, 0), Math.max(-cantidad, 0), saldo, costo, dinero(valor), m.getActor()));
        }
        BigDecimal costoPromedio = saldo > 0 && valor.signum() > 0
                ? valor.divide(BigDecimal.valueOf(saldo), 4, RoundingMode.HALF_UP) : null;
        return new KardexValorizadoDto(producto.getId(), producto.getNombre(), producto.getPrincipioActivo(),
                producto.getPresentacion(), producto.getRegistroSanitario(), rango[0], rango[1],
                saldoInicial, dinero(valorInicial), entradas, salidas, saldo, dinero(valor), costoPromedio,
                sinCosto, filas);
    }

    @Transactional(readOnly = true)
    public ReporteMermasDto mermas(LocalDate desde, LocalDate hasta) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        LocalDate[] rango = rango(desde, hasta);
        LocalDateTime inicio = rango[0].atStartOfDay();
        LocalDateTime fin = rango[1].plusDays(1).atStartOfDay();
        List<MovimientoInventario> ajustes = movimientoRepository
                .findAllByFarmaciaIdAndTipoAndCreadoEnGreaterThanEqualAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
                        farmaciaId, "AJUSTE", inicio, fin);
        int vendidas = movimientoRepository
                .findAllByFarmaciaIdAndTipoAndCreadoEnGreaterThanEqualAndCreadoEnBeforeOrderByCreadoEnAscIdAsc(
                        farmaciaId, "VENTA", inicio, fin)
                .stream().mapToInt(m -> Math.abs(m.getCantidad())).sum();
        Map<Long, LoteInventario> lotes = ajustes.isEmpty() ? Map.of() : loteRepository
                .findAllByFarmaciaIdAndIdIn(farmaciaId, ajustes.stream().map(MovimientoInventario::getLoteId)
                        .filter(Objects::nonNull).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(LoteInventario::getId, Function.identity()));
        Map<Long, String> productos = ajustes.isEmpty() ? Map.of() : productoRepository
                .findAllByFarmaciaIdOrderByNombreAsc(farmaciaId).stream()
                .collect(Collectors.toMap(Producto::getId, Producto::getNombre));

        Map<String, int[]> unidadesPorMotivo = new LinkedHashMap<>();
        Map<String, BigDecimal> valorPorMotivo = new LinkedHashMap<>();
        List<ReporteMermasDto.Fila> filas = new ArrayList<>();
        int unidades = 0;
        BigDecimal total = BigDecimal.ZERO;
        for (MovimientoInventario m : ajustes) {
            LoteInventario lote = m.getLoteId() == null ? null : lotes.get(m.getLoteId());
            BigDecimal costo = lote == null ? null : lote.getCostoUnitario();
            int cantidad = Math.abs(m.getCantidad());
            BigDecimal valorFila = costo == null ? null : dinero(costo.multiply(BigDecimal.valueOf(cantidad)));
            String motivo = m.getMotivo() == null ? "OTRO" : m.getMotivo();
            unidades += cantidad;
            unidadesPorMotivo.computeIfAbsent(motivo, k -> new int[1])[0] += cantidad;
            valorPorMotivo.merge(motivo, valorFila == null ? BigDecimal.ZERO : valorFila, BigDecimal::add);
            if (valorFila != null) total = total.add(valorFila);
            filas.add(new ReporteMermasDto.Fila(m.getId(), m.getCreadoEn(), m.getProductoId(),
                    productos.getOrDefault(m.getProductoId(), "Producto #" + m.getProductoId()),
                    lote == null ? null : lote.getCodigoLote(), lote == null ? null : lote.getFechaVencimiento(),
                    motivo, m.getObservacion(), cantidad, costo, valorFila, m.getActor()));
        }
        List<ReporteMermasDto.PorMotivo> porMotivo = unidadesPorMotivo.entrySet().stream()
                .map(e -> new ReporteMermasDto.PorMotivo(e.getKey(), e.getValue()[0], valorPorMotivo.get(e.getKey())))
                .sorted((a, b) -> Integer.compare(b.unidades(), a.unidades()))
                .toList();
        BigDecimal tasa = unidades + vendidas == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(unidades * 100L).divide(BigDecimal.valueOf(unidades + vendidas), 2, RoundingMode.HALF_UP);
        return new ReporteMermasDto(rango[0], rango[1], unidades, dinero(total), vendidas, tasa, porMotivo, filas);
    }

    /** Por defecto, el mes en curso; el período no puede superar un año. */
    static LocalDate[] rango(LocalDate desde, LocalDate hasta) {
        LocalDate hoy = LocalDate.now();
        LocalDate fin = hasta == null ? hoy : hasta;
        LocalDate inicio = desde == null ? fin.withDayOfMonth(1) : desde;
        if (inicio.isAfter(fin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha inicial es posterior a la final");
        }
        if (ChronoUnit.DAYS.between(inicio, fin) >= MAX_DIAS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El período no puede superar un año");
        }
        return new LocalDate[]{inicio, fin};
    }

    private Map<Long, IngresoMercaderia> ingresos(Long farmaciaId, List<MovimientoInventario> movimientos) {
        var ids = movimientos.stream().map(MovimientoInventario::getIngresoId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return ids.isEmpty() ? Map.of() : ingresoRepository.findAllByFarmaciaIdAndIdIn(farmaciaId, ids).stream()
                .collect(Collectors.toMap(IngresoMercaderia::getId, Function.identity()));
    }

    private static String referencia(MovimientoInventario m, Map<Long, IngresoMercaderia> ingresos) {
        return switch (m.getTipo()) {
            case "INGRESO" -> {
                IngresoMercaderia ingreso = m.getIngresoId() == null ? null : ingresos.get(m.getIngresoId());
                yield ingreso != null && ingreso.getReferenciaDocumento() != null
                        ? ingreso.getReferenciaDocumento() : "Ingreso #" + m.getIngresoId();
            }
            case "VENTA" -> m.getSalidaId() == null ? "Venta" : "Salida #" + m.getSalidaId();
            case "AJUSTE" -> m.getMotivo() == null ? "Ajuste" : m.getMotivo();
            default -> m.getTipo();
        };
    }

    private static BigDecimal dinero(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}
