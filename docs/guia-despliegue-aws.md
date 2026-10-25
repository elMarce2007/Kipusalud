# Guía de Despliegue de KipuSalud en AWS

> Documento para el proyecto KipuSalud (microservicios Spring Cloud + Angular).
> Arquitectura del sistema: 12 servicios Dockerizados (frontend nginx, api-gateway,
> discovery/config server, auth, cliente, catalogo, ventas, personal, audit,
> PostgreSQL y RabbitMQ). Puertos internos definidos en `docker-compose.yml`.

---

## 0. Resumen de opciones de despliegue

| Opción | Servicio AWS | Costo aprox. | Complejidad | Recomendado para |
|---|---|---|---|---|
| **A. EC2 con Docker Compose** | Amazon EC2 (t3.medium/large) | ~$30–60/mes | Baja | ✅ Presentación académica / demo del proyecto |
| B. ECS Fargate + ALB | Elastic Container Service | ~$70–150/mes | Media-Alta | Producción escalable |
| C. Lightsail | Amazon Lightsail (instancia contenedores) | ~$10–20/mes | Muy baja | Demos rápidas y baratas |

Esta guía desarrolla la **Opción A (EC2 + Docker Compose)** por ser la más fiel al
`docker-compose.yml` del repositorio y suficiente para demostrar el sistema funcionando.
Al final se incluye un anexo con las notas para migrar a ECS Fargate (Opción B).

---

## 1. Preparación local (antes de subir a AWS)

### 1.1 Verificar que los images builds funcionan
```bash
cd kipusalud
cp .env.example .env        # editar secretos antes de subir
docker compose build
docker compose up -d
curl http://localhost:8080/actuator/health   # gateway OK
```

### 1.2 Configurar variables de entorno productivas
Editar `.env` (NUNCA subirlo a Git; ya está en `.gitignore`):
```env
POSTGRES_USER=kipusalud
POSTGRES_PASSWORD=<password-fuerte-aleatorio>
RABBITMQ_USER=kipusalud
RABBITMQ_PASSWORD=<password-fuerte>
JWT_SECRET=<openssl rand -base64 48>
JWT_EXPIRATION=86400000
SUNAT_MASTER_KEY=<openssl rand -base64 32>
SUNAT_ENVIRONMENT=BETA
```

### 1.3 Ajustes previos al despliegue
- El frontend se sirve por nginx en el mapeo `4200 -> 80`; para exponerlo en el
  puerto estándar, cambiar `"4200:80"` a `"80:80"` en el servicio `frontend`
  del `docker-compose.yml`, o dejar un reverse proxy (Caddy/nginx) en el host.
- Los puertos `5433` (Postgres), `8761` (Eureka), `8888` (Config), `15672`
  (RabbitMQ UI) y `909x` (metrics) **no deben exponerse públicamente** en producción.
  Restrinirlos solo a `127.0.0.1` (ej.: `"127.0.0.1:8761:8761"`) o cerrarlos en el Security Group.
- ✅ **No hace falta tocar las URLs del API**: `environment.prod.ts` ya usa `apiUrl: '/api'`
  (ruta relativa) y `frontend/nginx.conf` hace `proxy_pass http://api-gateway:8080/api/`.
  Con HTTPS detrás de Caddy, todo queda servido desde el mismo origen (sin CORS).

### 1.4 ⚠️ Bloqueante: inicialización del esquema de Base de Datos
Los servicios usan `spring.jpa.hibernate.ddl-auto: validate`: **NO crean las tablas**.
El script `database/init/01-create-databases.sh` solo crea las 6 bases
(`auth_db, clientes_db, catalogo_db, ventas_db, personal_db, auditoria_db`),
pero **no ejecuta `database.sql`** (tablas + datos semilla). Sin esto, los contenedores
fallan al arrancar con `Schema-validation: missing table [...]`.

Solución recomendada (montar el SQL en el init de Postgres): editar el volumen del
servicio `psql` en `docker-compose.yml` para añadir el archivo:

```yaml
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
      - ./database.sql:/docker-entrypoint-initdb.d/99-schema.sql:ro
```

