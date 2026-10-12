package com.kipusalud.catalogoservice.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SalidaVentaDto(
        String claveIdempotencia,
        boolean repetida,
        List<LineaSalidaDto> lineas
) {
    public record LineaSalidaDto(
            Long productoId,
            Long loteId,
            String codigoLote,
            Integer cantidad,
            LocalDateTime creadoEn
    ) {}
}
