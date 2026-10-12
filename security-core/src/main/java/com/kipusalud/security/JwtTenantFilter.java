package com.kipusalud.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

final class JwtTenantFilter extends OncePerRequestFilter {

    private final SecretKey signingKey;
    private final ObjectMapper objectMapper;

    JwtTenantFilter(String secret, ObjectMapper objectMapper) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equals(request.getMethod())
                || path.startsWith("/actuator/")
                || (("POST".equals(request.getMethod()))
                    && ("/api/auth/login".equals(path) || "/api/auth/registro".equals(path)));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String authorization = request.getHeader("Authorization");
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                unauthorized(response);
                return;
            }

            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(authorization.substring(7))
                    .getPayload();
            String username = claims.getSubject();
            Object farmaciaClaim = claims.get("farmaciaId");
            Long farmaciaId = farmaciaClaim instanceof Number number ? number.longValue() : null;
            String role = claims.get("rol", String.class);
            if (username == null || farmaciaId == null || farmaciaId <= 0 || role == null) {
                unauthorized(response);
                return;
            }
            if (!SetOfRoles.ALLOWED.contains(role)) {
                unauthorized(response);
                return;
            }

            TenantContext.set(new TenantContext.Identity(username, farmaciaId, role));
            TenantContext.setAuthorization(authorization);
            if (requiresAdministrator(request) && !SetOfRoles.ADMIN_ROLES.contains(role)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                objectMapper.writeValue(response.getOutputStream(),
                        Map.of("error", "El rol no tiene permiso para esta operación"));
                return;
            }
            filterChain.doFilter(request, response);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            unauthorized(response);
        } finally {
            TenantContext.clear();
        }
    }

    private boolean requiresAdministrator(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/personal")
                || path.startsWith("/ws")
                || path.startsWith("/api/auth/usuarios")
                || path.matches("/api/ventas/facturacion/configuracion/?")
                || path.matches("/api/clientes/[^/]+/informacion-clinica/?");
    }

    private void unauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        objectMapper.writeValue(response.getOutputStream(),
                Map.of("error", "Token ausente, inválido o sin contexto de farmacia"));
    }

    private static final class SetOfRoles {
        private static final java.util.Set<String> ALLOWED =
                java.util.Set.of("ADMINISTRADOR", "QF_REGENTE", "EMPLEADO");
        private static final java.util.Set<String> ADMIN_ROLES =
                java.util.Set.of("ADMINISTRADOR", "QF_REGENTE");
    }
}
