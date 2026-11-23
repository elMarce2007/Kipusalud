# Ejecución y operación

## Herramientas/versiones

- Maven reactor: `mvn test`, Java 17 en build/runtime Docker.
- Angular CLI/Node: frontend en `frontend/`, `npm ci`, `npm test`,
  `npm run build`.
- Docker y Docker Compose v2 en local/servidor.
- GitHub privado; la rama observada es `main`.

## Desarrollo local

1. Crea una copia local de `.env.example` llamada `.env`; añade secretos únicos.
   `.env` está ignorado por Git.
2. El Compose versionado usa PostgreSQL `psql` local y RabbitMQ:

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

3. Frontend de desarrollo, si se ejecuta separado:

   ```bash
   cd frontend
   npm ci
   npm start
   ```

   `environment.ts` apunta a `http://localhost:8080/api`. Nginx de producción
   usa `apiUrl: /api` y proxy same-origin.

4. Pruebas/build:

   ```bash
   # raíz
   mvn test
   mvn -pl auth-service -am test

   # frontend
   cd frontend
   npm test -- --watch=false
   npm run build
   ```

## Compose versionado y puertos

Compose local tiene 12 servicios: PostgreSQL, RabbitMQ, discovery/config,
gateway, seis servicios de negocio y frontend.

| Componente | Puerto | Exposición según Compose versionado |
|---|---:|---|
| Frontend Nginx | 80 | `80:80` al host |
| API Gateway | 8080 | enlazado a `127.0.0.1:8080` |
| PostgreSQL | 5432 | enlazado a `127.0.0.1:5433` |
| Eureka | 8761 | solo red interna |
| Config Server | 8888 | solo red interna |
| RabbitMQ | 5672/15672 | `expose`, no publicación host |
| Auth/clientes/catálogo/ventas/personal/audit | 8081–8086 | solo red interna |

La configuración real puede diferir en el servidor AWS. No uses `docker compose
down -v`; los volúmenes PostgreSQL y RabbitMQ contienen persistencia.

## Variables de entorno

`.env.example` es plantilla, no configuración productiva.

