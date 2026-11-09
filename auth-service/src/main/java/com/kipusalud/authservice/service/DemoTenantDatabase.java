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
import java.time.LocalDate;
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

    public void seed(long farmaciaId) {
        seedCatalog(farmaciaId);
        seedClients(farmaciaId);
        seedStaff(farmaciaId);
    }

    public void purge(long farmaciaId) {
        purgeSales(farmaciaId);
        purgeCatalog(farmaciaId);
        purgeClients(farmaciaId);
        purgeStaff(farmaciaId);
        purgeAudit(farmaciaId);
    }

    private void seedCatalog(long farmaciaId) {
        inTransaction("catalogo_db", connection -> {
            long analgesicos = insertCategory(connection, farmaciaId, "Analgésicos", "Productos para el dolor y la fiebre");
            long vitaminas = insertCategory(connection, farmaciaId, "Vitaminas", "Vitaminas y suplementos");
            insertProductWithBatch(connection, farmaciaId, analgesicos, "Paracetamol 500 mg x 20", "Producto de demostración", 8.50, 25);
            insertProductWithBatch(connection, farmaciaId, vitaminas, "Vitamina C 1000 mg x 30", "Producto de demostración", 15.00, 18);
            return null;
        });
    }

    private long insertCategory(Connection connection, long farmaciaId, String nombre, String descripcion)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO categorias (nombre, descripcion, farmacia_id) VALUES (?, ?, ?) RETURNING id")) {
            statement.setString(1, nombre);
            statement.setString(2, descripcion);
            statement.setLong(3, farmaciaId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("No se pudo crear una categoría demo");
                return result.getLong(1);
            }
        }
    }

    private void insertProductWithBatch(
            Connection connection, long farmaciaId, long categoriaId, String nombre,
            String descripcion, double precio, int cantidad) throws SQLException {
        long productoId;
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, farmacia_id, "
                        + "stock_minimo, afectacion_igv, precio_incluye_igv) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 3, '10', TRUE) RETURNING id")) {
            statement.setString(1, nombre);
            statement.setString(2, descripcion);
            statement.setBigDecimal(3, java.math.BigDecimal.valueOf(precio));
            statement.setInt(4, cantidad);
            statement.setLong(5, categoriaId);
            statement.setLong(6, farmaciaId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("No se pudo crear un producto demo");
                productoId = result.getLong(1);
            }
        }

        String idempotencyKey = "demo-opening-" + UUID.randomUUID();
        String fingerprint = UUID.randomUUID().toString().replace("-", "");
        fingerprint += fingerprint;
        LocalDateTime created = LocalDateTime.now();
        long ingresoId;
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO kipusalud_inventory.ingresos_mercaderia "
                        + "(farmacia_id, clave_idempotencia, huella_solicitud, referencia_documento, creado_por, creado_en) "
                        + "VALUES (?, ?, ?, ?, ?, ?) RETURNING id")) {
            statement.setLong(1, farmaciaId);
            statement.setString(2, idempotencyKey);
            statement.setString(3, fingerprint);
            statement.setString(4, "LOTE DEMO");
            statement.setString(5, "demo");
            statement.setObject(6, created);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("No se pudo crear el ingreso demo");
                ingresoId = result.getLong(1);
            }
        }

        long loteId;
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO kipusalud_inventory.lotes "
                        + "(farmacia_id, producto_id, codigo_lote, fecha_vencimiento, cantidad_inicial, "
                        + "cantidad_disponible, verificado, creado_en) "
                        + "VALUES (?, ?, ?, ?, ?, ?, TRUE, ?) RETURNING id")) {
            statement.setLong(1, farmaciaId);
            statement.setLong(2, productoId);
            statement.setString(3, "DEMO-" + productoId);
            statement.setDate(4, Date.valueOf(LocalDate.now().plusYears(2)));
            statement.setInt(5, cantidad);
            statement.setInt(6, cantidad);
            statement.setObject(7, created);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("No se pudo crear un lote demo");
                loteId = result.getLong(1);
            }
        }

        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO kipusalud_inventory.movimientos_inventario "
                        + "(farmacia_id, producto_id, lote_id, ingreso_id, tipo, cantidad, clave_idempotencia, actor, creado_en) "
                        + "VALUES (?, ?, ?, ?, 'INGRESO', ?, ?, 'demo', ?)")) {
            statement.setLong(1, farmaciaId);
            statement.setLong(2, productoId);
            statement.setLong(3, loteId);
            statement.setLong(4, ingresoId);
            statement.setInt(5, cantidad);
            statement.setString(6, idempotencyKey);
            statement.setObject(7, created);
            statement.executeUpdate();
        }
    }

    private void seedClients(long farmaciaId) {
        inTransaction("clientes_db", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO clientes (nombres, apellidos, dni, telefono, email, farmacia_id) "
                            + "VALUES (?, ?, ?, ?, ?, ?)")) {
                addClient(statement, farmaciaId, 1, "Ana", "Demo", "900000001");
                addClient(statement, farmaciaId, 2, "Luis", "Prueba", "900000002");
                statement.executeBatch();
            }
            return null;
        });
    }

    private void addClient(PreparedStatement statement, long farmaciaId, int index, String nombres,
                          String apellidos, String telefono) throws SQLException {
        statement.setString(1, nombres);
        statement.setString(2, apellidos);
        statement.setString(3, String.format("%08d", (farmaciaId % 1_000_000) * 100 + index));
        statement.setString(4, telefono);
        statement.setString(5, "demo" + index + "@example.invalid");
        statement.setLong(6, farmaciaId);
        statement.addBatch();
    }

    private void seedStaff(long farmaciaId) {
        inTransaction("personal_db", connection -> {
            try (PreparedStatement statement = connection.prepareStatement(
                    "INSERT INTO personal (nombres, apellidos, cargo, email, farmacia_id) VALUES (?, ?, ?, ?, ?)")) {
                statement.setString(1, "Patricia");
                statement.setString(2, "Demo");
                statement.setString(3, "Químico Farmacéutico");
                statement.setString(4, "qf@example.invalid");
                statement.setLong(5, farmaciaId);
                statement.addBatch();
                statement.setString(1, "Carlos");
                statement.setString(2, "Prueba");
                statement.setString(3, "Cajero");
                statement.setString(4, "cajero@example.invalid");
                statement.setLong(5, farmaciaId);
                statement.addBatch();
                statement.executeBatch();
            }
            return null;
        });
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
