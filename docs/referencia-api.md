# Referencia de API

La fuente definitiva son los controladores y DTOs de cada servicio. No hay
OpenAPI/Swagger versionado detectado. Los paths son los que registra Spring;
Compose envía `/api` desde Nginx al API Gateway. Todas las rutas de negocio
requieren bearer JWT salvo indicación contraria.

## Autenticación, farmacia y usuarios — `auth-service`

Controlador: `auth-service/.../controller/AuthController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| POST | `/api/auth/login` | Público; valida código de farmacia, username y contraseña; responde JWT |
| POST | `/api/auth/registro` | Público; crea farmacia y administrador; `201` |
| GET | `/api/auth/usuarios` | `USUARIOS:VER` |
| POST | `/api/auth/usuarios` | `USUARIOS:GESTIONAR`; `201` |
| PUT | `/api/auth/usuarios/{id}` | `USUARIOS:GESTIONAR` |
| GET | `/api/auth/farmacia` | `FARMACIA:VER` |
| PUT | `/api/auth/farmacia` | `FARMACIA:EDITAR` |
| POST | `/api/auth/usuarios/{id}/codigo-recuperacion` | `USUARIOS:GESTIONAR`; `201` con un código de 6 dígitos válido 15 min (se muestra una vez). No para el administrador ni la propia cuenta; el gerente solo para Empleado/Cajero; `409` si la cuenta está desactivada |
| POST | `/api/auth/recuperar-password` | Público; `{farmaciaCodigo, username, codigo, nuevaPassword}`; `204`. Código de un solo uso, guardado con hash, invalidado tras 5 intentos o al generar otro; cualquier fallo devuelve el mismo `400` |
| PUT | `/api/auth/mi-password` | Usuario autenticado; `{passwordActual, nuevaPassword}`; `204` |
| POST | `/api/auth/demo/sessions` | Público solo si `DEMO_SESSIONS_ENABLED=true`; entrega una vez credenciales aleatorias de cuatro roles |

## Clientes — `cliente-service`

Controlador: `cliente-service/.../controller/ClienteController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/clientes` | `CLIENTES:VER`; lista tenant actual |
| GET | `/api/clientes/{id}` | `CLIENTES:VER` |
| POST | `/api/clientes` | `CLIENTES:GESTIONAR`; `201` |
| PUT | `/api/clientes/{id}` | `CLIENTES:GESTIONAR` |
| DELETE | `/api/clientes/{id}` | `CLIENTES:GESTIONAR`; `204` |
| GET | `/api/clientes/{id}/informacion-clinica` | Solo administrador/QF además de JWT |
| PUT | `/api/clientes/{id}/informacion-clinica` | Solo administrador/QF; guarda información clínica y audita acceso |

## Categorías — `catalogo-service`

Controlador: `catalogo-service/.../controller/CategoriaController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/categorias` | `CATALOGO:VER` |
| GET | `/api/categorias/{id}` | `CATALOGO:VER` |
| POST | `/api/categorias` | `CATALOGO:GESTIONAR`; `201` |
| PUT | `/api/categorias/{id}` | `CATALOGO:GESTIONAR` |
| DELETE | `/api/categorias/{id}` | `CATALOGO:GESTIONAR`; `204` |

Cada categoría lleva `codigoAtc` (opcional, `[A-Z0-9-]` hasta 10, se guarda en
mayúsculas) y `condicionVenta` (`VENTA_LIBRE` por defecto, `RECETA`,
`RECETA_RETENIDA`); el punto de venta muestra la condición de cada producto.

## Productos — `catalogo-service`

Controlador: `catalogo-service/.../controller/ProductoController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/productos` | `CATALOGO:VER` |
| GET | `/api/productos/{id}` | `CATALOGO:VER` |
| POST | `/api/productos` | `CATALOGO:GESTIONAR`; `201` |
| POST | `/api/productos/alta` | `CATALOGO:GESTIONAR`; crea producto con ingreso inicial |
| PUT | `/api/productos/{id}` | `CATALOGO:GESTIONAR` |
| DELETE | `/api/productos/{id}` | `CATALOGO:GESTIONAR`; `204` |

Ficha opcional del producto: `principioActivo`, `laboratorio`, `presentacion`,
`registroSanitario`, `codigoBarras` y `ubicacion`. `PUT` reemplaza la ficha
completa (un campo ausente queda vacío). `codigoBarras` admite
`[0-9A-Za-z-]` hasta 20 caracteres y es único por farmacia (`409` si se repite).
En `POST /api/productos/alta`, `ingresoInicial.costoUnitario` es opcional.

## Inventario — `catalogo-service`

Controlador: `catalogo-service/.../controller/InventarioController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/inventario/productos/{productoId}/lotes` | `INVENTARIO:VER` |
| POST | `/api/inventario/ingresos` | `INVENTARIO:GESTIONAR`; ingreso idempotente con lotes/vencimientos; `201` o `200` al repetir |
| POST | `/api/inventario/ventas/salida` | `INVENTARIO:GESTIONAR`; salida idempotente y descuento FEFO |
| GET | `/api/inventario/productos/{productoId}/kardex` | `INVENTARIO:VER` |
| GET | `/api/inventario/alertas?diasVencimiento=30` | `INVENTARIO:VER` |
| GET | `/api/inventario/resumen?diasPorVencer=60` | `INVENTARIO:VER`; por producto: stock, mínimo, lote FEFO activo, lotes vigentes, lotes por vencer, unidades vencidas, `valorInventario` (costo × disponible de los lotes con costo) y `unidadesSinCosto` |
| GET | `/api/inventario/productos/{productoId}/fefo?cantidad=N` | `INVENTARIO:VER`; vista previa de los lotes que usaría una venta, sin descontar (`completa`, `faltante`) |
| GET | `/api/inventario/reportes/kardex?productoId=&desde=&hasta=` | `INVENTARIO:VER`; Kardex físico-valorizado: saldo inicial, movimientos con saldo y valor acumulado (costo del lote), saldo final, costo promedio y unidades sin costo. Fechas ISO; por defecto el mes en curso; máximo un año |
| GET | `/api/inventario/reportes/mermas?desde=&hasta=` | `INVENTARIO:VER`; bajas del período con valor, totales por motivo y tasa de merma (bajas ÷ (ventas + bajas)) |
| GET | `/api/inventario/ventas/{claveIdempotencia}/lotes` | `INVENTARIO:VER`; lotes de los que salió cada producto de una venta; `404` si no hay salida |
| POST | `/api/inventario/ajustes` | `INVENTARIO:GESTIONAR` y rol administrador o QF; baja idempotente de unidades de un lote (motivos `MERMA`, `VENCIMIENTO`, `DANIO`, `CONTEO`, `DEVOLUCION_PROVEEDOR`, `OTRO` con observación); `409` si dejaría stock negativo |

## Importación del catálogo inicial — `catalogo-service`

Solo administrador. Archivo multipart con campo `archivo`; admite CSV/XLSX,
hasta 5 MB y 500 filas. Encabezados requeridos: `nombre`, `categoria`,
`precio`, `stockMinimo`, `codigoLote`, `fechaVencimiento`, `cantidad`;
`descripcion` es opcional. Fórmulas XLSX se rechazan.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/administracion/catalogo-inicial/estado` | JWT y rol administrador |
| POST | `/api/administracion/catalogo-inicial` | Multipart CSV/XLSX; solo antes de crear productos |