La imagen oficial de Postgres ejecuta automáticamente los `.sh` y `.sql`
de `/docker-entrypoint-initdb.d/` **solo en el primer arranque** (cuando el volumen
`postgres_data` está vacío). El orden es alfabético: primero `01-create-databases.sh`
crea las 6 bases, luego `99-schema.sql` crea tablas y datos semilla.
Si ya probaste el stack antes, reinicia limpio: `docker compose down -v && docker compose up -d`.

Alternativa manual después de `docker compose up -d psql`:
```bash
docker exec -i kipusalud-psql psql -U postgres < database.sql
```

Además: el usuario admin semilla de `database.sql` tiene contraseña BCrypt hardcodeada;
cámbiala antes de desplegar generando tu hash:
```bash
# ejemplo con bcrypt online o vía auth-service; documentar la contraseña demo en el informe
htpasswd -bnBC 12 "" 'TU_PASSWORD_DEMO' | tr -d ':\n'
```

### 1.5 Recomendado: limitar memoria de la JVM (instancia 4 GB)
Con 12 contenedores en una t3.medium (4 GB), cada JVM puede consumir ~1.5–2 GB por defecto
y Linux matará procesos (OOM). Añadir a cada servicio Java del `docker-compose.yml`:

```yaml
    environment:
      JAVA_TOOL_OPTIONS: "-XX:MaxRAMPercentage=50 -XX:+UseSerialGC"
```

O usar una instancia **t3.large / m5.large (8 GB)** y saltar este paso.

### 1.6 Opcional: desactivar RabbitMQ si no se usará en la demo
Si audit/catalogo/ventas fallan por conexión a colas durante la presentación, se puede
levantar el stack sin `rabbitmq` eliminando sus `depends_on` o usando perfiles. No es
bloqueante: RabbitMQ arranca primero gracias a su healthcheck.

---

## 2. Crear la cuenta y recursos base en AWS

### 2.1 Cuenta y usuario
1. Crear cuenta en https://aws.amazon.com (requiere tarjeta).
2. Habilitar MFA en el usuario root.
3. (Recomendado) Crear un usuario IAM con política `AmazonEC2FullAccess` para trabajar desde CLI.

### 2.2 Región
Seleccionar una región cercana (ej. `us-east-1` o `sa-east-1` – São Paulo, menor latencia para Perú).
Configurar CLI local:
```bash
aws configure     # Access Key, Secret Key, region, output json
```

### 2.3 Key Pair (par de llaves SSH)
```bash
aws ec2 create-key-pair --key-name kipusalud-key \
  --query 'KeyMaterial' --output text > ~/.ssh/kipusalud-key.pem
chmod 400 ~/.ssh/kipusalud-key.pem
```

### 2.4 Security Group (firewall)
```bash
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefaultVariable,Values=true --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 create-security-group \
  --group-name kipusalud-sg \
  --description "KipuSalud web + ssh" \
  --vpc-id $VPC_ID --query 'GroupId' --output text)

# HTTP y HTTPS públicos (para la app)
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# SSH SOLO desde tu IP pública (NO usar 0.0.0.0/0)
MYIP=$(curl -s ifconfig.me)/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr $MYIP
```

---

## 3. Lanzar la instancia EC2

### 3.1 Elegir AMI e tipo
- **AMI:** Ubuntu Server 24.04 LTS (free tier elegible: t2.micro/t3.micro hasta 750 h/mes;
  para los 12 contenedores se recomienda **t3.medium (4 GB RAM)** o superior).
- **Storage:** gp3, mínimo **30 GB** (las imágenes Docker ocupan ~10–15 GB).

### 3.2 Vía consola
EC2 → Instances → Launch instance → configurar AMI, tipo, key pair, security group,
storage → **Launch**. Anotar la IP pública.

### 3.3 Vía CLI (equivalente)
```bash
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --count 1 --instance-type t3.medium \
  --key-name kipusalud-key --security-group-ids $SG_ID \
  --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3} \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=kipusalud}]'
```

### 3.4 Conectarse por SSH
```bash
ssh -i ~/.ssh/kipusalud-key.pem ubuntu@<IP-PUBLICA>
```

---

## 4. Instalar Docker + Docker Compose en la instancia

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io git curl unzip aws-cli
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker          # o cerrar sesión y volver a entrar

# Plugin Docker Compose v2
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

---

