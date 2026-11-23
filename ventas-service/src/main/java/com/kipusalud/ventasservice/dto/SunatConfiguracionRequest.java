package com.kipusalud.ventasservice.dto;

/**
 * Perfil fiscal de la farmacia (emisor). No incluye secretos: las credenciales SOL y el
 * certificado se registran con {@link CredencialesSunatRequest}.
 */
public record SunatConfiguracionRequest(
        String ruc,
        String razonSocial,
        String direccionFiscal,
        String ubigeo,
        String departamento,
        String provincia,
        String distrito,
        String serieFactura,
        String serieBoleta,
        String telefono,
        String email
) {}
