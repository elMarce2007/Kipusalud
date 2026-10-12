package com.kipusalud.ventasservice.dto;

import java.time.LocalDateTime;

public record ComprobanteElectronicoDto(
        Long id,
        Long ventaId,
        String tipoComprobante,
        String serie,
        String numero,
        String estado,
        String codigoRespuesta,
        String descripcionRespuesta,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaRespuesta
) {}
