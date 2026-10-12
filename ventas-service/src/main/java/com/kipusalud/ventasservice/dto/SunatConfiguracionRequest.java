package com.kipusalud.ventasservice.dto;

public record SunatConfiguracionRequest(
        String ruc,
        String razonSocial,
        String direccionFiscal,
        String ubigeo,
        String departamento,
        String provincia,
        String distrito,
        String serieFactura,
        String usuarioSol,
        String claveSol,
        String certificadoPkcs12Base64,
        String claveCertificado
) {}
