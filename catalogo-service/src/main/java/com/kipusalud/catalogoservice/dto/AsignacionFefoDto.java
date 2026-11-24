package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;
import java.util.List;

/** Vista previa (sin descontar nada) de los lotes que usaría una venta según FEFO. */
public record AsignacionFefoDto(
        Long productoId,
        int cantidadSolicitada,
        boolean completa,
        int faltante,
        List<LoteAsignado> lotes
) {
    public record LoteAsignado(Long loteId, String codigoLote, LocalDate fechaVencimiento, int cantidad) {}
}
