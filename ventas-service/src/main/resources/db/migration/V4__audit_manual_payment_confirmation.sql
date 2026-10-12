ALTER TABLE ventas
    ADD COLUMN confirmacion_manual_pago BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN pago_confirmado_por VARCHAR(150),
    ADD COLUMN pago_confirmado_en TIMESTAMP;

ALTER TABLE ventas
    ALTER COLUMN confirmacion_manual_pago DROP DEFAULT;