| Variable | Uso |
|---|---|
| `POSTGRES_HOST`, `POSTGRES_PORT` | Host/puerto de cada servicio PostgreSQL |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | Usuario/contraseña DB |
| `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | Broker AMQP |
| `JWT_SECRET`, `JWT_EXPIRATION` | Firma y duración máxima JWT |
| `CORS_ALLOWED_ORIGINS` | Orígenes web permitidos por gateway |
| `DEMO_SESSIONS_ENABLED`, `DEMO_SESSION_TTL_MINUTES` | Feature flag y TTL demo; defaults false/60 min |
| `SUNAT_MASTER_KEY` | Base64 de 32 bytes para credenciales cifradas; debe mantenerse estable |
| `SUNAT_ENVIRONMENT`, `SUNAT_BETA_URL`, `SUNAT_PRODUCTION_URL`, `SUNAT_PRODUCTION_ENABLED` | Entorno/endpoint SUNAT; producción deshabilitada por defecto |
| `CATALOGO_SERVICE_URL`, `CLIENTE_SERVICE_URL` | Dependencias HTTP del servicio de ventas |

`frontend/src/environments/environment.prod.ts` tiene `demoAccessEnabled: true`,
pero eso solo habilita la interfaz. El endpoint backend también requiere
`DEMO_SESSIONS_ENABLED=true`; comprueba que la configuración sea coherente
antes de ofrecer sesiones demo. No documentes las contraseñas aleatorias
devueltas por ese endpoint.

No pongas valores secretos en Markdown, scripts, historial shell, logs,
capturas ni commits. En AWS usa el mecanismo de secretos autorizado; la
instantánea actual usa un `.env` local del servidor.

## Bases y migraciones

- `database/init/01-create-databases.sh` crea las seis bases locales vacías.
- Cada microservicio ejecuta Flyway al iniciar y valida esquema con Hibernate.
- Revisa versión Flyway y respalda/verifica restauración antes de migrar una BD
  real.
- `database.sql` es legado; no cargarlo encima de las migraciones activas.

## GitHub y CI/CD

Repositorio privado `elMarce2007/Kipusalud`, branch principal `main`. En la
instantánea del 2026-11-23:

- GitHub reporta Issues y Wiki habilitados. Reglas de protección de rama,
  colaboradores, secrets de Actions y releases no se han auditado.
- no hay workflow versionado bajo `.github/workflows/`;
- no se detectó CI automático de pruebas/build ni pipeline de CD;
- los commits/publicación/despliegues se hicieron manualmente;
- `.github/modernize/` contiene archivos de proyecto de modernización, no CI.

Verifica permisos/protección de rama y acciones desde GitHub, ya que el estado
no se deduce de los archivos fuente. El procedimiento actual debe ejecutar
pruebas y builds antes del push y comprobar salud después del despliegue.

## Instantánea AWS verificada

**Observado el 2026-11-23; no es una garantía de estado futuro.**

- AWS región `us-east-2`; EC2 Ubuntu 24.04 tipo `m7i-flex.large` en `us-east-2c`,
  acceso de solo lectura verificado el 2026-11-23.
- Commit de código en servidor: `7dd684f`.
- Once contenedores estaban running/healthy; Compose remoto no incluía
  PostgreSQL local.
- El `df -h /` mostró 29 GB utilizables, 87% ocupados y 3.8 GB libres. Es un
  valor puntual: revisarlo antes de compilar/publicar nuevas imágenes.
- Compose remoto publicaba `80:80` para frontend y `8080:8080` para API Gateway.
  La regla de Security Group no fue consultada, así que el acceso externo al
  puerto 8080 es desconocido y requiere verificación.
- Aurora PostgreSQL se usa para las seis bases lógicas (`auth_db`,
  `clientes_db`, `catalogo_db`, `ventas_db`, `personal_db`, `auditoria_db`).
- El `docker-compose.yml` del servidor tiene cambio no versionado que fija el
  endpoint de Aurora y elimina dependencias del servicio local `psql`. El
  Compose del repositorio sigue usando `psql`. Una actualización de Git no
  reconcilia automáticamente ambas configuraciones.
- El worktree remoto tenía modificación en `docker-compose.yml` y archivos no
  versionados `backup_rds.sql`, `docker-compose.yml.antes-rds` y
  `docker-compose.yml.bak`. No leer ni copiar los archivos de backup; preservar
  los cambios locales. El dump puede contener datos personales/credenciales.
- Los contenedores estaban running/healthy. Los seis endpoints
  `/actuator/health` devolvieron `UP`; se verificó un acceso de login inválido
  que llegó a una consulta de DB de auth (401 esperado). No se ejecutó CRUD
  destructivo ni prueba de escritura sobre datos productivos.
- La configuración exacta de security groups, endpoint de instancia/cluster,
  certificados, backups automáticos y acceso IAM no quedó verificada por
  completo. El usuario indicó que Aurora no tiene gateway a Internet ni auth
  IAM en el asistente de conexión.

El inventario AWS, diferencias de Compose, topología EC2→Aurora y runbook seguro
están en [infraestructura-aws.md](infraestructura-aws.md).

### TLS hacia Aurora

El ejemplo de consola PSQL de AWS usa `sslmode=verify-full` y
`global-bundle.pem`, pero los URLs JDBC del repositorio no contienen
`sslmode=verify-full` ni una ruta de CA. La conectividad del JDBC no demuestra
validación estricta del certificado. Antes de declarar TLS verificado,
configurar/validar TLS para pgJDBC en todos los servicios y demostrar hostname +
cadena CA sin exponer claves. La conexión de consola PSQL no es la configuración
de la aplicación.

## Procedimiento de despliegue seguro

Solo desplegar con autorización expresa y después de revisar estado actual:

1. En local: `git status --short`, branch, commit, tests/build y revisión del
   diff; no incluir `.env`, dumps, artefactos ni backups.
2. En servidor: inspeccionar `git status --short`, `git diff -- docker-compose.yml`
   con valores secretos redactados y comprobar respaldos. No sobrescribir
   divergencia local.
3. Acordar cómo se conserva Aurora al actualizar Compose; no publicar endpoint,
   password ni TLS CA en Git.
4. Tomar backup Aurora con retención aprobada y confirmar que su restore es
   posible antes de migraciones sensibles.
5. Pull fast-forward solo si no hay conflictos locales; construir/recrear solo
   servicios afectados, conservar volúmenes.
6. Esperar healthchecks, consultar logs sin volcar variables secretas y hacer
   smoke test autenticado/no destructivo.
7. Confirmar commit, estado de servicios, migraciones y rollback disponible.

No uses `docker compose down -v`, no hagas cambios irreversibles en producción
como parte de una documentación o diagnóstico.

## Pruebas detectadas en el árbol

- Java: auth, security-core, catálogo y SUNAT tienen pruebas unitarias; no se
  encontró una suite integral que cubra todos los servicios con Aurora real.
- Angular: cuatro archivos `.spec.ts` detectados en el árbol inspeccionado.
- Las pruebas E2E Playwright referidas en sesiones previas no se localizaron
  como suite versionada en el repositorio; confirma su ubicación antes de
  depender de ellas.
- Comprueba `npm test` en `frontend/`; no desde la raíz, donde no existe un
  `package.json`.

## Troubleshooting inicial

- `503` recién reiniciado: permite que el nuevo servicio se registre en Eureka;
  inspecciona el registro antes de repetir prueba.
- `401`: valida código de farmacia, token y expiración; evita imprimir tokens.
- `403`: verifica permisos/rol en el filtro backend, no solo el guard Angular.
- error de categoría/tenant: revisar el ID recibido por frontend, `farmaciaId`
  de JWT, query tenant y BD destino.
- DB: comprobar `POSTGRES_HOST` efectivo por contenedor y nombre lógico de DB;
  nunca pegar `.env` o contraseña en logs/issue.
- Nginx/API: `environment.prod.ts` debe usar `/api`, proxy al gateway.

Los pasos históricos de AWS en `docs/guia-despliegue-aws.md` pueden preceder a
Aurora; contrástalos con esta sección y con la configuración en vivo.