## 5. Desplegar KipuSalud

### 5.1 Obtener el código
```bash
git clone <URL-de-tu-repositorio> kipusalud
cd kipusalud
```
(Si el repo es privado: usar token PAT o copiar con `scp -i ~/.ssh/kipusalud-key.pem -r ./kipusalud ubuntu@<IP>:/home/ubuntu/`)

### 5.2 Crear el archivo .env en el servidor
Copiar el `.env` local configurado (sección 1.2) al servidor:
```bash
scp -i ~/.ssh/kipusalud-key.pem .env ubuntu@<IP-PUBLICA>:~/kipusalud/.env
```

### 5.3 Levantar todo el stack
```bash
docker compose --env-file .env up -d --build
docker compose ps          # verificar que todos estén "healthy"
```

Orden interno de arranque (ya resuelto por `depends_on` con healthchecks):
psql/rabbitmq → discovery → config → services → gateway → frontend.

### 5.4 Pruebas de humo
```bash
curl -s http://localhost/                     # SPA Angular (si mapeaste 80:80)
curl -s http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"..."}'  # 200 + JWT
docker compose logs --tail=50 api-gateway
```
Abrir en el navegador: `http://<IP-PUBLICA>` → login KipuSalud.

---

## 6. Dominio y HTTPS (recomendado para el informe)

### 6.1 Route 53
1. Comprar dominio (ej. `kipusalud.duckdns.org` gratis vía DuckDNS, o dominio propio en Route 53).
2. Route 53 → Hosted Zones → crear registro **A** apuntando a la IP pública de EC2.

### 6.2 Certificado SSL
- **Opción simple:** instalar Caddy como reverse proxy con TLS automático:
```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<EOF
app.kipusalud.pe {
    reverse_proxy localhost:80
}
EOF
sudo systemctl reload caddy
```
- **Opción AWS:** ACM (certificado público) + Application Load Balancer en modo HTTPS→HTTP (ver anexo B).

> Nota: con HTTPS activo, actualizar la `API_URL` del frontend a `https://...` y reconstruir el contenedor frontend.

---

## 7. Persistencia de datos (PostgreSQL gestionado — opcional pero recomendado)

Si prefieres no depender del volumen Docker para la BD:

1. Crear RDS PostgreSQL 16:
```bash
aws rds create-db-instance \
  --db-instance-identifier kipusalud-db \
  --db-instance-class db.t4g.micro --engine postgres --engine-version 16.3 \
  --allocated-storage 20 --master-username kipusalud \
  --master-user-password '<strong>' \
  --vpc-security-group-ids $SG_ID --backup-retention-period 7
```
2. En el `docker-compose.yml` del servidor, eliminar el servicio `psql` y cambiar en `.env`:
```env
POSTGRES_HOST=<endpoint-rds>   POSTGRES_PORT=5432
```
3. Ejecutar el script inicial `database.sql` contra RDS:
```bash
psql -h <endpoint-rds> -U kipusalud -f database.sql
```

---

## 8. Operación y mantenimiento

| Acción | Comando |
|---|---|
| Ver estado | `docker compose ps` |
| Logs de un servicio | `docker compose logs -f ventas-service` |
| Actualizar versión | `git pull && docker compose up -d --build` |
| Reiniciar stack | `docker compose down && docker compose up -d` |
| Backup BD (contenedor) | `docker exec kipusalud-psql pg_dump -U postgres -d auth_db > backup_auth.sql` |
| Monitoreo | `docker stats` / CloudWatch Agent (opcional) |

### Seguridad adicional recomendada
- Rotar `JWT_SECRET` y contraseñas si se filtraron en Git.
- Mantener cerrados los puertos 8761, 8888, 5433, 15672 en el Security Group.
- Snapshots EBS automáticos semanales (consola EC2 → Elastic Block Store → Snapshots).
- Habilitar IMDSv2: `aws ec2 modify-instance-metadata-options --instance-id <id> --http-tokens required --http-endpoint enabled`.

---

## 9. Costos estimados (escenario demo)

