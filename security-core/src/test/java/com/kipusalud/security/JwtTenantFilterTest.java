package com.kipusalud.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
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
