package com.kipusalud.authservice.dto;

public record LoginResponse(String token, String username, String rol, Long farmaciaId, String farmaciaNombre) {
}
