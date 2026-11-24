# Modelo de datos y propiedad de esquemas

## Topología de persistencia

Los nombres lógicos de DB no cambian según el servicio. En Compose local hay un
contenedor PostgreSQL 16 y seis bases: `auth_db`, `clientes_db`, `catalogo_db`,
`ventas_db`, `personal_db` y `auditoria_db`. El script
`database/init/01-create-databases.sh` crea las bases vacías; Flyway de cada
servicio crea/actualiza su propio esquema.

La instancia AWS inspeccionada conecta servicios a una instancia RDS for PostgreSQL 18, usando
`POSTGRES_HOST`/`POSTGRES_PORT` externos, pero conserva esas seis bases lógicas.
La configuración efectiva del servidor no está versionada en este repositorio.
No añadas credenciales ni dumps a este documento.

## Tablas por base propietaria

| Base | Tablas de negocio e infraestructura |
|---|---|
| `auth_db` | `usuarios`, `farmacias`, `usuario_permisos`, `demo_sessions` |
| `clientes_db` | `clientes`, `informacion_clinica_clientes`, `auditoria_acceso_clinico` |
| `catalogo_db` | `categorias`, `productos`, `catalogo_importaciones_iniciales`, `domain_outbox`, `processed_domain_events` |
| `catalogo_db`, schema `kipusalud_inventory` | `ingresos_mercaderia`, `lotes`, `movimientos_inventario`, `salidas_venta` |
| `ventas_db` | `ventas`, `detalle_ventas`, `ventas_detalles`, `sunat_configuraciones`, `comprobantes_electronicos`, `correlativos_comprobante`, `domain_outbox`, `processed_domain_events` |
| `personal_db` | `personal` |
| `auditoria_db` | `domain_event_log` |

## Entidades y campos actuales

Los campos listados corresponden a entidades JPA inspeccionadas; restricciones
exactas, índices, defaults y tipos SQL se definen en las migraciones.

### Identidad

- `Farmacia`: `id`, `nombre`, `codigo`, `creadaEn`.
- `Usuario`: `id`, `username`, `password` (hash), `rol`, `farmaciaId`, `activo`,
  permisos adicionales.
- `DemoSession`: `id` UUID, `farmaciaId`, `creadaEn`, `expiraEn`; apunta a una
  farmacia temporal y soporta vencimiento/limpieza.

### Clientes

- `Cliente`: `id`, `nombres`, `apellidos`, `dni`, `telefono`, `email`, `ruc`,
  `razonSocial`, `direccionFiscal`, `farmaciaId`.
- `InformacionClinicaCliente`: `id`, `farmaciaId`, `clienteId`, `diagnosticos`,
  `tratamientos`, `alergias`, `medicamentos`.
- `AuditoriaAccesoClinico`: `id`, `farmaciaId`, `clienteId`, `usuario`, `accion`,
  `creadoEn`.

### Catálogo e inventario

- `Categoria`: `id`, `nombre`, `descripcion`, `codigoAtc`, `condicionVenta`
  (`VENTA_LIBRE`, `RECETA`, `RECETA_RETENIDA`), `farmaciaId` (V9).
- `Producto`: `id`, `nombre`, `descripcion`, `precio`, `stock`, `stockMinimo`,
  `afectacionIgv`, `precioIncluyeIgv`, relación `categoria`, `farmaciaId` y
  ficha opcional (V9): `principioActivo`, `laboratorio`, `presentacion`,
  `registroSanitario`, `codigoBarras` (único por farmacia cuando existe) y
  `ubicacion`.
- `IngresoMercaderia`: `id`, farmacia, clave de idempotencia, huella de
  solicitud, documento de referencia, actor y fecha.
- `LoteInventario`: `id`, farmacia/producto, código, fecha de vencimiento,
  cantidades inicial/disponible, `costoUnitario` opcional (V9, para valorizar
  el inventario), verificación y fecha de creación.
