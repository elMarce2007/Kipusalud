-- Quién registró la venta y copia del cliente al momento de vender (nombre y documento),
-- para el historial, las "últimas ventas" y el comprobante aunque la ficha cambie después.
-- Columnas opcionales: las ventas anteriores quedan sin estos datos.
ALTER TABLE ventas
    ADD COLUMN registrado_por VARCHAR(150),
    ADD COLUMN cliente_nombre VARCHAR(200),
    ADD COLUMN cliente_documento VARCHAR(20);
-- El resumen por cliente usa el índice existente idx_ventas_farmacia_cliente (V2).
