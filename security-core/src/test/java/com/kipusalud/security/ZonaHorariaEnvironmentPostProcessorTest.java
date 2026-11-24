package com.kipusalud.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.env.MockEnvironment;

import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ZonaHorariaEnvironmentPostProcessorTest {

    private TimeZone original;

    @BeforeEach
    void guardar() {
        original = TimeZone.getDefault();
    }

    @AfterEach
    void restaurar() {
        TimeZone.setDefault(original);
    }

    @Test
    void usaLaHoraDePeruYGuardaLosInstantesEnUtc() {
        MockEnvironment env = new MockEnvironment();

        new ZonaHorariaEnvironmentPostProcessor().postProcessEnvironment(env, null);

        assertEquals("America/Lima", TimeZone.getDefault().getID());
        assertEquals("UTC", env.getProperty(ZonaHorariaEnvironmentPostProcessor.HIBERNATE_JDBC_TIME_ZONE));
    }

    @Test
    void respetaLaConfiguracionExplicita() {
        MockEnvironment env = new MockEnvironment()
                .withProperty(ZonaHorariaEnvironmentPostProcessor.PROPIEDAD, "America/Bogota")
                .withProperty(ZonaHorariaEnvironmentPostProcessor.HIBERNATE_JDBC_TIME_ZONE, "America/Bogota");

        new ZonaHorariaEnvironmentPostProcessor().postProcessEnvironment(env, null);

        assertEquals("America/Bogota", TimeZone.getDefault().getID());
        assertEquals("America/Bogota", env.getProperty(ZonaHorariaEnvironmentPostProcessor.HIBERNATE_JDBC_TIME_ZONE));
    }

    @Test
    void springLoCargaAlArrancarCualquierServicio() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(ContextoVacio.class)
                .web(WebApplicationType.NONE).run()) {
            assertEquals("America/Lima", TimeZone.getDefault().getID());
            assertEquals("UTC", ctx.getEnvironment().getProperty(ZonaHorariaEnvironmentPostProcessor.HIBERNATE_JDBC_TIME_ZONE));
        }
    }

    @Configuration
    static class ContextoVacio {}
}
