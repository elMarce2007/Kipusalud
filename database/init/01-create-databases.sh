#!/bin/bash
set -Eeuo pipefail

databases=(auth_db clientes_db catalogo_db ventas_db personal_db auditoria_db)

for database in "${databases[@]}"; do
  exists="$(
    psql \
      --username "$POSTGRES_USER" \
      --dbname postgres \
      --tuples-only \
      --no-align \
      --command "SELECT 1 FROM pg_database WHERE datname = '$database'"
  )"

  if [[ "$exists" != "1" ]]; then
    psql \
      --username "$POSTGRES_USER" \
      --dbname postgres \
      --command "CREATE DATABASE \"$database\""
  fi
done
