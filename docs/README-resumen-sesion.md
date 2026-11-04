# KipuSalud — Resumen de todo el trabajo realizado (Bitácora)

> Documento consolidado de todos los entregables, correcciones y avances de la sesión.
> Proyecto: **Kipusalud** (sistema de gestión para farmacias — microservicios Spring Boot + Angular).

---

## 1. Índice de documentos generados

| Archivo | Contenido |
|---|---|
| `docs/entregables-uml-kipusalud.md` | Entregables A/B/C del informe: diagramas UML (casos de uso, clases, comunicación), ECUs, RUCs y trazabilidad de programación. Incluye código PlantUML y Mermaid listo para renderizar. |
| `docs/guia-despliegue-aws.md` | Guía completa de despliegue en AWS (EC2 + Docker Compose, alternativa ECS Fargate, RDS opcional, HTTPS con Caddy, costos, operación). |
| `docs/troubleshooting-snackbar-conexion.md` | Solución al error "No se puede conectar al servidor" (frontend apuntando a `localhost:8080` → proxy Nginx `/api`). |
| `docs/diagrams/*.png` | 8 imágenes ya renderizadas (PlantUML y Mermaid): casos de uso, clases, comunicación venta/login, componentes, estados, secuencia y arquitectura. |

---

## 2. Entregables del informe (punto A, B, C)

### A. Modelo de Requerimientos
- **A.1 Diagrama General de Casos de Uso**: 12 casos de uso (UC01–UC12), 4 actores principales + actor secundario SUNAT, relaciones `<<include>>`/`<<extend>>`. Disponible en **PlantUML y convertido también a Mermaid**.
- **A.2 Especificaciones de Caso de Uso (ECU)**: formato estándar (Actores, Precondición, Secuencia básica, Alternativa, Regla de negocio, Postcondición, Capturas). ECUs redactadas: **ECU01, ECU02, ECU04, ECU06, ECU07, ECU08, ECU09, ECU10 y ECU12 (Ver Dashboard — agregada recientemente con su RUC correspondiente)**.

### B. Modelo de Análisis y Diseño
- **B.1 Realización de Casos de Uso (RUC)**: vistas de implementación por participante (componentes Angular, controladores Spring Boot, entidades, estados). Diagramas Mermaid: componentes de login, estados de la venta; RUC12 añadido con su diagrama de componentes del Dashboard.
- **B.2 Diagrama de Clases de Análisis**: Usuario, Cliente, Categoria, Producto, Venta, VentaDetalle, Personal, InventarioServicio + enums y asociaciones (PlantUML corregido con `@startuml/@enduml`).
- **B.3 Diagramas de Comunicación**: UC08 Registrar Venta (con Feign + transacción de stock) y UC01 Login JWT (PlantUML + versión Mermaid sequenceDiagram).

### C. Programación
- Matriz de trazabilidad caso de uso ↔ código real del repo (auth-service, cliente-service, catalogo-service, ventas-service, personal-service, audit-service, api-gateway, frontend Angular con guards/interceptors).
- Fragmentos representativos Java/TypeScript para el informe.
- Enlace de despliegue (ver sección 4).

### Herramientas de diagramado (respuesta al profesor)
- **PlantUML**: diagrama de casos de uso, clases y comunicación.
- **Mermaid**: componentes, estados, secuencia alternativa y arquitectura.
- Renderizados con CLI de PlantUML / mermaid-cli; editables en draw.io, StarUML o Visual Paradigm si se prefiere estilo clásico.

---

## 3. Correcciones técnicas al repositorio

### `docker-compose.yml`
- Puertos cerrados: solo expuestos frontend (4200→80), gateway (8080) y psql (5433, acceso interno/túnel). Eureka, Config, RabbitMQ y servicios internos quedan en la red Docker.
- Healthcheck de PostgreSQL corregido (usa variables dinámicas de usuario).
- Límites de memoria JVM (`JAVA_TOOL_OPTIONS=-Xmx...`) por servicio para evitar OOM exit 137.
- Montaje de `./database/init:/docker-entrypoint-initdb.d:ro` para inicializar las bases automáticamente.
- Healthcheck del frontend: `test` apuntando a `http://localhost/` (antes `/health`, que no existía en Nginx y marcaba *unhealthy*).

### `.env`
- Generado con secretos fuertes vía `openssl rand` (POSTGRES_PASSWORD, RABBITMQ_PASSWORD, JWT_SECRET), `chmod 600` y excluido de git. Nunca usar `1234`/`guest` en producción.

