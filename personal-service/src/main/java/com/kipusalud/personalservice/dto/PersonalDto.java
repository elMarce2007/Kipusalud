package com.kipusalud.personalservice.dto;

/**
 * Colaborador de la farmacia. {@code turno}: MANANA, TARDE, NOCHE o ROTATIVO;
 * {@code activo} es verdadero por defecto.
 */
public record PersonalDto(
        Long id,
        String nombres,
        String apellidos,
        String cargo,
        String email,
        String dni,
        String colegiatura,
        String telefono,
        String turno,
        Boolean activo
) {
}
