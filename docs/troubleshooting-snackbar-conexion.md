# Diagnóstico de conexión UI/API (KipuSalud en AWS)

La aplicación se publica en `http://18.217.124.33`; Nginx sirve el frontend y reenvía `/api/` al API Gateway por la red interna de Docker. El gateway no necesita exponerse directamente a Internet.

## Comprobar el problema

1. En el navegador abre **F12 → Red/Network** y repite la acción.
2. Las solicitudes deben ir a `http://18.217.124.33/api/...`, nunca a `localhost`.
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

Si se modificó frontend o gateway, actualiza el código y reconstruye en forma secuencial para no saturar la instancia:

```bash
git pull --ff-only origin main
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
