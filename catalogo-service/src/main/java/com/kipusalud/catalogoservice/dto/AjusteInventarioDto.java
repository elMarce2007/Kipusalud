package com.kipusalud.catalogoservice.dto;

import java.time.LocalDateTime;

public record AjusteInventarioDto(
        Long movimientoId,
        Long productoId,
        Long loteId,
        String codigoLote,
        int cantidadRetirada,
        String motivo,
        String observacion,
        int stockProducto,
        int cantidadDisponibleLote,
        String actor,
        LocalDateTime creadoEn,
        boolean repetido
) {}
