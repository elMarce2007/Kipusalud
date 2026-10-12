ALTER TABLE ventas
    ADD COLUMN clave_idempotencia VARCHAR(100),
    ADD COLUMN huella_solicitud VARCHAR(64),
    ADD COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'HISTORICA';

ALTER TABLE ventas
    ALTER COLUMN estado DROP DEFAULT;

CREATE UNIQUE INDEX uq_ventas_farmacia_idempotencia
    ON ventas(farmacia_id, clave_idempotencia)
    WHERE clave_idempotencia IS NOT NULL;
