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
cp .env.example .env        # completar secretos antes de arrancar
docker compose --parallel 1 build
docker compose up -d
curl http://localhost:8080/actuator/health   # gateway accesible solo desde el host
```

### 1.2 Configurar variables de entorno productivas
Editar `.env` (no subirlo a Git; `.env.example` no contiene secretos). Genera secretos
distintos para cada servicio y entorno:
```env
POSTGRES_USER=kipusalud
POSTGRES_PASSWORD=<secreto-aleatorio-unico>
RABBITMQ_USER=kipusalud
RABBITMQ_PASSWORD=<secreto-aleatorio-unico>
JWT_SECRET=<salida-de-openssl-rand-base64-48>
JWT_EXPIRATION=86400000
DEMO_SESSIONS_ENABLED=false
DEMO_SESSION_TTL_MINUTES=60
SUNAT_MASTER_KEY=<salida-de-openssl-rand-base64-32>
SUNAT_ENVIRONMENT=BETA
```
Genera las claves con `openssl rand -base64 48` y `openssl rand -base64 32`;
guárdalas en un gestor de secretos o en un `.env` con permisos restringidos.
No reutilices contraseñas ni claves publicadas previamente. `SUNAT_MASTER_KEY`
debe conservarse mientras existan credenciales SUNAT cifradas con ella; rotarla
requiere descifrar y volver a cifrar esos datos.

El botón demo del login productivo requiere `DEMO_SESSIONS_ENABLED=true` en el
`.env` del servidor; por defecto se mantiene desactivado. Cada sesión crea una
farmacia aislada con cuentas aleatorias y se purga al vencer. El límite es de 60
minutos por defecto y el recolector revisa sesiones vencidas cada cinco minutos.
No reutilices ni publiques las credenciales temporales que se muestran en el login.

### 1.3 Ajustes previos al despliegue ✅ YA APLICADOS EN EL REPOSITORIO
Los siguientes ajustes ya están hechos en el `docker-compose.yml` actual; verifícalos con `git diff`:
- El frontend ya expone `"80:80"` (nginx en el puerto estándar del host).
- El API Gateway y PostgreSQL se enlazan a `127.0.0.1`; el gateway se consume a
  través del proxy del frontend y PostgreSQL se puede consultar mediante túnel SSH.
  Eureka/Config/RabbitMQ/UI/metrics no publican puertos en el host.
- Cada servicio Java ya incluye `JAVA_TOOL_OPTIONS` con límite de RAM (§1.5 resuelto).
- ✅ **No hace falta tocar las URLs del API**: `environment.prod.ts` ya usa `apiUrl: '/api'`
  (ruta relativa) y `frontend/nginx.conf` hace `proxy_pass http://api-gateway:8080/api/`.
  Con HTTPS detrás de Caddy, todo queda servido desde el mismo origen (sin CORS).

### 1.4 Inicialización del esquema de Base de Datos
`database/init/01-create-databases.sh` crea únicamente las bases vacías
(`auth_db, clientes_db, catalogo_db, ventas_db, personal_db, auditoria_db`).
Cada microservicio crea y actualiza sus tablas mediante sus migraciones Flyway al
arrancar. No importes SQL de esquema o datos de demostración: no corresponde al
modelo actual y entra en conflicto con Flyway.

Las migraciones se ejecutan también cuando `postgres_data` ya existe; no borres
volúmenes para forzar su ejecución. Antes de cambios de esquema, haz un respaldo
verificado. Si una migración falla, revisa los logs del servicio y corrige la causa
sin eliminar ni recrear el volumen de PostgreSQL.

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

echo "SG_ID=$SG_ID"   # anótalo para el paso 3
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

### 3.4 Obtener la IP pública y conectarse por SSH
```bash
# IP pública de la instancia (reemplaza <i-...> con el Instance ID del paso 3.3)
IP=$(aws ec2 describe-instances --instance-ids <i-...> \
     --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo $IP

ssh -i ~/.ssh/kipusalud-key.pem ubuntu@$IP
```
> Si `ssh` dice "Permissions too open": `chmod 400 ~/.ssh/kipusalud-key.pem`.
> Si la conexión se rechaza, verifica que tu IP actual coincida con la que abriste en el SG (§2.4).

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

### 5.1 Obtener el código (opción A: repositorio Git)
```bash
git clone <URL-de-tu-repositorio> kipusalud
cd kipusalud
```

### 5.1b Obtener el código (opción B: copiar desde tu PC con scp — sin Git)
Ejecuta esto **desde tu computadora local** (no desde la instancia):
```bash
scp -i ~/.ssh/kipusalud-key.pem -r /ruta/local/kipusalud ubuntu@<IP>:/home/ubuntu/kipusalud
```
> Tarda varios minutos por los `node_modules`/`target`. Para excluirlos, usa rsync:
> `rsync -avz --exclude node_modules --exclude target -e "ssh -i ~/.ssh/kipusalud-key.pem" ./kipusalud/ ubuntu@<IP>:~/kipusalud/`