| Recurso | Especificación | Costo/mes aprox. |
|---|---|---|
| EC2 t3.medium | 4 GB RAM, on-demand us-east-1 | ~$30 |
| EBS gp3 30 GB | storage | ~$2.4 |
| Transferencia saliente | < 1 GB | $0 (free tier) |
| Route 53 dominio .com | registro anual | ~$12/año |
| RDS db.t4g.micro (opcional) | BD gestionada | ~$15 |
| **Total típico** | | **~$35–50/mes** |

Para un proyecto académico puede reducirse a **Lightsail $10/mes** corriendo el mismo compose, o apagando la instancia (`stop`) fuera de horario de demostraciones.

---

## 10. Checklist final: ¿qué falta para desplegar en AWS?

Estado tras auditar el repositorio (Oct-2026):

| # | Elemento | Estado | Acción pendiente |
|---|---|---|---|
| 1 | Dockerfiles de los 10 servicios + frontend | ✅ Listos (multi-stage, healthchecks) | Ninguna |
| 2 | `docker-compose.yml` con orden por healthchecks | ✅ Listo | Cambiar `"4200:80"` → `"80:80"` (o proxy Caddy) |
| 3 | `.env` productivo | ⚠️ Falta crearlo | `cp .env.example .env` + secretos fuertes (§1.2) |
| 4 | Esquema de BD automático | ❌ **Bloqueante** | Montar `database.sql` en `/docker-entrypoint-initdb.d/` (§1.4) |
| 5 | Puertos internos expuestos (8761/8888/5433/15672/909x) | ⚠️ Riesgo | No abrirlos en el Security Group o bind a `127.0.0.1` |
| 6 | Memoria JVM vs. instancia 4 GB | ⚠️ Riesgo OOM | `JAVA_TOOL_OPTIONS` (§1.5) o usar t3.large |
| 7 | URL API del frontend prod | ✅ OK (`/api` relativo + proxy nginx) | Ninguna |
| 8 | HTTPS/dominio | ⚠️ Opcional pero recomendado | Caddy + Route 53/DuckDNS (§6) |
| 9 | Contraseña admin semilla (hash BCrypt fijo) | ⚠️ Definir demo | Cambiar hash y documentar credencial (§1.4) |
| 10 | Repo accesible desde la instancia | ⚠️ Verificar | Subir a GitHub/GitLab o copiar por `scp` (§5.1) |
| 11 | SUNAT producción | ✅ No necesario | Dejar `SUNAT_ENVIRONMENT=BETA` para la demo |

**Ruta mínima de despliegue:** ítems 3, 4 y 2 son obligatorios; 5, 6 y 8 fuertemente recomendados; el resto es opcional para una entrega académica.

---

## 11. Link para el informe

Una vez desplegado, registrar en el informe (sección C – Programación):

```
Aplicación web desplegada en AWS:
URL:            https://app.kipusalud.pe (o http://<IP-publica>)
Región:         us-east-1
Instancia:      i-0xxxxxx (t3.medium, Ubuntu 24.04, Docker Compose)
Credenciales demo:
  ADMIN / ...  (registro de farmacia de prueba)
  CAJERO / ...
Arquitectura:   12 contenedores (Angular+nginx, Gateway, Eureka, Config,
                5 microservicios, audit, PostgreSQL, RabbitMQ)
```

---

## Anexo A — Migración a ECS Fargate (producción real)

1. Subir las 12 imágenes a **ECR**: `aws ecr create-repository` + `docker push`.
2. Crear cluster ECS, task definitions (CPU/mem por servicio) usando el mismo patrón de variables (`SECRETS_MANAGER` para JWT/DB).
3. Reemplazar Eureka/Config por **Cloud Map** + parámetros en Secrets Manager (opcional: mantener Eureka dentro del cluster para no tocar código).
4. **ALB** frente a api-gateway (target group por service discovery); frontend como task detrás de otro listener o servido desde S3+CloudFront.
5. RDS + RabbitMQ como AmazonMQ/RabbitMQ broker dedicado.
6. CI/CD con CodePipeline o GitHub Actions → `aws ecs deploy`.

## Anexo B — Alternativa sin servidores (descartada para este proyecto)
Lambda + API Gateway + Fargate Spot: alto trabajo de refactorización (Spring Boot cold starts); no recomendado para la entrega académica.

---

*Elaborado para el proyecto KipuSalud — Computación e Informática / Administración y Sistemas.*
