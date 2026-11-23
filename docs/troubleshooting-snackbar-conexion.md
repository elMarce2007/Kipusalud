# Diagnóstico de conexión UI/API (KipuSalud en AWS)

En la configuración descrita en este documento, Nginx sirve el frontend y
reenvía `/api/` al API Gateway por la red interna de Docker. La URL pública y
los puertos deben consultarse en la configuración autorizada del entorno; no se
debe asumir que esta guía refleja el endpoint actual.

## Comprobar el problema

1. En el navegador abre **F12 → Red/Network** y repite la acción.
2. Las solicitudes deben ir al mismo origen del frontend (`/api/...`), nunca a
   `localhost` en un bundle de producción.
3. Interpreta el resultado:
   - `0` o `ERR_CONNECTION_REFUSED`: URL/base de API incorrecta o servidor inaccesible.
   - `401`: sesión ausente/expirada o credenciales de acceso incorrectas.
   - `403`: el usuario autenticado no tiene permiso para esa operación.
   - `5xx`: revisar el servicio indicado en los logs.

## Comprobaciones en el servidor

```bash
cd ~/Kipusalud
docker compose ps
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1:8080/actuator/health
```

La aplicación usa el perfil de producción de Angular, que configura la API como ruta relativa `/api`. `frontend/angular.json` debe reemplazar `src/environments/environment.ts` por `src/environments/environment.prod.ts` para builds de producción.

Para inspeccionar errores sin imprimir credenciales:

```bash
docker logs --since 15m kipusalud-frontend
docker logs --since 15m kipusalud-gateway
docker logs --since 15m kipusalud-auth
```

Si se modificó frontend o gateway, **no hagas `git pull` directamente en el
servidor**: su `docker-compose.yml` tiene cambios locales no versionados (Aurora)
y hay respaldos que deben preservarse. Primero sigue el
[procedimiento de despliegue seguro](./operaciones.md#procedimiento-de-despliegue-seguro)
y la [guía de infraestructura](./infraestructura-aws.md): revisa branch, commit
y `git status --short`, y acuerda cómo conservar la configuración de Aurora.

Solo con autorización expresa y el código ya actualizado, reconstruye en forma
secuencial para no saturar la instancia:

```bash
docker compose --parallel 1 build frontend
docker compose up -d --no-deps frontend
```

Para cambios del gateway usa `api-gateway` en ambos comandos. No uses `docker compose down -v`: los volúmenes contienen datos persistentes.

## Acceso de usuarios y farmacia

El inicio de sesión requiere el código único de farmacia, el usuario y la contraseña:

```bash
curl -i -X POST http://127.0.0.1/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"farmaciaCodigo":"<CODIGO_FARMACIA>","username":"<USUARIO>","password":"<CONTRASENA>"}'
```

El código se muestra al registrar la farmacia y en el módulo **Farmacia**. Es un identificador de tenant, no reemplaza las credenciales del usuario. No publiques contraseñas, tokens ni contenido de `.env` en documentación, comandos compartidos o capturas.