---

## 4. Despliegue en AWS — estado actual

**Instancia:** EC2 Ubuntu 24.04, IP pública `18.217.124.33`, puerto app `4200`.
**App URL:** `http://18.217.124.33:4200` ✅ (frontend servido por Nginx, HTTP 200 verificado).
**Credenciales demo:** usuario `kipusalud_admin` / contraseña `KipuSalud2026!Admin` (creado por SQL en `auth_db`; `admin/admin123` ya no funciona porque la política exige ≥12 caracteres).

### Problemas resueltos durante el despliegue
1. **`aws configure`** → output format: dejar vacío o `json`.
2. **`run-instances` — BlockDeviceMappings**: error de parsing con `Ebs={...}` → usar JSON `[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]`.
3. **SCP de AWS Organizations deniega `ec2:DescribeImages`/`DescribeInstances`** → resolver AMI/IP desde la Consola Web (AMI Ubuntu 24.04 owner `099720109477`) y usar la IP pública directamente para SSH.
4. **SSH "UNPROTECTED PRIVATE KEY FILE"** → `chmod 600 ~/.ssh/KIPUSALUD_SECRETO.pem`; "error in libcrypto" → llave corrupta, copiar el `.pem` original descargado de AWS.
5. **apt: no existe `aws-cli`/`awscli` en Ubuntu 24.04** → instalar solo `docker.io git curl unzip` (la CLI es opcional en el servidor).
6. **Compose: `JWT_SECRET is required`** → crear `.env` en el servidor con secretos generados por `openssl`.
7. **Build Maven exit 137 (OOM)** → t3.medium insuficiente; cambiar tipo de instancia (Stop → Change instance type → Start; requiere detener la instancia; la IP pública cambia si no es Elastic IP). Opciones disponibles según permisos: `m7i-flex.large` (8 GB) recomendada.
8. **"the input device is not a TTY"** → al usar heredoc con `docker exec`, quitar `-t` (usar solo `-i`).
9. **Frontend unhealthy pero HTTP 200** → healthcheck mal apuntado a `/health` (corregido).
10. **Snackbar "no se puede conectar al servidor"** → causa raíz: el bundle Angular apunta a `http://localhost:8080/api` (se veía OPTIONS a localhost desde el navegador). **Solución documentada paso a paso en `docs/troubleshooting-snackbar-conexion.md`**: proxy inverso Nginx `location /api/ → http://api-gateway:8080/` + cambiar `apiUrl` a `/api` en environment + `docker compose up -d --build frontend` (solo el frontend). Alternativa B: exponer 8080 + CORS en gateway (no recomendada).

### Pendientes
- [ ] Aplicar la corrección del proxy Nginx (Opción A de la guía de troubleshooting) y verificar login end-to-end.
- [ ] Capturas de pantalla funcionales para cada ECU (login, dashboard, POS, inventario, etc.).
- [ ] HTTPS con dominio + Caddy/Let's Encrypt (opcional, sección 7 de la guía AWS).
- [ ] Backup inicial y snapshot EBS.

---

## 5. Comandos clave de operación (en el servidor SSH)

```bash
cd ~/Kipusalud
docker compose ps                        # estado de los 12 contenedores
docker compose logs -f <servicio>        # logs (ej. api-gateway, frontend)
docker compose up -d --build frontend    # reconstruir solo el frontend
docker compose restart api-gateway       # reiniciar un servicio
git pull                                 # actualizar código tras push local
```

Pruebas rápidas (sin levantar nada nuevo):
```bash
curl -s http://localhost:8080/actuator/health          # gateway UP
curl -s -X POST http://localhost:4200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kipusalud_admin","password":"KipuSalud2026!Admin"}'   # debe devolver token
```

---

## 6. Notas para el informe final

- Bloque sugerido: *"Aplicación desplegada en AWS EC2: http://18.217.124.33:4200 — Credenciales demo: kipusalud_admin / KipuSalud2026!Admin"*.
- Los diagramas visuales se generaron con **PlantUML** (casos de uso, clases, comunicación) y **Mermaid** (componentes, estados, arquitectura); el código fuente está embebido en `docs/entregables-uml-kipusalud.md` y las imágenes exportadas en `docs/diagrams/`.
- La arquitectura desplegada coincide con el diagrama del anexo: 12 contenedores (frontend, gateway, 6 servicios de negocio, Eureka, Config Server, PostgreSQL, RabbitMQ) en una sola instancia EC2 mediante Docker Compose.
