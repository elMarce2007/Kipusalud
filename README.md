# KipuSalud

Sistema web de gestión de farmacias: Angular en el navegador y servicios Spring
Boot independientes, comunicados por un API Gateway, Eureka, HTTP interno y
RabbitMQ. La persistencia está separada por servicio. El repositorio incluye
Docker Compose para desarrollo y el despliegue EC2; el entorno AWS actual usa
Aurora PostgreSQL.

## Para empezar

- [Guía de traspaso técnico para otra LLM](docs/guia-tecnica-llm.md) — punto de
  entrada recomendado; explica fuentes de verdad, estado y orden de lectura.
- [Arquitectura y tecnología](docs/arquitectura-tecnica.md)
- [Referencia de API](docs/referencia-api.md)
- [Modelo de datos y migraciones](docs/modelo-datos.md)
- [Ejecución, configuración y AWS](docs/operaciones.md)
- [Estructura AWS EC2 + Aurora/RDS para agentes](docs/infraestructura-aws.md)
- [Documentación de emisión electrónica SUNAT](docs/sunat-electronic-invoicing.md)
- [Guía de despliegue AWS histórica](docs/guia-despliegue-aws.md)
- [Bitácora de troubleshooting de conexión](docs/troubleshooting-snackbar-conexion.md)
- [Entregables académicos y casos de uso](docs/entregables-uml-kipusalud.md)

## Requisitos para desarrollo local

- Java 17 y Maven; Docker con Docker Compose.
- Node.js compatible con Angular CLI 21 y npm para el frontend.
- Copiar `.env.example` a `.env` y completar los secretos localmente. Nunca
  compartir ni versionar `.env`.

Desde la raíz:

```bash
mvn test
docker compose up -d --build
```

Para desarrollo separado del frontend:

```bash
cd frontend
npm ci
npm start
```

El frontend de desarrollo usa `http://localhost:8080/api`. Consulta
[operaciones](docs/operaciones.md) antes de usar Compose, modificar datos o
interactuar con AWS.

## GitHub

Repositorio privado `elMarce2007/Kipusalud`; rama principal `main`. La
documentación técnica refleja una inspección del árbol en el commit `7dd684f`;
confirma siempre `git status`, `git log` y el estado del servidor antes de
continuar cambios.
