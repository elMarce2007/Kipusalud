package com.kipusalud.authservice.dto;

import java.util.Set;

public record ActualizarUsuarioRequest(String rol, boolean activo, Set<String> permisos) {
}
