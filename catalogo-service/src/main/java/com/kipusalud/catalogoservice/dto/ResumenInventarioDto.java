package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;

/**
 * Estado de inventario de un producto para tablas y paneles: stock, lote FEFO activo
 * (el próximo que saldrá en una venta) y cuántos lotes vencen pronto o ya vencieron.
 */
public record ResumenInventarioDto(
        Long productoId,
        Integer stock,
        Integer stockMinimo,
        int lotesVigentes,
        int unidadesVencidas,
        int lotesPorVencer,
        LoteFefo loteFefo,
        /** Suma de unidades disponibles por su costo de lote (solo lotes con costo). */
        java.math.BigDecimal valorInventario,
        /** Unidades disponibles en lotes sin costo registrado. */
        int unidadesSinCosto
) {
    public record LoteFefo(Long loteId, String codigoLote, LocalDate fechaVencimiento, Integer cantidadDisponible) {}
}
