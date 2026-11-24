package com.kipusalud.authservice.dto;

public record RecuperarPasswordRequest(String farmaciaCodigo, String username, String codigo, String nuevaPassword) {
}
