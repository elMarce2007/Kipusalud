# Guía de Solución — Snackbar "No se puede conectar al servidor" (KipuSalud en AWS)

**Síntoma:** Al iniciar sesión en `http://18.217.124.33:4200`, el snackbar muestra error de conexión.
**Causa raíz identificada:** El frontend compilado dentro del contenedor Nginx apunta a `http://localhost:8080/api` (petición OPTIONS visible en la consola del navegador). Desde tu PC, `localhost` es TU computadora, no el servidor AWS → la petición falla y aparece el snackbar.

---

## Diagnóstico (confirmar antes de corregir)

1. Abre el navegador → F12 → pestaña **Red/Network** → intenta iniciar sesión.
2. Si ves peticiones a `http://localhost:8080/...` con estado `(null)` o "CORS bloqueado", esta guía aplica.
3. Verifica que el gateway responde desde el propio servidor (SSH):
   ```bash
   curl -s http://localhost:8080/actuator/health
   ```
   Debe responder `{"status":"UP"}`.

---

## SOLUCIÓN RECOMENDADA: Proxy inverso Nginx (misma ruta, sin CORS)

Hace que el frontend llame a `/api` en su mismo origen (`18.217.124.33:4200`) y Nginx lo reenvíe internamente al gateway. Elimina el problema de CORS y de localhost de una vez.

### Paso 1 — Editar la config de Nginx del frontend
En tu máquina local (repositorio), edita `frontend/nginx.conf` (o el archivo que uses) y agrega dentro del bloque `server { ... }`:

```nginx
    location /api/ {
        proxy_pass         http://api-gateway:8080/;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
```

> `api-gateway` funciona porque ambos contenedores están en la misma red Docker `kipusalud-network`.

### Paso 2 — Que el frontend use ruta relativa
Busca dónde está definida la URL base (típicamente `frontend/src/environments/environment.ts` o `environment.prod.ts`):

```ts
// ANTES (roto en producción):
apiUrl: 'http://localhost:8080/api'

// DESPUÉS (correcto):
apiUrl: '/api'
```

Si el valor se inyecta por variable de entorno en tiempo de ejecución, cambia también el `docker-compose.yml`:
```yaml
  frontend:
    environment:
      API_URL: /api
```

### Paso 3 — Subir los cambios y reconstruir SOLO el frontend
Desde tu laptop:
```bash
git add frontend/ docker-compose.yml
git commit -m "fix: nginx proxy /api -> api-gateway; frontend usa ruta relativa"
git push
```

Desde el servidor AWS (SSH):
```bash
cd ~/Kipusalud
git pull
docker compose up -d --build frontend
```

### Paso 4 — Probar
Abre `http://18.217.124.33:4200` → F12 → Red → inicia sesión.
Ahora las peticiones deben ir a `http://18.217.124.33:4200/api/auth/login` y devolver `200` o `401` (no `(null)`).

---

## ALTERNATIVA B: Apuntar directo al gateway (requiere abrir puerto + CORS)

Si prefieres no usar el proxy Nginx:

1. **Frontend:** cambia `apiUrl` a `http://18.217.124.33:8080/api` (en `environment.prod.ts`), sube cambios, reconstruye el frontend como en el Paso 3 anterior.
2. **Security Group AWS:** Consola EC2 → tu instancia → Seguridad → Editar reglas de entrada → Agrega regla: Tipo = Personalizado TCP, Puerto = `8080`, Origen = `0.0.0.0/0` → Guardar.
3. **CORS en api-gateway:** en `application.yml`/config del gateway, habilita el origen:
   ```yaml
   spring:
     cloud:
       gateway:
         globalcors:
           cors-configurations:
             '[default]':
               allowed-origins: "http://18.217.124.33:4200"
               allowed-methods: "*"
               allowed-headers: "*"
   ```
4. Reinicia solo el gateway tras aplicar la config.

> ⚠️ Esta opción expone el gateway directamente e implica mantener CORS configurado. La Opción A es más limpia para tu entrega.

---

## Checklist rápido si sigue fallando

| Verificación | Comando (en SSH del servidor) | Esperado |
|---|---|---|
| Gateway interno UP | `curl -s http://localhost:8080/actuator/health` | `{"status":"UP"}` |
| Login vía gateway | `curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"username":"kipusalud_admin","password":"KipuSalud2026!Admin"}'` | Token JWT |
| Login vía proxy Nginx | `curl -s -X POST http://localhost:4200/api/auth/login -H "Content-Type: application/json" -d '{"username":"kipusalud_admin","password":"KipuSalud2026!Admin"}'` | Token JWT |
| Frontend sirve build nuevo | `docker exec kipusalud-frontend grep -r "localhost:8080" /usr/share/nginx/html || echo OK` | `OK` (sin coincidencias) |
| Security Group abierto | Consola AWS → puertos 4200 y (si aplica) 8080 en entrada | `0.0.0.0/0` |

## Errores relacionados ya resueltos (contexto)

- **Puerto 4200 inaccesible desde internet:** faltaba regla de entrada en el Security Group → agregar puerto 4200 TCP desde `0.0.0.0/0`.
- **Healthcheck unhealthy del frontend:** se corrigió el `test` del healthcheck en `docker-compose.yml` apuntando a `http://localhost/` (la ruta `/health` no existía en Nginx).
- **admin/admin123 no inicia sesión:** la política exige mínimo 12 caracteres; se creó el usuario `kipusalud_admin` / `KipuSalud2026!Admin` con SQL insertado en `auth_db`.
- **"the input device is not a TTY":** al usar heredoc (`<< 'SQL'`) con `docker exec`, quitar `-t` y dejar solo `-i`.

## Recomendación final para el informe

La Opción A (proxy Nginx) deja la app en un solo origen: `http://18.217.124.33:4200` sirve UI **y** API (`/api/*`). Es el enlace que puedes reportar como "aplicación desplegada". Para HTTPS posterior, coloca Caddy/Nginx en el puerto 80 con certificado Let's Encrypt y mantén el mismo proxy.
