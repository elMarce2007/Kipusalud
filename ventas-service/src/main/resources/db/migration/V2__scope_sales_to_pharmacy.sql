ALTER TABLE ventas ADD COLUMN farmacia_id BIGINT DEFAULT 1;
UPDATE ventas SET farmacia_id = 1 WHERE farmacia_id IS NULL;
ALTER TABLE ventas ALTER COLUMN farmacia_id SET NOT NULL;
ALTER TABLE ventas ALTER COLUMN farmacia_id DROP DEFAULT;

CREATE INDEX idx_ventas_farmacia_fecha ON ventas(farmacia_id, fecha DESC);
CREATE INDEX idx_ventas_farmacia_cliente ON ventas(farmacia_id, cliente_id);
