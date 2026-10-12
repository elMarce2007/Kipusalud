ALTER TABLE detalle_ventas
    ADD COLUMN nombre_producto VARCHAR(150),
    ADD COLUMN afectacion_igv VARCHAR(20),
    ADD COLUMN precio_incluye_igv BOOLEAN;