### 5.2 Crear el archivo .env en el servidor
Crear el `.env` directamente en el servidor (no versionarlo ni copiarlo al repositorio):
```bash
umask 077
touch .env
nano .env
```

### 5.3 Levantar todo el stack
```bash
# El .env se aplica automáticamente (compose lee ./.env).
docker compose --parallel 1 build
docker compose up -d
docker compose ps                # verificar que todos estén "healthy"
docker compose logs -f           # seguir el arranque en vivo (Ctrl+C para salir)
```

Orden interno de arranque (ya resuelto por `depends_on` con healthchecks):
psql/rabbitmq → discovery → config → services → gateway → frontend.

### 5.4 Pruebas de humo
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/   # 200 = SPA Angular OK
curl -s http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"<usuario-configurado>","password":"<secreto-configurado>"}' \
  # 200 + JWT (login vía gateway)
docker compose logs --tail=50 api-gateway
# (si el healthcheck usa wget, revisa: docker inspect --format "{{json .State.Health}}" kipusalud-gateway)
```
Abrir en el navegador: `http://<IP-PUBLICA>` → login KipuSalud.

### 5.5 Solución de problemas frecuentes
| Síntoma | Causa probable | Corrección |
|---|---|---|
| `Schema-validation: missing table` | Falló una migración Flyway o se usó un esquema antiguo | Revisar los logs del servicio y la versión Flyway; respaldar antes de reparar, nunca borrar volúmenes con datos |
| Servicio muere y reinicia en loop / exit code 137 | OOM (RAM insuficiente) | Baja `MaxRAMPercentage` o usa t3.large; revisa `docker stats` y `sudo dmesg \| grep -i oom` |
| Gateway `healthy` pero servicios "no registered" | Eureka aún tibio | Esperar 60–90 s tras `up`; revisar `logs discovery-server` |
| Frontend carga pero `/api` da 502 | Gateway caído | `docker compose logs ventas-service auth-service` |
| SSH rechazado | Tu IP cambió | Actualiza la regla 22 del SG con tu nueva IP |

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
3. Crear las seis bases vacías y permitir que las migraciones Flyway de cada servicio
   creen las tablas al arrancar. No ejecutar esquemas ni credenciales de demostración:
```bash
# Configura POSTGRES_HOST=<endpoint-rds> y POSTGRES_PORT=5432 en el entorno protegido.
# Inicia los servicios en el orden de docker-compose.yml para ejecutar Flyway.
```

---

## 8. Operación y mantenimiento

| Acción | Comando |
|---|---|
| Ver estado | `docker compose ps` |
| Logs de un servicio | `docker compose logs -f ventas-service` |
| Actualizar versión | `git pull && docker compose --parallel 1 build && docker compose up -d` |
| Reiniciar stack | `docker compose restart` |
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
| 2 | `docker-compose.yml` con orden por healthchecks | ✅ Listo (+ puertos corregidos) | Ninguna
| 3 | `.env` productivo | ⚠️ Falta crearlo | `cp .env.example .env` + secretos fuertes (§1.2) |
| 4 | Esquema de BD automático | ✅ Resuelto | Las migraciones Flyway de cada servicio crean y actualizan sus tablas (§1.4)
| 5 | Puertos internos expuestos (8761/8888/5433/15672/909x) | ✅ Resuelto | Solo el frontend se publica en 80; el gateway y PostgreSQL se enlazan a localhost
| 6 | Memoria JVM vs. instancia 4 GB | ✅ Mitigado | `JAVA_TOOL_OPTIONS` añadido; aun así vigilar con `docker stats`
| 7 | URL API del frontend prod | ✅ OK (`/api` relativo + proxy nginx) | Ninguna |
| 8 | HTTPS/dominio | ⚠️ Opcional pero recomendado | Caddy + Route 53/DuckDNS (§6) |
| 9 | Usuarios de demostración | ✅ Deshabilitados | Crear y usar una cuenta administrativa propia |
| 10 | Repo accesible desde la instancia | ⚠️ Verificar | Subir a GitHub/GitLab o copiar por `scp` (§5.1) |
| 11 | SUNAT producción | ✅ No necesario | Dejar `SUNAT_ENVIRONMENT=BETA` para la demo |

**Ruta mínima de despliegue:** crear `.env` con secretos únicos y protegidos, subir el repo y configurar HTTPS si corresponde. No hay cuentas administrativas con credenciales de demostración; registrar una cuenta propia.

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
