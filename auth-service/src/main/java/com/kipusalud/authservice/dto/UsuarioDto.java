package com.kipusalud.authservice.dto;

import java.util.Set;

public record UsuarioDto(Long id, String username, String rol, boolean activo, Set<String> permisos) {
}
