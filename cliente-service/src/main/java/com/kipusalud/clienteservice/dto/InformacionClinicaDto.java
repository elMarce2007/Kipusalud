package com.kipusalud.clienteservice.dto;

public record InformacionClinicaDto(
        String diagnosticos,
        String tratamientos,
        String alergias,
        String medicamentos
) {
}
