package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;

public record DetalleVentaDto(
        Long id,
        Long productoId,
        Integer cantidad,
        BigDecimal precioUnitario,
        BigDecimal subtotal
) {
}
