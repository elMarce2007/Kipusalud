# Instrucciones de trabajo para agentes

Antes de cambiar código, lee [la guía de traspaso](docs/guia-tecnica-llm.md) y
las páginas específicas que enlaza. Estas instrucciones complementan las
instrucciones del usuario; no sustituyen el código ejecutable.

## Fuentes de verdad

1. Código actual, configuración efectiva y migraciones Flyway.
2. Esta documentación y los documentos especializados enlazados desde
   `README.md`.
3. Bitácoras y documentos académicos antiguos, solo como contexto histórico.

`docs/README-resumen-sesion.md` contiene información histórica que puede estar
obsoleta. No copies credenciales, no restaures usuarios antiguos ni supongas que
sus pasos siguen describiendo AWS.

## Límites de datos y seguridad

- No abras, imprimas, copies, registres ni añadas a documentación `.env`,
  `backup_rds.sql`, certificados, claves, tokens o credenciales.
- No leas ni subas dumps de producción. Trátalos como datos potencialmente
  personales y sensibles.
- No uses `database.sql` para inicializar los servicios actuales; el esquema
  activo se define por las migraciones Flyway de cada servicio.
- No ejecutes `docker compose down -v`, no elimines volúmenes y no hagas
  `git reset --hard`/`git checkout` sobre trabajo existente.
- Cada servicio accede solo a su base lógica. La identidad de farmacia se
  obtiene del JWT y de `TenantContext`; mantén el aislamiento tenant en
  consultas, escrituras, eventos y operaciones de limpieza.
- No cambies la configuración AWS ni despliegues si el usuario no lo solicita.

## Reglas prácticas de cambios

- Sigue los patrones existentes: controller → service → repository; DTOs como
  contrato HTTP; configuración y secretos externalizados.
- Cambios de esquema nuevos: añade una migración Flyway versionada al módulo
  propietario. No edites una migración que pueda haberse ejecutado ya.
- Cambios de interfaz: conserva guards, permisos, interceptores y rutas API.
- Ventas e inventario usan claves de idempotencia, cantidades de lotes y
  confirmación de inventario entre servicios: revisa ambos lados del contrato.
- Los eventos RabbitMQ se publican desde outbox; no sustituyas ese flujo por un
  envío directo sin revisar atomicidad y deduplicación.
- Para SUNAT, la clave maestra debe permanecer estable y producción requiere
  habilitación intencional; consulta su documentación antes de tocarlo.
- Ejecuta las pruebas del módulo afectado y reporta explícitamente qué no se
  pudo verificar.

## AWS: advertencia de divergencia

En la inspección documentada el 2026-11-23, EC2 ejecutaba el código `7dd684f`,
pero el worktree remoto estaba modificado: el `docker-compose.yml` local del
servidor apuntaba a Aurora y había archivos no versionados de respaldo. Esa
configuración de Aurora no forma parte del `docker-compose.yml` de Git.

Antes de `git pull`, build o despliegue en el servidor:

1. Comprueba branch, commit y `git status --short`.
2. Preserva los cambios locales y los respaldos existentes; no los borres ni
   los sobrescribas.
3. Lee [el estado AWS y el procedimiento operativo](docs/operaciones.md).
4. Verifica destino de base de datos, migraciones y salud antes de reiniciar
   servicios.

Los detalles variables de Aurora, red, IAM, DNS y secretos deben consultarse en
la cuenta/configuración autorizada, no inferirse de esta instantánea.
Para el mapa de EC2/Compose/RDS y el inventario de solo lectura, sigue
[infraestructura-aws.md](docs/infraestructura-aws.md).
