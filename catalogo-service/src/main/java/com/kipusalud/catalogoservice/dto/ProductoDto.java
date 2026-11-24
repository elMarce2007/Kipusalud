package com.kipusalud.catalogoservice.dto;

import java.math.BigDecimal;

public record ProductoDto(
        Long id,
        String nombre,
        String descripcion,
        BigDecimal precio,
        Integer stock,
        Long categoriaId,
        String afectacionIgv,
        Boolean precioIncluyeIgv,
        Integer stockMinimo,
        /** Ficha del medicamento (todo opcional). */
        String principioActivo,
        String laboratorio,
        String presentacion,
        String registroSanitario,
        String codigoBarras,
        String ubicacion
) {
}
