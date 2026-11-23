package com.kipusalud.ventasservice.dto;

/** Secretos para emitir en SUNAT; se guardan cifrados y nunca se devuelven. */
public record CredencialesSunatRequest(
        String usuarioSol,
        String claveSol,
        String certificadoPkcs12Base64,
        String claveCertificado
) {}
