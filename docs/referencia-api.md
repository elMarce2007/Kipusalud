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

## Inventario — `catalogo-service`

Controlador: `catalogo-service/.../controller/InventarioController.java`.

| Método | Ruta | Acceso / resultado |
|---|---|---|
| GET | `/api/inventario/productos/{productoId}/lotes` | `INVENTARIO:VER` |
| POST | `/api/inventario/ingresos` | `INVENTARIO:GESTIONAR`; ingreso idempotente con lotes/vencimientos; `201` o `200` al repetir |
| POST | `/api/inventario/ventas/salida` | `INVENTARIO:GESTIONAR`; salida idempotente y descuento FEFO |
| GET | `/api/inventario/productos/{productoId}/kardex` | `INVENTARIO:VER` |
| GET | `/api/inventario/alertas?diasVencimiento=30` | `INVENTARIO:VER` |

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
| POST | `/api/ventas/{id}/reintentar` | `VENTAS:GESTIONAR`; reintenta solo venta `PENDIENTE_STOCK` |
| GET | `/api/ventas/facturacion/configuracion` | Solo administrador/QF; perfil fiscal sin secretos (`404` si no existe) |
| PUT | `/api/ventas/facturacion/configuracion` | Solo administrador/QF; perfil fiscal: RUC, razón social, dirección, ubigeo, series `F###` y `B###`, teléfono y correo. No recibe secretos |
| PUT | `/api/ventas/facturacion/configuracion/credenciales` | Solo administrador/QF; usuario/clave SOL y certificado PKCS#12, guardados cifrados (`412` sin perfil fiscal) |
| GET | `/api/ventas/facturacion/opciones` | `VENTAS:VER`; comprobantes habilitados para el punto de venta y datos públicos del emisor |
| POST | `/api/ventas/{id}/factura-electronica` | `VENTAS:GESTIONAR`; emite el comprobante electrónico pendiente de la venta (factura `01` o boleta `03`); `409` si la venta es de boleta interna |
| GET | `/api/ventas/{id}/factura-electronica` | `VENTAS:VER`; consulta comprobante |
| GET | `/api/ventas/{id}/factura-electronica/cdr` | `VENTAS:VER`; devuelve ZIP |
| POST | `/api/ventas/{id}/factura-electronica/consultar-sunat` | `VENTAS:GESTIONAR`; reconcilia estado remoto |

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
