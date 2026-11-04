package com.kipusalud.authservice.dto;

import java.util.Set;

public record CrearUsuarioRequest(
        String username,
        String password,
        String rol,
        Set<String> permisos
) {
}
