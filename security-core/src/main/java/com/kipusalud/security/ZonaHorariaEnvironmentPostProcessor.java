package com.kipusalud.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.time.ZoneId;
import java.util.Map;
import java.util.TimeZone;

/**
 * Fija la zona horaria de la operación (Perú) en todos los servicios que usan security-core.
 *
 * Los contenedores corren en UTC; sin esto, {@code LocalDateTime.now()} y {@code LocalDate.now()}
 * devuelven la hora UTC y, desde las 19:00 de Perú, las ventas, los vencimientos FEFO y la
 * fecha de emisión enviada a SUNAT caen en el día siguiente.
 *
 * Los valores absolutos ({@code Instant}) se siguen guardando en UTC
 * ({@code hibernate.jdbc.time_zone=UTC}), para no desplazar los ya almacenados.
 *
 * Se puede cambiar con la propiedad {@code kipusalud.zona-horaria} o la variable
 * {@code KIPUSALUD_ZONA_HORARIA}.
 */
public class ZonaHorariaEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    public static final String PROPIEDAD = "kipusalud.zona-horaria";
    public static final String ZONA_POR_DEFECTO = "America/Lima";
    static final String HIBERNATE_JDBC_TIME_ZONE = "spring.jpa.properties.hibernate.jdbc.time_zone";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String zona = environment.getProperty(PROPIEDAD, ZONA_POR_DEFECTO);
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of(zona)));
        if (!environment.containsProperty(HIBERNATE_JDBC_TIME_ZONE)) {
            // addLast: cualquier configuración explícita del servicio tiene prioridad.
            environment.getPropertySources().addLast(new MapPropertySource("kipusalud-zona-horaria",
                    Map.of(HIBERNATE_JDBC_TIME_ZONE, "UTC")));
        }
    }

    @Override
    public int getOrder() {
        // Después de cargar application.yml y variables de entorno, antes de crear beans.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
