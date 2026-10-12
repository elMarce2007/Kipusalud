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
            Integer cantidad
    ) {}
}