## Ventas y SUNAT — `ventas-service`

Controlador: `ventas-service/.../controller/VentaController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/ventas` | `VENTAS:VER` |
| GET | `/api/ventas/{id}` | `VENTAS:VER` |
| POST | `/api/ventas` | `VENTAS:GESTIONAR`; requiere clave idempotente, detalles y `tipoComprobante` (`BOLETA_INTERNA` por defecto, `BOLETA_ELECTRONICA` o `FACTURA`). Cliente opcional en boletas, obligatorio con RUC en factura; boleta electrónica desde S/ 700 exige DNI. Al confirmar, la boleta interna recibe correlativo `I001-…` y los electrónicos se emiten en SUNAT automáticamente. `201` si confirmada, `202` si pendiente, `412` si el comprobante electrónico no está habilitado |
| GET | `/api/ventas/reportes/turnos?desde=&hasta=` | `VENTAS:VER`; ventas confirmadas por turno (mañana 07–15, tarde 15–23, noche 23–07), vendedor, método de pago y día; cuenta las no confirmadas |
| GET | `/api/ventas/clientes/resumen` | `VENTAS:VER`; por cliente: compras confirmadas, total comprado y fecha de la última compra |
| POST | `/api/ventas/{id}/reintentar` | `VENTAS:GESTIONAR`; reintenta solo venta `PENDIENTE_STOCK` |
| GET | `/api/ventas/facturacion/configuracion` | Solo administrador/QF; perfil fiscal sin secretos (`404` si no existe) |
| PUT | `/api/ventas/facturacion/configuracion` | Solo administrador/QF; perfil fiscal: RUC, razón social, dirección, ubigeo, series `F###` y `B###`, teléfono y correo. No recibe secretos |
| PUT | `/api/ventas/facturacion/configuracion/credenciales` | Solo administrador/QF; usuario/clave SOL y certificado PKCS#12, guardados cifrados (`412` sin perfil fiscal) |
| GET | `/api/ventas/facturacion/opciones` | `VENTAS:VER`; comprobantes habilitados para el punto de venta y datos públicos del emisor |
| POST | `/api/ventas/{id}/factura-electronica` | `VENTAS:GESTIONAR`; emite el comprobante electrónico pendiente de la venta (factura `01` o boleta `03`); `409` si la venta es de boleta interna |
| GET | `/api/ventas/{id}/factura-electronica` | `VENTAS:VER`; consulta comprobante |
| GET | `/api/ventas/{id}/factura-electronica/cdr` | `VENTAS:VER`; devuelve ZIP |
| POST | `/api/ventas/{id}/factura-electronica/consultar-sunat` | `VENTAS:GESTIONAR`; reconcilia estado remoto |

