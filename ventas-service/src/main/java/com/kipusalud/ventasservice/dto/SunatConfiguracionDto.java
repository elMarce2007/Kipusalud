package com.kipusalud.ventasservice.dto;

public record SunatConfiguracionDto(
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
        String email,
        boolean credencialesConfiguradas
) {}
