package com.kipusalud.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class JwtTenantFilterTest {

    private static final String JWT_SECRET = "test-jwt-secret-with-at-least-thirty-two-characters";

    @Test
    void allowsPublicDemoSessionCreationWithoutTenantToken() throws Exception {
        JwtTenantFilter filter = new JwtTenantFilter(JWT_SECRET, new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/demo/sessions");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        verify(chain).doFilter(request, response);
    }

    @Test
    void onlyAdministratorOrPharmacistCanSaveSunatCredentials() throws Exception {
        assertEquals(403, statusFor("EMPLEADO", "PUT", "/api/ventas/facturacion/configuracion/credenciales"));
        assertEquals(403, statusFor("GERENTE_SUPERVISOR", "PUT", "/api/ventas/facturacion/configuracion"));
        assertEquals(200, statusFor("ADMINISTRADOR", "PUT", "/api/ventas/facturacion/configuracion/credenciales"));
        assertEquals(200, statusFor("QF_REGENTE", "GET", "/api/ventas/facturacion/configuracion"));
    }

    @Test
    void anySalesUserCanReadReceiptOptions() throws Exception {
        assertEquals(200, statusFor("EMPLEADO", "GET", "/api/ventas/facturacion/opciones"));
    }

    private int statusFor(String role, String method, String path) throws Exception {
        JwtTenantFilter filter = new JwtTenantFilter(JWT_SECRET, new ObjectMapper());
        String token = Jwts.builder()
                .subject("usuario-prueba")
                .claim("farmaciaId", 1L)
                .claim("rol", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, mock(FilterChain.class));
        return response.getStatus();
    }

    @Test
    void stillRequiresTokenForOtherDemoSessionRequests() throws Exception {
        JwtTenantFilter filter = new JwtTenantFilter(JWT_SECRET, new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/demo/sessions");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        verifyNoInteractions(chain);
    }
}
