# Arquitectura técnica

## Estilo y tecnología

Aplicación full-stack en un repositorio: Angular SPA + backend Spring Boot
distribuido en servicios, Docker Compose y comunicación por REST, RabbitMQ y
SOAP. No se encontró un workflow de CI versionado.

- Backend: Java 17 (`pom.xml` y Dockerfiles), Maven reactor, Spring Boot 3.2.3,
  Spring Cloud 2023.0.0, PostgreSQL, JPA/Hibernate, Flyway, Eureka, Spring Cloud
  Gateway, RabbitMQ y JJWT 0.12.3.
- Frontend: Angular 21, Angular Material/CDK 21, RxJS 7.8, TypeScript 5.9,
  Vitest 4, Node 20 Alpine en Docker y Nginx.
- Facturación: Apache CXF/JAX-WS en personal; SUNAT SOAP 1.1, firma PKCS#12 y
  XML en ventas.
- Infraestructura: Compose; PostgreSQL 16 local, RabbitMQ, servicios Java y
  frontend. AWS inspeccionado: EC2 Ubuntu + Docker Compose y RDS for PostgreSQL 18
  en `us-east-2`.

Versiones exactas de dependencias viven en `pom.xml`, POM de los módulos,
`frontend/package.json` y `frontend/package-lock.json`. El lockfile define la
resolución npm instalada; no sustituirlo manualmente.

## Flujo de solicitudes

1. Angular usa `/api` en producción; Nginx del contenedor frontal hace proxy al
   gateway.
2. `api-gateway` enruta `/api/auth/**` a auth. Las rutas de negocio pasan por
   el filtro JWT del gateway.
3. `security-core` instala `JwtTenantFilter` en servicios servlet. Valida firma
   y expiración, obtiene `username`, `farmaciaId`, rol y permisos del token,
   instala `TenantContext` durante la petición y lo limpia al terminar.
4. Ventas llama a clientes y catálogo por REST interno y propaga el mismo bearer
   token para respetar el tenant.
5. Catálogo y ventas escriben outbox en sus transacciones; un poller publica
   mensajes en el exchange RabbitMQ `kipusalud.domain.events`. Auditoría,
   catálogo y ventas consumen colas independientes.

## Autenticación y permisos

El token firmado con `JWT_SECRET` lleva `sub`, `rol`, `farmaciaId`,
`permisos`, `iat` y `exp`. Rutas auth públicas de backend incluyen login,
registro y `POST /api/auth/demo/sessions`; no significa que el resto de rutas
auth sea anónimo. La API y `JwtTenantFilter` verifican token en rutas protegidas.

| Rol | Perfil |
|---|---|
| `ADMINISTRADOR` | Permisos completos, incluida administración de usuarios y farmacia |
| `GERENTE_SUPERVISOR` | Operación de módulos; puede delegar permisos específicos permitidos |
| `QF_REGENTE` | Operación, personal y datos clínicos/facturación según backend |
| `EMPLEADO` | Operación diaria; sin administración de usuarios ni gestión de personal |

Permisos concretos y excepciones se definen en
`security-core/src/main/java/com/kipusalud/security/RolePermissions.java` y
`JwtTenantFilter.java`. Frontend guards/interceptors son complementarios; el
control de acceso debe permanecer en servidor.

## Mensajería y procesos programados

| Emisor/consumidor | Mecanismo |
|---|---|
| `ventas-service` | Outbox poller cada 1 s por defecto; eventos `venta.confirmada` y relacionados |
| `catalogo-service` | Outbox poller cada 1 s; movimientos, umbral y alertas |
| `audit-service` | Consume `kipusalud.audit.domain-events` |
| `catalogo-service` | Consume `kipusalud.catalogo.inventory-alerts` |
| `ventas-service` | Consume `kipusalud.sales.notifications` |
| `catalogo-service` | Scheduler diario de alertas de vencimiento, por defecto 08:00 |
| `auth-service` | Limpia sesiones demo vencidas cada 5 min por defecto |

El contrato común está en `security-core/.../events/DomainEvent.java`. La
durabilidad del outbox y `processed_domain_events` es deliberada; no publiques
eventos solo en memoria.

## Integraciones externas y formatos adicionales

- SUNAT: enviar `sendBill`, consultar estado `getStatusAR`, descargar CDR; ver
  [la guía específica](sunat-electronic-invoicing.md).
- Servicio SOAP de personal: contrato
  `IPersonalWebService`, publicado por CXF bajo el path `/ws/personal`; consulta
  `personal-service` `CxfConfig` y `application*.yml` para WSDL.
- Reportes del personal se escriben en la carpeta local `reportes/` del
  contenedor. No es almacenamiento compartido o durable en Compose.
- Algunos servicios mantienen listeners TCP simples (`SocketNotificationServer`
  en ventas: 9090, catálogo: 9092, personal/clientes: ver código). No aparecen
  publicados en los puertos Compose; no son el gateway HTTP.

## Capas por módulo

Los módulos de negocio siguen principalmente:

```text
controller/ -> service/ -> repository/ -> entity/
                    DTOs: dto/
```

`api-gateway`, `config-server`, `discovery-server` y `security-core` son
infraestructura compartida. En Angular: `features/`, `layout/`, `services/`,
`models/`, `core/guards`, `core/interceptors` y `shared/`.

No generes entidades o nombres desde `database.sql` antiguo: los mapeos vigentes
son las clases `@Entity` y las migraciones activas.
