package com.kipusalud.authservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Siembra y limpia una farmacia demo contra un PostgreSQL real con las migraciones de
 * todos los servicios. Solo se ejecuta si se define {@code DEMO_PG_PORT} (y, opcionalmente,
 * {@code DEMO_PG_PASSWORD}); ver docs/operaciones.md.
 */
@EnabledIfEnvironmentVariable(named = "DEMO_PG_PORT", matches = "\\d+")
class DemoTenantDatabasePostgresTest {

    private static final long FARMACIA = 990_001L;
    private final String port = System.getenv("DEMO_PG_PORT");
    private final String password = System.getenv().getOrDefault("DEMO_PG_PASSWORD", "");

    @Test
    void siembraDatosCoherentesYLosLimpia() throws SQLException {
        DemoTenantDatabase db = new DemoTenantDatabase("localhost", Integer.parseInt(port), "postgres", password);
        db.purge(FARMACIA);
        long inicio = System.currentTimeMillis();
        db.seed(FARMACIA, new DemoDataset.Usuarios("demo_admin", "demo_gerente", "demo_qf", "demo_empleado"));
        System.out.println("Siembra demo en " + (System.currentTimeMillis() - inicio) + " ms");

        // El stock de cada producto es la suma de sus lotes y coincide con el Kardex.
        assertEquals(0, numero("catalogo_db", """
                SELECT count(*) FROM productos p
                WHERE p.farmacia_id = %1$d AND p.stock <> (
                  SELECT coalesce(sum(l.cantidad_disponible), 0) FROM kipusalud_inventory.lotes l WHERE l.producto_id = p.id)
                """.formatted(FARMACIA)));
        assertEquals(0, numero("catalogo_db", """
                SELECT count(*) FROM kipusalud_inventory.lotes l
                WHERE l.farmacia_id = %1$d AND l.cantidad_disponible <> (
                  SELECT sum(m.cantidad) FROM kipusalud_inventory.movimientos_inventario m WHERE m.lote_id = l.id)
                """.formatted(FARMACIA)));
        // Lo vendido en ventas_db coincide con las salidas de inventario.
        long vendidoVentas = numero("ventas_db", """
                SELECT coalesce(sum(d.cantidad), 0) FROM ventas v JOIN ventas_detalles vd ON vd.venta_id = v.id
                JOIN detalle_ventas d ON d.id = vd.detalles_id WHERE v.farmacia_id = %d""".formatted(FARMACIA));
        long vendidoInventario = numero("catalogo_db", """
                SELECT coalesce(-sum(cantidad), 0) FROM kipusalud_inventory.movimientos_inventario
                WHERE farmacia_id = %d AND tipo = 'VENTA'""".formatted(FARMACIA));
        assertEquals(vendidoVentas, vendidoInventario);
        long ventas = numero("ventas_db", "SELECT count(*) FROM ventas WHERE farmacia_id = " + FARMACIA);
        assertTrue(ventas > 100);
        assertEquals(ventas + 1, numero("ventas_db",
                "SELECT siguiente_numero FROM correlativos_comprobante WHERE farmacia_id = " + FARMACIA));
        assertEquals(ventas, numero("catalogo_db",
                "SELECT count(*) FROM kipusalud_inventory.salidas_venta WHERE farmacia_id = " + FARMACIA));
        assertEquals(6, numero("personal_db", "SELECT count(*) FROM personal WHERE farmacia_id = " + FARMACIA));

        if (System.getenv("DEMO_PG_CONSERVAR") != null) return;
        db.purge(FARMACIA);
        assertEquals(0, numero("catalogo_db", "SELECT count(*) FROM productos WHERE farmacia_id = " + FARMACIA));
        assertEquals(0, numero("ventas_db", "SELECT count(*) FROM ventas WHERE farmacia_id = " + FARMACIA)
                + numero("ventas_db", "SELECT count(*) FROM correlativos_comprobante WHERE farmacia_id = " + FARMACIA));
        assertEquals(0, numero("clientes_db", "SELECT count(*) FROM clientes WHERE farmacia_id = " + FARMACIA));
    }

    private long numero(String base, String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection("jdbc:postgresql://localhost:" + port + "/" + base,
                "postgres", password); Statement s = c.createStatement(); ResultSet r = s.executeQuery(sql)) {
            r.next();
            return r.getLong(1);
        }
    }
}
