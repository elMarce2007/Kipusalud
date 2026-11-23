package com.kipusalud.ventasservice.dto;

import java.math.BigDecimal;

/**
 * Lo que el punto de venta necesita para ofrecer los tipos de comprobante. Solo datos
 * públicos del emisor (los que se imprimen en el comprobante), nunca secretos.
 */
public record OpcionesComprobanteDto(
        boolean boletaElectronicaDisponible,
        boolean facturaDisponible,
        String motivoNoDisponible,
        BigDecimal montoMinimoBoletaConDocumento,
        Emisor emisor
) {
    public record Emisor(
            String ruc,
            String razonSocial,
            String direccionFiscal,
            String telefono,
            String email
    ) {}
}
