package com.kipusalud.clienteservice.dto;

public record ClienteDto(
        Long id,
        String nombres,
        String apellidos,
        String dni,
        String telefono,
        String email,
        String ruc,
        String razonSocial,
        String direccionFiscal
) {
}
