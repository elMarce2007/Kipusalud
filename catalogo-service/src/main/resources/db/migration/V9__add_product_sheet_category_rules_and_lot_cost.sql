-- Ficha del medicamento, condición de venta por categoría y costo unitario por lote.
-- Todo opcional para no afectar los datos existentes.

ALTER TABLE productos
    ADD COLUMN principio_activo VARCHAR(150),
    ADD COLUMN laboratorio VARCHAR(100),
    ADD COLUMN presentacion VARCHAR(100),
    ADD COLUMN registro_sanitario VARCHAR(30),
    ADD COLUMN codigo_barras VARCHAR(20),
    ADD COLUMN ubicacion VARCHAR(50);

-- El código de barras identifica un producto dentro de la farmacia.
CREATE UNIQUE INDEX uk_productos_farmacia_codigo_barras
    ON productos (farmacia_id, codigo_barras)
    WHERE codigo_barras IS NOT NULL;

ALTER TABLE categorias
    ADD COLUMN codigo_atc VARCHAR(10),
    ADD COLUMN condicion_venta VARCHAR(20) NOT NULL DEFAULT 'VENTA_LIBRE';

ALTER TABLE categorias
    ADD CONSTRAINT ck_categorias_condicion_venta
        CHECK (condicion_venta IN ('VENTA_LIBRE', 'RECETA', 'RECETA_RETENIDA'));

-- Costo de compra por unidad, para valorizar el inventario.
ALTER TABLE kipusalud_inventory.lotes
    ADD COLUMN costo_unitario NUMERIC(12, 4);

ALTER TABLE kipusalud_inventory.lotes
    ADD CONSTRAINT ck_lote_costo_unitario CHECK (costo_unitario IS NULL OR costo_unitario >= 0);
