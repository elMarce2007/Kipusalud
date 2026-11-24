package com.kipusalud.catalogoservice.dto;

/**
 * Baja de unidades de un lote (merma, vencimiento, daño, diferencia de conteo o devolución
 * al proveedor). La cantidad es positiva y se descuenta; las altas entran como ingreso.
 */
public record AjusteInventarioRequest(
        String claveIdempotencia,
        Long loteId,
        Integer cantidad,
        String motivo,
        String observacion
) {}
