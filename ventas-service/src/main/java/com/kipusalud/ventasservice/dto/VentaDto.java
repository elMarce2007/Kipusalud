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
        String estado,
        /** BOLETA_INTERNA (por defecto), BOLETA_ELECTRONICA o FACTURA. */
        String tipoComprobante,
        String serieComprobante,
        String numeroComprobante,
        /** Usuario que registró la venta. */
        String registradoPor,
        /** Copia del cliente al vender (nombre o razón social, y documento). */
        String clienteNombre,
        String clienteDocumento
) {
}
