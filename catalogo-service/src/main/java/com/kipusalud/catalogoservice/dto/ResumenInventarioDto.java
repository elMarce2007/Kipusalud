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
        LoteFefo loteFefo
) {
    public record LoteFefo(Long loteId, String codigoLote, LocalDate fechaVencimiento, Integer cantidadDisponible) {}
}
