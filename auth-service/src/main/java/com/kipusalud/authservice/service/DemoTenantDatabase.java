package com.kipusalud.authservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class DemoTenantDatabase {

    private final String jdbcPrefix;
    private final String username;
    private final String password;

    public DemoTenantDatabase(
            @Value("${POSTGRES_HOST:localhost}") String host,
            @Value("${POSTGRES_PORT:5432}") int port,
            @Value("${POSTGRES_USER:postgres}") String username,
            @Value("${POSTGRES_PASSWORD:}") String password) {
        this.jdbcPrefix = "jdbc:postgresql://" + host + ":" + port + "/";
        this.username = username;
        this.password = password;
    }

    /**
     * Siembra una farmacia de demostración con datos ficticios y coherentes (ver {@link DemoDataset}):
     * catálogo con lotes, un mes de ventas, bajas, clientes y personal.
     */
    public void seed(long farmaciaId, DemoDataset.Usuarios usuarios) {
        DemoDataset datos = DemoDataset.generar(farmaciaId, LocalDateTime.now(), usuarios);
        List<Long> clientes = seedClients(farmaciaId, datos);
        List<Long> productos = seedCatalog(farmaciaId, datos);
        seedSales(farmaciaId, datos, productos, clientes);
        seedStaff(farmaciaId, datos);
    }

    public void purge(long farmaciaId) {
        purgeSales(farmaciaId);
        purgeCatalog(farmaciaId);
        purgeClients(farmaciaId);
        purgeStaff(farmaciaId);
        purgeAudit(farmaciaId);
    }

    private List<Long> seedClients(long farmaciaId, DemoDataset datos) {
        return inTransaction("clientes_db", connection -> {
            List<Long> ids = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO clientes (nombres, apellidos, dni, telefono, email, ruc, razon_social, "
                            + "direccion_fiscal, farmacia_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id")) {
                for (DemoDataset.Cliente c : datos.clientes) {
                    statement.setString(1, c.nombres());
                    statement.setString(2, c.apellidos());
                    statement.setString(3, c.dni());
                    statement.setString(4, c.telefono());
                    statement.setString(5, c.email());
                    statement.setString(6, c.ruc());
                    statement.setString(7, c.razonSocial());
                    statement.setString(8, c.direccionFiscal());
                    statement.setLong(9, farmaciaId);
                    ids.add(returningId(statement, "cliente"));
                }
            }
            return ids;
        });
    }

    private List<Long> seedCatalog(long farmaciaId, DemoDataset datos) {
        return inTransaction("catalogo_db", connection -> {
            List<Long> categorias = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO categorias (nombre, descripcion, codigo_atc, condicion_venta, farmacia_id) "
                            + "VALUES (?, ?, ?, ?, ?) RETURNING id")) {
                for (DemoDataset.Categoria c : datos.categorias) {
                    statement.setString(1, c.nombre());
                    statement.setString(2, c.descripcion());
                    statement.setString(3, c.codigoAtc());
                    statement.setString(4, c.condicionVenta());
                    statement.setLong(5, farmaciaId);
                    categorias.add(returningId(statement, "categoría"));
                }
            }

            List<Long> productos = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, farmacia_id, stock_minimo, "
                            + "afectacion_igv, precio_incluye_igv, principio_activo, laboratorio, presentacion, "
                            + "registro_sanitario, codigo_barras, ubicacion) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, '10', TRUE, ?, ?, ?, ?, ?, ?) RETURNING id")) {
                for (int i = 0; i < datos.productos.size(); i++) {
                    DemoDataset.Producto p = datos.productos.get(i);
                    statement.setString(1, p.nombre());
                    statement.setString(2, p.presentacion());
                    statement.setBigDecimal(3, p.precio());
                    statement.setInt(4, datos.stockDe(i));
                    statement.setLong(5, categorias.get(p.categoria()));
                    statement.setLong(6, farmaciaId);
                    statement.setInt(7, datos.stockMinimo.get(i));
                    statement.setString(8, p.principioActivo());
                    statement.setString(9, p.laboratorio());
                    statement.setString(10, p.presentacion());
                    statement.setString(11, p.registroSanitario());
                    statement.setString(12, p.codigoBarras());
                    statement.setString(13, p.ubicacion());
                    productos.add(returningId(statement, "producto"));
                }
            }

            List<Long> ingresos = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO kipusalud_inventory.ingresos_mercaderia "
                            + "(farmacia_id, clave_idempotencia, huella_solicitud, referencia_documento, creado_por, creado_en) "
                            + "VALUES (?, ?, ?, ?, ?, ?) RETURNING id")) {
                for (DemoDataset.Ingreso ingreso : datos.ingresos) {
                    statement.setLong(1, farmaciaId);
                    statement.setString(2, "demo-ingreso-" + UUID.randomUUID());
                    statement.setString(3, huella());
                    statement.setString(4, ingreso.referencia());
                    statement.setString(5, ingreso.actor());
                    statement.setObject(6, utc(ingreso.fecha()));
                    ingresos.add(returningId(statement, "ingreso"));
                }
            }

            List<Long> lotes = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO kipusalud_inventory.lotes (farmacia_id, producto_id, codigo_lote, fecha_vencimiento, "
                            + "cantidad_inicial, cantidad_disponible, verificado, creado_en, costo_unitario) "
                            + "VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?) RETURNING id")) {
                for (DemoDataset.Lote lote : datos.lotes) {
                    statement.setLong(1, farmaciaId);
                    statement.setLong(2, productos.get(lote.producto));
                    statement.setString(3, lote.codigo);
                    statement.setDate(4, Date.valueOf(lote.vence));
                    statement.setInt(5, lote.inicial);
                    statement.setInt(6, lote.disponible);
                    statement.setObject(7, utc(lote.creado));
                    statement.setBigDecimal(8, lote.costo);
                    lotes.add(returningId(statement, "lote"));
                }
            }

            try (PreparedStatement movimiento = connection.prepareStatement(
                    "INSERT INTO kipusalud_inventory.movimientos_inventario (farmacia_id, producto_id, lote_id, ingreso_id, "
                            + "salida_id, tipo, cantidad, clave_idempotencia, actor, creado_en, motivo, observacion) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                 PreparedStatement salida = connection.prepareStatement(
                         "INSERT INTO kipusalud_inventory.salidas_venta "
                                 + "(farmacia_id, clave_idempotencia, huella_solicitud, creado_por, creado_en) "
                                 + "VALUES (?, ?, ?, ?, ?) RETURNING id")) {
                for (int i = 0; i < datos.lotes.size(); i++) {
                    DemoDataset.Lote lote = datos.lotes.get(i);
                    agregarMovimiento(movimiento, farmaciaId, productos.get(lote.producto), lotes.get(i),
                            ingresos.get(lote.ingreso), null, "INGRESO", lote.inicial, "demo-ingreso-" + UUID.randomUUID(),
                            datos.ingresos.get(lote.ingreso).actor(), lote.creado, null, null);
                }
                for (DemoDataset.Venta venta : datos.ventas) {
                    String huella = huella();
                    salida.setLong(1, farmaciaId);
                    salida.setString(2, claveVenta(farmaciaId, venta));
                    salida.setString(3, huella);
                    salida.setString(4, venta.vendedor());
                    salida.setObject(5, utc(venta.fecha()));
                    long salidaId = returningId(salida, "salida");
                    int indice = 0;
                    for (DemoDataset.Linea linea : venta.lineas()) {
                        for (DemoDataset.Asignacion a : linea.lotes()) {
                            agregarMovimiento(movimiento, farmaciaId, productos.get(linea.producto()), lotes.get(a.lote()),
                                    null, salidaId, "VENTA", -a.cantidad(), "venta-" + huella.substring(0, 32) + "-" + indice++,
                                    venta.vendedor(), venta.fecha(), null, null);
                        }
                    }
                }
                for (DemoDataset.Ajuste ajuste : datos.ajustes) {
                    DemoDataset.Lote lote = datos.lotes.get(ajuste.lote());
                    agregarMovimiento(movimiento, farmaciaId, productos.get(lote.producto), lotes.get(ajuste.lote()),
                            null, null, "AJUSTE", -ajuste.cantidad(), "demo-ajuste-" + UUID.randomUUID(), ajuste.actor(),
                            ajuste.fecha(), ajuste.motivo(), ajuste.observacion());
                }
                movimiento.executeBatch();
            }
            return productos;
        });
    }

    private void seedSales(long farmaciaId, DemoDataset datos, List<Long> productos, List<Long> clientes) {
        inTransaction("ventas_db", connection -> {
            try (PreparedStatement venta = connection.prepareStatement(
                    "INSERT INTO ventas (fecha, cliente_id, total, farmacia_id, metodo_pago, monto_recibido, vuelto, "
                            + "confirmacion_manual_pago, pago_confirmado_por, pago_confirmado_en, clave_idempotencia, "
                            + "huella_solicitud, estado, tipo_comprobante, serie_comprobante, numero_comprobante, "
                            + "registrado_por, cliente_nombre, cliente_documento) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMADA', 'BOLETA_INTERNA', ?, ?, ?, ?, ?) "
                            + "RETURNING id");
                 PreparedStatement detalle = connection.prepareStatement(
                         "INSERT INTO detalle_ventas (producto_id, cantidad, precio_unitario, subtotal, nombre_producto, "
                                 + "afectacion_igv, precio_incluye_igv) VALUES (?, ?, ?, ?, ?, '10', TRUE) RETURNING id");
                 PreparedStatement union = connection.prepareStatement(
                         "INSERT INTO ventas_detalles (venta_id, detalles_id) VALUES (?, ?)")) {
                for (DemoDataset.Venta v : datos.ventas) {
                    boolean efectivo = "EFECTIVO".equals(v.metodoPago());
                    DemoDataset.Cliente cliente = v.cliente() == null ? null : datos.clientes.get(v.cliente());
                    venta.setObject(1, utc(v.fecha()));
                    venta.setObject(2, v.cliente() == null ? null : clientes.get(v.cliente()));
                    venta.setBigDecimal(3, v.total());
                    venta.setLong(4, farmaciaId);
                    venta.setString(5, v.metodoPago());
                    venta.setBigDecimal(6, v.recibido());
                    venta.setBigDecimal(7, v.vuelto());
                    venta.setBoolean(8, !efectivo);
                    venta.setString(9, efectivo ? null : v.vendedor());
                    venta.setObject(10, efectivo ? null : utc(v.fecha()));
                    venta.setString(11, claveVenta(farmaciaId, v));
                    venta.setString(12, huella());
                    venta.setString(13, DemoDataset.SERIE_INTERNA);
                    venta.setString(14, "%08d".formatted(v.numero()));
                    venta.setString(15, v.vendedor());
                    venta.setString(16, cliente == null ? null : cliente.nombres() + " " + cliente.apellidos());
                    venta.setString(17, cliente == null ? null : cliente.dni());
                    long ventaId = returningId(venta, "venta");
                    for (DemoDataset.Linea linea : v.lineas()) {
                        detalle.setLong(1, productos.get(linea.producto()));
                        detalle.setInt(2, linea.cantidad());
                        detalle.setBigDecimal(3, linea.precio());
                        detalle.setBigDecimal(4, linea.subtotal());
                        detalle.setString(5, datos.productos.get(linea.producto()).nombre());
                        long detalleId = returningId(detalle, "detalle de venta");
                        union.setLong(1, ventaId);
                        union.setLong(2, detalleId);
                        union.addBatch();
                    }
                }
                union.executeBatch();
            }
            try (PreparedStatement correlativo = connection.prepareStatement(
                    "INSERT INTO correlativos_comprobante (farmacia_id, serie, siguiente_numero) VALUES (?, ?, ?)")) {
                correlativo.setLong(1, farmaciaId);
                correlativo.setString(2, DemoDataset.SERIE_INTERNA);
                correlativo.setLong(3, datos.ventas.size() + 1L);
                correlativo.executeUpdate();
            }
            return null;
        });
    }

    private void seedStaff(long farmaciaId, DemoDataset datos) {
        inTransaction("personal_db", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO personal (nombres, apellidos, cargo, email, dni, colegiatura, telefono, turno, activo, "
                            + "farmacia_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)")) {
                for (DemoDataset.Colaborador c : datos.personal) {
                    statement.setString(1, c.nombres());
                    statement.setString(2, c.apellidos());
                    statement.setString(3, c.cargo());
                    statement.setString(4, c.email());
                    statement.setString(5, c.dni());
                    statement.setString(6, c.colegiatura());
                    statement.setString(7, c.telefono());
                    statement.setString(8, c.turno());
                    statement.setLong(9, farmaciaId);
                    statement.addBatch();
                }
                statement.executeBatch();
            }
            return null;
        });
    }

    private static void agregarMovimiento(PreparedStatement statement, long farmaciaId, long productoId, long loteId,
                                          Long ingresoId, Long salidaId, String tipo, int cantidad, String clave,
                                          String actor, LocalDateTime fecha, String motivo, String observacion)
            throws SQLException {
        statement.setLong(1, farmaciaId);
        statement.setLong(2, productoId);
        statement.setLong(3, loteId);
        statement.setObject(4, ingresoId);
        statement.setObject(5, salidaId);
        statement.setString(6, tipo);
        statement.setInt(7, cantidad);
        statement.setString(8, clave);
        statement.setString(9, actor);
        statement.setObject(10, utc(fecha));
        statement.setString(11, motivo);
        statement.setString(12, observacion);
        statement.addBatch();
    }

    /**
     * Los servicios guardan las marcas de tiempo en UTC ({@code hibernate.jdbc.time_zone=UTC}) y las
     * muestran en la zona de la operación (America/Lima). Los datos demo se generan en hora local,
     * así que se convierten igual antes de insertarlos.
     */
    static LocalDateTime utc(LocalDateTime local) {
        return local == null ? null
                : local.atZone(java.time.ZoneId.systemDefault()).withZoneSameInstant(java.time.ZoneOffset.UTC).toLocalDateTime();
    }

    /** La salida de inventario usa la misma clave que la venta, como en el flujo real. */
    private static String claveVenta(long farmaciaId, DemoDataset.Venta venta) {
        return "demo-venta-" + farmaciaId + "-" + venta.numero();
    }

    private static String huella() {
        return (UUID.randomUUID().toString() + UUID.randomUUID()).replace("-", "");
    }

    private static long returningId(PreparedStatement statement, String entidad) throws SQLException {
        try (ResultSet result = statement.executeQuery()) {
            if (!result.next()) throw new SQLException("No se pudo crear el registro demo: " + entidad);
            return result.getLong(1);
        }
    }

    private void purgeCatalog(long farmaciaId) {
        inTransaction("catalogo_db", connection -> {
            execute(connection, "DELETE FROM domain_outbox WHERE (payload::jsonb ->> 'farmaciaId') = CAST(? AS TEXT)", farmaciaId);
            execute(connection, "DELETE FROM kipusalud_inventory.movimientos_inventario WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM kipusalud_inventory.lotes WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM kipusalud_inventory.ingresos_mercaderia WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM kipusalud_inventory.salidas_venta WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM catalogo_importaciones_iniciales WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM productos WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM categorias WHERE farmacia_id = ?", farmaciaId);
            return null;
        });
    }

    private void purgeClients(long farmaciaId) {
        inTransaction("clientes_db", connection -> {
            execute(connection, "DELETE FROM auditoria_acceso_clinico WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM informacion_clinica_clientes WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM clientes WHERE farmacia_id = ?", farmaciaId);
            return null;
        });
    }

    private void purgeStaff(long farmaciaId) {
        inTransaction("personal_db", connection -> {
            execute(connection, "DELETE FROM personal WHERE farmacia_id = ?", farmaciaId);
            return null;
        });
    }

    private void purgeSales(long farmaciaId) {
        inTransaction("ventas_db", connection -> {
            List<Long> detailIds = new ArrayList<>();
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT vd.detalles_id FROM ventas_detalles vd "
                            + "JOIN ventas v ON v.id = vd.venta_id WHERE v.farmacia_id = ?")) {
                statement.setLong(1, farmaciaId);
                try (ResultSet result = statement.executeQuery()) {
                    while (result.next()) detailIds.add(result.getLong(1));
                }
            }
            execute(connection, "DELETE FROM domain_outbox WHERE (payload::jsonb ->> 'farmaciaId') = CAST(? AS TEXT)", farmaciaId);
            execute(connection, "DELETE FROM comprobantes_electronicos WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM ventas_detalles WHERE venta_id IN (SELECT id FROM ventas WHERE farmacia_id = ?)",
                    farmaciaId);
            if (!detailIds.isEmpty()) {
                String placeholders = String.join(",", java.util.Collections.nCopies(detailIds.size(), "?"));
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM detalle_ventas WHERE id IN (" + placeholders + ")")) {
                    for (int index = 0; index < detailIds.size(); index++) {
                        statement.setLong(index + 1, detailIds.get(index));
                    }
                    statement.executeUpdate();
                }
            }
            execute(connection, "DELETE FROM ventas WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM sunat_configuraciones WHERE farmacia_id = ?", farmaciaId);
            execute(connection, "DELETE FROM correlativos_comprobante WHERE farmacia_id = ?", farmaciaId);
            return null;
        });
    }

    private void purgeAudit(long farmaciaId) {
        inTransaction("auditoria_db", connection -> {
            execute(connection, "DELETE FROM domain_event_log WHERE farmacia_id = ?", farmaciaId);
            return null;
        });
    }

    private void execute(Connection connection, String sql, long farmaciaId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, farmaciaId);
            statement.executeUpdate();
        }
    }

    private <T> T inTransaction(String database, SqlWork<T> work) {
        try (Connection connection = dataSource(database).getConnection()) {
            connection.setAutoCommit(false);
            try {
                T result = work.run(connection);
                connection.commit();
                return result;
            } catch (SQLException | RuntimeException error) {
                connection.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar la base de datos de demostración " + database, error);
        }
    }

    private DataSource dataSource(String database) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(jdbcPrefix + database);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    @FunctionalInterface
    private interface SqlWork<T> {
        T run(Connection connection) throws SQLException;
    }
}
