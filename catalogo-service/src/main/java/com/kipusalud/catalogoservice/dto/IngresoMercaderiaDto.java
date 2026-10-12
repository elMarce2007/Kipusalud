package com.kipusalud.catalogoservice.dto;

import java.time.LocalDateTime;

public record IngresoMercaderiaDto(
        Long id,
        String claveIdempotencia,
        String referenciaDocumento,
        String creadoPor,
        LocalDateTime creadoEn,
        boolean repetido
) {}
