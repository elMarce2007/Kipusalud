package com.kipusalud.authservice.dto;

import java.time.Instant;
import java.util.Map;

public record DemoSessionResponse(
        String farmaciaNombre,
        String farmaciaCodigo,
        Instant expiraEn,
        Map<String, DemoCredentialDto> credenciales
) {}
