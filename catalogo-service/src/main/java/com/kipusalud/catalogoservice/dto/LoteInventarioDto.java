package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record LoteInventarioDto(
        Long id,
        Long productoId,
        String codigoLote,
        LocalDate fechaVencimiento,
        Integer cantidadInicial,
        Integer cantidadDisponible,
        boolean verificado,
        LocalDateTime creadoEn,
        java.math.BigDecimal costoUnitario
) {}