- `MovimientoInventario`: `id`, farmacia/producto/lote/ingreso/salida, tipo
  (`INGRESO`, `VENTA`, `AJUSTE`), cantidad con signo, clave de idempotencia,
  actor, fecha y, en ajustes, motivo y observación.
- `SalidaInventario`: `id`, farmacia, clave/huella idempotente, actor/fecha.
- `CatalogoImportacionInicial`: farmacia y fecha de importación.

`productos.stock` es total agregado; las cantidades de `lotes` guardan
existencias detalladas y se actualizan junto con los movimientos.

### Ventas y facturación

- `Venta`: `id`, fecha, `clienteId` (opcional en boletas), total, método de pago,
  importe recibido, vuelto, confirmación manual y actor/fecha de pago, `farmaciaId`,
  clave y huella idempotentes, estado, líneas, `tipoComprobante`
  (`BOLETA_INTERNA`/`BOLETA_ELECTRONICA`/`FACTURA`), serie/número del comprobante,
  usuario que la registró y copia del nombre y documento del cliente al vender.
- `CorrelativoComprobante`: siguiente número por farmacia y serie de la boleta interna (`I001`).
- `DetalleVenta`: `id`, `productoId`, cantidad, precio unitario, subtotal,
  snapshot de nombre del producto y datos tributarios (`afectacionIgv`,
  `precioIncluyeIgv`).
- `ComprobanteElectronico`: `id`, farmacia/venta, serie/número, estado, nombre
  archivo, XML firmado, CDR ZIP, respuesta SUNAT y marcas de tiempo.
- `SunatConfiguracion`: perfil fiscal de la farmacia (RUC/razón social/dirección,
  UBIGEO, departamento/provincia/distrito, teléfono, correo), series y correlativos
  de factura (`F###`) y boleta electrónica (`B###`), y blobs cifrados de SOL y
  certificado (opcionales hasta registrarlos).

### Personal y auditoría

- `Personal`: `id`, nombres, apellidos, cargo, email, `farmaciaId` y (V3)
  `dni` (único por farmacia cuando existe), `colegiatura` (CQFP), `telefono`,
  `turno` (`MANANA`, `TARDE`, `NOCHE`, `ROTATIVO`) y `activo`.
- `DomainEventLog`: ID de evento, tipo, farmacia, agregado, fecha, actor y
  payload JSONB.
- `DomainOutboxEvent`: ID, routing key, payload, dedupe key, creación y fecha
  de publicación; existe de forma independiente en catálogo y ventas.
- `ProcessedDomainEvent`: ID de evento y fecha procesada; en catálogo y ventas.

## Relaciones y límites

- `usuarios.farmacia_id` → `farmacias.id`; permisos adicionales dependen de
  usuario con `ON DELETE CASCADE`.
- Producto referencia categoría dentro del servicio de catálogo. Los queries
  deben seguir filtrando ambos recursos por farmacia.
- Lote se asocia a producto por ID de dominio y farmacia; movimientos tienen
  FK a lotes/ingresos/salidas del ledger.
- Ventas se relacionan localmente con detalles y una tabla puente
  `ventas_detalles`. IDs de cliente/producto son contratos entre servicios, no
  FKs distribuidas entre bases distintas.
- Datos clínicos referencian cliente y se auditan por farmacia/usuario.
- Los datos SUNAT y clientes están aislados por `farmacia_id`; no supongas FKs
  cross-database.

## Migraciones

| Servicio | Versiones observadas |
|---|---|
| Auth | V1–V6 |
| Clientes | V1, V2, V5 |
| Catálogo | V1–V8 |
| Ventas | V1–V10 |
| Personal | V1–V2 |
| Auditoría | V1 |

El hueco de versión de clientes es intencional en el árbol actual. No renumeres
migraciones ya aplicadas ni asumas que todas las instancias están en la misma
versión: consulta `flyway_schema_history` en cada base antes de una operación.
Hibernate usa `ddl-auto: validate`.

`database.sql` en la raíz es un SQL heredado con seed/data y no representa el
modelo runtime multi-tenant actual. No se ejecuta en el arranque Compose.
