package com.kipusalud.ventasservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class SunatSecretCrypto {

    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private final String masterKeyBase64;
    private final SecureRandom secureRandom = new SecureRandom();

    public SunatSecretCrypto(@Value("${sunat.master-key:}") String masterKeyBase64) {
        this.masterKeyBase64 = masterKeyBase64;
    }

    public byte[] encrypt(byte[] value) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(masterKey(), "AES"),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(value);
            return ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo cifrar la configuración de SUNAT", e);
        }
    }

    public byte[] decrypt(byte[] value) {
        try {
            if (value == null || value.length <= IV_LENGTH) {
                throw new IllegalArgumentException("El secreto cifrado está incompleto");
            }
            ByteBuffer buffer = ByteBuffer.wrap(value);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(masterKey(), "AES"),
                    new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return cipher.doFinal(encrypted);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo descifrar la configuración de SUNAT", e);
        }
    }

    private byte[] masterKey() {
        try {
            byte[] key = Base64.getDecoder().decode(masterKeyBase64);
            if (key.length != 32) {
                throw new IllegalStateException("SUNAT_MASTER_KEY debe ser Base64 de exactamente 32 bytes");
            }
            return key;
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("SUNAT_MASTER_KEY no contiene Base64 válido", e);
        }
    }
}
