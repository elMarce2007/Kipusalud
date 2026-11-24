package com.kipusalud.catalogoservice.dto;

import java.time.LocalDate;

public record AltaProductoRequest(
        ProductoDto producto,
        IngresoInicial ingresoInicial
) {
    public record IngresoInicial(
            String referenciaDocumento,
            String codigoLote,
            LocalDate fechaVencimiento,
            Integer cantidad,
            java.math.BigDecimal costoUnitario
    ) {}
}
