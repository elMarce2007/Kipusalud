package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record VentaDto(
        Long id,
        LocalDateTime fecha,
        Long clienteId,
        BigDecimal total,
        List<DetalleVentaDto> detalles,
        String metodoPago,
        BigDecimal montoRecibido,
        BigDecimal vuelto,
        Boolean confirmacionManualPago,
        String pagoConfirmadoPor,
        LocalDateTime pagoConfirmadoEn,
        String claveIdempotencia,
        String estado
) {
}