Cada venta guarda `registradoPor` (usuario que la registró) y una copia del cliente al
vender (`clienteNombre`, `clienteDocumento`), usadas en el historial y el comprobante.
Estados de venta incluyen `PENDIENTE_STOCK` y `CONFIRMADA`; los estados de
comprobante SUNAT y sus restricciones se explican en
[la guía SUNAT](sunat-electronic-invoicing.md).

## Personal y reportes — `personal-service`

Controladores: `PersonalController`, `ReporteController`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/personal` | `PERSONAL:VER` |
| GET | `/api/personal/{id}` | `PERSONAL:VER` |
| POST | `/api/personal` | `PERSONAL:GESTIONAR`; `201` |
| PUT | `/api/personal/{id}` | `PERSONAL:GESTIONAR` |
| DELETE | `/api/personal/{id}` | `PERSONAL:GESTIONAR`; `204` |
| GET | `/api/personal/reporte/csv` | Descarga/recrea CSV para tenant actual |
| GET | `/api/personal/reporte/listar` | Nombres de CSV del tenant |
| GET | `/api/personal/reporte/leer/{nombreArchivo}` | Lee archivo cuyo nombre está limitado al tenant |

`PersonalDto` incluye `dni` (8 dígitos, único por farmacia; `409` si se repite),
`colegiatura` (CQFP), `telefono`, `turno` (`MANANA`, `TARDE`, `NOCHE`,
`ROTATIVO` o vacío) y `activo` (verdadero si se omite). El CSV agrega esas
columnas y escapa comas, comillas y fórmulas. Las operaciones SOAP
`registrar`/`actualizar` conservan sus parámetros y no modifican estos campos.

## SOAP personal

`personal-service` publica el contrato JAX-WS `IPersonalWebService` con
operaciones `registrarPersonal`, `actualizarPersonal`, `eliminarPersonal`,
`listarPersonal`, `buscarPersonalPorId` y `buscarPersonalPorCargo`. Configuración
CXF: `personal-service/src/main/java/.../config/CxfConfig.java`; el path base
está en `application.yml` bajo `cxf.path`. Comprueba el WSDL de la instancia
antes de consumirlo.

## Códigos de error generales

- `400`: solicitud/validación inválida.
- `401`: token ausente/invalidado, credenciales incorrectas o contexto tenant.
- `403`: rol o permiso insuficiente.
- `404`: entidad o ruta no encontrada (demo desactivada también oculta la ruta).
- `409`: conflicto de negocio, stock insuficiente, duplicado/idempotencia distinta.
- `502/503`: dependencia interna o externa no disponible.

El formato concreto de error varía con Spring `ResponseStatusException` y
handlers del módulo; confirma los casos en ejecución/controlador si un cliente
depende del cuerpo exacto.
