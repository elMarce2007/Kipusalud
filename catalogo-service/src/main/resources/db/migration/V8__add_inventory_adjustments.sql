-- Ajustes de stock (mermas, vencidos, daños, diferencias de conteo): se registran como
-- movimientos de tipo AJUSTE con su motivo. Columnas opcionales para no afectar a los
-- movimientos existentes (INGRESO, VENTA).
ALTER TABLE kipusalud_inventory.movimientos_inventario
    ADD COLUMN motivo VARCHAR(30),
    ADD COLUMN observacion VARCHAR(255);

CREATE INDEX idx_movimientos_farmacia_lote
    ON kipusalud_inventory.movimientos_inventario(farmacia_id, lote_id, creado_en);
