package com.kipusalud.catalogoservice.dto;

import java.time.LocalDateTime;

public record MovimientoInventarioDto(
        Long id,
        Long productoId,
        Long loteId,
        String tipo,
        Integer cantidad,
        String claveIdempotencia,
        String actor,
        LocalDateTime creadoEn,
        String codigoLote,
        java.time.LocalDate fechaVencimiento,
        String motivo,
        String observacion
) {}
