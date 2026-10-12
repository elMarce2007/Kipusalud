ALTER TABLE categorias ADD COLUMN farmacia_id BIGINT DEFAULT 1;
UPDATE categorias SET farmacia_id = 1 WHERE farmacia_id IS NULL;
ALTER TABLE categorias ALTER COLUMN farmacia_id SET NOT NULL;
ALTER TABLE categorias ALTER COLUMN farmacia_id DROP DEFAULT;

ALTER TABLE productos ADD COLUMN farmacia_id BIGINT DEFAULT 1;
UPDATE productos SET farmacia_id = 1 WHERE farmacia_id IS NULL;
ALTER TABLE productos ALTER COLUMN farmacia_id SET NOT NULL;
ALTER TABLE productos ALTER COLUMN farmacia_id DROP DEFAULT;

CREATE INDEX idx_categorias_farmacia ON categorias(farmacia_id);
CREATE INDEX idx_productos_farmacia ON productos(farmacia_id);
CREATE INDEX idx_productos_farmacia_categoria ON productos(farmacia_id, categoria_id);
