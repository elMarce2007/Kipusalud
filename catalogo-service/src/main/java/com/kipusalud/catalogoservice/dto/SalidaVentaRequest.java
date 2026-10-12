package com.kipusalud.catalogoservice.dto;

import java.util.List;

public record SalidaVentaRequest(
        String claveIdempotencia,
        List<LineaSalidaVentaRequest> lineas
) {
    public record LineaSalidaVentaRequest(Long productoId, Integer cantidad) {}
}
