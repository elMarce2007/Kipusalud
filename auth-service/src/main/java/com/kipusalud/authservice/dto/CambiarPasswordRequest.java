package com.kipusalud.authservice.dto;

public record CambiarPasswordRequest(String passwordActual, String nuevaPassword) {
}
