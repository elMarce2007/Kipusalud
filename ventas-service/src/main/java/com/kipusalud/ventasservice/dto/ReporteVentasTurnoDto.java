package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Ventas confirmadas de un período agrupadas por turno (Mañana 07–15, Tarde 15–23,
 * Noche 23–07), vendedor, método de pago y día. Las anuladas o pendientes solo se cuentan.
 */
public record ReporteVentasTurnoDto(
        LocalDate desde,
        LocalDate hasta,
        int ventas,
        BigDecimal total,
        BigDecimal ticketPromedio,
        int noConfirmadas,
        List<Grupo> porTurno,
        List<Grupo> porVendedor,
        List<Grupo> porMetodoPago,
        List<Dia> porDia
) {
    public record Grupo(String clave, int ventas, BigDecimal total) {}

    public record Dia(LocalDate fecha, BigDecimal manana, BigDecimal tarde, BigDecimal noche, BigDecimal total) {}
}
