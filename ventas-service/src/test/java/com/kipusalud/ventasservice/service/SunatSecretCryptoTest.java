package com.kipusalud.ventasservice.service;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

class SunatSecretCryptoTest {

    private final SunatSecretCrypto crypto =
            new SunatSecretCrypto(Base64.getEncoder().encodeToString(new byte[32]));

    @Test
    void encryptsWithFreshIvAndDecryptsSecret() {
        byte[] secret = "sol-password".getBytes(java.nio.charset.StandardCharsets.UTF_8);

        byte[] first = crypto.encrypt(secret);
        byte[] second = crypto.encrypt(secret);

        assertFalse(java.util.Arrays.equals(first, second));
        assertArrayEquals(secret, crypto.decrypt(first));
    }

    @Test
    void rejectsModifiedCiphertext() {
        byte[] encrypted = crypto.encrypt("certificate".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        encrypted[encrypted.length - 1] ^= 1;

        assertThrows(IllegalStateException.class, () -> crypto.decrypt(encrypted));
    }
}
