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
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

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

            Set<String> permissions = permissionsFromClaims(claims.get("permisos"), role);
            TenantContext.set(new TenantContext.Identity(username, farmaciaId, role, permissions));
            TenantContext.setAuthorization(authorization);
            if (requiresAdministrator(request) && !"ADMINISTRADOR".equals(role)) {
                forbidden(response);
                return;
            }
            if (requiresAdministratorOrPharmacist(request)
                    && !SetOfRoles.ADMIN_OR_QF_ROLES.contains(role)) {
                forbidden(response);
                return;
            }
            String requiredPermission = requiredPermission(request);
            if (requiredPermission != null && !permissions.contains(requiredPermission)) {
                forbidden(response);
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
        return request.getRequestURI().startsWith("/api/administracion/");
    }

    private boolean requiresAdministratorOrPharmacist(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/ws")
                || path.matches("/api/ventas/facturacion/configuracion/?")
                || path.matches("/api/clientes/[^/]+/informacion-clinica/?");
    }

    private String requiredPermission(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if (path.startsWith("/api/auth/usuarios")) {
            return "GET".equals(method) ? RolePermissions.USUARIOS_VIEW : RolePermissions.USUARIOS_MANAGE;
        }
        if (path.startsWith("/api/auth/farmacia")) {
            return "GET".equals(method) ? RolePermissions.FARMACIA_VIEW : RolePermissions.FARMACIA_EDIT;
        }
        String module = null;
        if (path.startsWith("/api/clientes")) {
            module = "CLIENTES";
        } else if (path.startsWith("/api/categorias") || path.startsWith("/api/productos")) {
            module = "CATALOGO";
        } else if (path.startsWith("/api/inventario")) {
            module = "INVENTARIO";
        } else if (path.startsWith("/api/ventas")) {
            if (path.matches("/api/ventas/facturacion/configuracion/?")) {
                return null;
            }
            module = "VENTAS";
        } else if (path.startsWith("/api/personal")) {
            module = "PERSONAL";
        }
        if (module == null) {
            return null;
        }
        return module + (("GET".equals(method) || "HEAD".equals(method))
                ? ":VER" : ":GESTIONAR");
    }

    private Set<String> permissionsFromClaims(Object claim, String role) {
        if (!(claim instanceof Collection<?> values)) {
            return RolePermissions.effectivePermissions(role, Set.of());
        }
        Set<String> additional = new HashSet<>();
        for (Object value : values) {
            if (value instanceof String permission && RolePermissions.isKnown(permission)) {
                additional.add(permission);
            }
        }
        return RolePermissions.effectivePermissions(role, additional);
    }

    private void forbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        objectMapper.writeValue(response.getOutputStream(),
                Map.of("error", "El rol no tiene permiso para esta operación"));
    }

    private void unauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        objectMapper.writeValue(response.getOutputStream(),
                Map.of("error", "Token ausente, inválido o sin contexto de farmacia"));
    }

    private static final class SetOfRoles {
        private static final Set<String> ALLOWED =
                Set.of("ADMINISTRADOR", "GERENTE_SUPERVISOR", "QF_REGENTE", "EMPLEADO");
        private static final Set<String> ADMIN_OR_QF_ROLES =
                Set.of("ADMINISTRADOR", "QF_REGENTE");
    }
}
