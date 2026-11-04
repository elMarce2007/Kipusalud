package com.kipusalud.authservice.dto;

import java.util.Set;

public record LoginResponse(
        String token,
        String username,
        String rol,
        Long farmaciaId,
        String farmaciaNombre,
        String farmaciaCodigo,
        Set<String> permisos
) {
}
