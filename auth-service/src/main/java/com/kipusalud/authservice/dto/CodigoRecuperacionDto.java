package com.kipusalud.authservice.dto;

import java.time.Instant;

/** Código entregado una sola vez al administrador para que lo comunique en persona. */
public record CodigoRecuperacionDto(String username, String codigo, Instant expiraEn) {
}
