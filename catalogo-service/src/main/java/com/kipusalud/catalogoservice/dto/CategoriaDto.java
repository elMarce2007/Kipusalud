package com.kipusalud.catalogoservice.dto;

/**
 * Categoría o familia terapéutica. {@code condicionVenta}: VENTA_LIBRE, RECETA o
 * RECETA_RETENIDA (por defecto VENTA_LIBRE); {@code codigoAtc} es opcional.
 */
public record CategoriaDto(Long id, String nombre, String descripcion, String codigoAtc, String condicionVenta) {
}
