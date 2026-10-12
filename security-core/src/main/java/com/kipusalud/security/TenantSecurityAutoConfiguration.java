package com.kipusalud.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class TenantSecurityAutoConfiguration {

    @Bean
    FilterRegistrationBean<JwtTenantFilter> jwtTenantFilter(
            @Value("${jwt.secret}") String jwtSecret,
            ObjectMapper objectMapper
    ) {
        FilterRegistrationBean<JwtTenantFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new JwtTenantFilter(jwtSecret, objectMapper));
        registration.addUrlPatterns("/*");
        registration.setDispatcherTypes(DispatcherType.REQUEST);
        registration.setOrder(Integer.MIN_VALUE);
        return registration;
    }
}
