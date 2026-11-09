package com.kipusalud.authservice.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Collection;
import java.time.Instant;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username, String rol, Long farmaciaId, Collection<String> permisos) {
        return generateToken(username, rol, farmaciaId, permisos,
                Instant.ofEpochMilli(System.currentTimeMillis() + expiration));
    }

    public String generateToken(
            String username, String rol, Long farmaciaId, Collection<String> permisos, Instant expiresAt) {
        return Jwts.builder()
                .subject(username)
                .claim("rol", rol)
                .claim("farmaciaId", farmaciaId)
                .claim("permisos", permisos)
                .issuedAt(new Date())
                .expiration(Date.from(expiresAt))
                .signWith(getKey())
                .compact();
    }

    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
