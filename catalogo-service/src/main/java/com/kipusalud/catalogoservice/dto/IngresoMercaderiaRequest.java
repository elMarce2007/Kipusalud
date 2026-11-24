package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;
import java.util.List;

public record IngresoMercaderiaRequest(
        String claveIdempotencia,
        String referenciaDocumento,
        List<LineaIngresoRequest> lineas
) {
    public record LineaIngresoRequest(
            Long productoId,
            String codigoLote,
            LocalDate fechaVencimiento,
            Integer cantidad,
            /** Costo de compra por unidad (opcional), para valorizar el inventario. */
            java.math.BigDecimal costoUnitario
    ) {}
}
