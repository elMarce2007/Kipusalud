package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;

/**
 * Línea de venta. Los campos de producto son una copia tomada al vender (para imprimir el
 * comprobante aunque el catálogo cambie después); en solicitudes de creación se ignoran.
 */
public record DetalleVentaDto(
        Long id,
        Long productoId,
        Integer cantidad,
        BigDecimal precioUnitario,
        BigDecimal subtotal,
        String nombreProducto,
        String afectacionIgv,
        Boolean precioIncluyeIgv
) {
}
