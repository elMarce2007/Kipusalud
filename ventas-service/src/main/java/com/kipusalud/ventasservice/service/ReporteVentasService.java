package com.kipusalud.ventasservice.service;

import com.kipusalud.security.TenantContext;
import com.kipusalud.ventasservice.dto.ReporteVentasTurnoDto;
import com.kipusalud.ventasservice.entity.Venta;
import com.kipusalud.ventasservice.repository.VentaRepository;
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
import java.util.TreeMap;

/** Reporte de ventas por turno, vendedor, método de pago y día. */
@Service
public class ReporteVentasService {

    public static final List<String> TURNOS = List.of("MANANA", "TARDE", "NOCHE");
    static final int MAX_DIAS = 366;

    private final VentaRepository ventaRepository;

    public ReporteVentasService(VentaRepository ventaRepository) {
        this.ventaRepository = ventaRepository;
    }

    /** Mañana de 07:00 a 14:59, tarde de 15:00 a 22:59 y noche de 23:00 a 06:59. */
    public static String turnoDe(LocalDateTime fecha) {
        int hora = fecha.getHour();
        if (hora >= 7 && hora < 15) return "MANANA";
        if (hora >= 15 && hora < 23) return "TARDE";
        return "NOCHE";
    }

    @Transactional(readOnly = true)
    public ReporteVentasTurnoDto porTurno(LocalDate desde, LocalDate hasta) {
        Long farmaciaId = TenantContext.requireFarmaciaId();
        LocalDate fin = hasta == null ? LocalDate.now() : hasta;
        LocalDate inicio = desde == null ? fin.withDayOfMonth(1) : desde;
        if (inicio.isAfter(fin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha inicial es posterior a la final");
        }
        if (ChronoUnit.DAYS.between(inicio, fin) >= MAX_DIAS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El período no puede superar un año");
        }
        List<Venta> ventas = ventaRepository.findAllByFarmaciaIdAndFechaGreaterThanEqualAndFechaBeforeOrderByFechaAsc(
                farmaciaId, inicio.atStartOfDay(), fin.plusDays(1).atStartOfDay());

        Map<String, Acumulado> turnos = new LinkedHashMap<>();
        TURNOS.forEach(t -> turnos.put(t, new Acumulado()));
        Map<String, Acumulado> vendedores = new TreeMap<>();
        Map<String, Acumulado> metodos = new TreeMap<>();
        Map<LocalDate, Map<String, BigDecimal>> dias = new TreeMap<>();
        Acumulado total = new Acumulado();
        int noConfirmadas = 0;
        for (Venta v : ventas) {
            if (!"CONFIRMADA".equals(v.getEstado())) {
                noConfirmadas++;
                continue;
            }
            BigDecimal importe = v.getTotal() == null ? BigDecimal.ZERO : v.getTotal();
            String turno = turnoDe(v.getFecha());
            total.sumar(importe);
            turnos.get(turno).sumar(importe);
            vendedores.computeIfAbsent(v.getRegistradoPor() == null ? "Sin registrar" : v.getRegistradoPor(),
                    k -> new Acumulado()).sumar(importe);
            metodos.computeIfAbsent(v.getMetodoPago() == null ? "OTRO" : v.getMetodoPago(),
                    k -> new Acumulado()).sumar(importe);
            dias.computeIfAbsent(v.getFecha().toLocalDate(), k -> new LinkedHashMap<>())
                    .merge(turno, importe, BigDecimal::add);
        }
        List<ReporteVentasTurnoDto.Dia> porDia = new ArrayList<>();
        dias.forEach((fecha, importes) -> {
            BigDecimal m = importes.getOrDefault("MANANA", BigDecimal.ZERO);
            BigDecimal t = importes.getOrDefault("TARDE", BigDecimal.ZERO);
            BigDecimal n = importes.getOrDefault("NOCHE", BigDecimal.ZERO);
            porDia.add(new ReporteVentasTurnoDto.Dia(fecha, dinero(m), dinero(t), dinero(n), dinero(m.add(t).add(n))));
        });
        BigDecimal promedio = total.ventas == 0 ? BigDecimal.ZERO
                : total.importe.divide(BigDecimal.valueOf(total.ventas), 2, RoundingMode.HALF_UP);
        return new ReporteVentasTurnoDto(inicio, fin, total.ventas, dinero(total.importe), promedio, noConfirmadas,
                grupos(turnos, false), grupos(vendedores, true), grupos(metodos, true), porDia);
    }

    private static List<ReporteVentasTurnoDto.Grupo> grupos(Map<String, Acumulado> mapa, boolean ordenarPorTotal) {
        List<ReporteVentasTurnoDto.Grupo> lista = new ArrayList<>(mapa.entrySet().stream()
                .map(e -> new ReporteVentasTurnoDto.Grupo(e.getKey(), e.getValue().ventas, dinero(e.getValue().importe)))
                .toList());
        if (ordenarPorTotal) lista.sort((a, b) -> b.total().compareTo(a.total()));
        return lista;
    }

    private static BigDecimal dinero(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private static final class Acumulado {
        int ventas;
        BigDecimal importe = BigDecimal.ZERO;

        void sumar(BigDecimal valor) {
            ventas++;
            importe = importe.add(valor);
        }
    }
}
