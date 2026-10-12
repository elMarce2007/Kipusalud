ALTER TABLE clientes
    ADD COLUMN ruc VARCHAR(11),
    ADD COLUMN razon_social VARCHAR(150),
    ADD COLUMN direccion_fiscal VARCHAR(255);

CREATE INDEX idx_clientes_ruc_farmacia
    ON clientes (farmacia_id, ruc);
