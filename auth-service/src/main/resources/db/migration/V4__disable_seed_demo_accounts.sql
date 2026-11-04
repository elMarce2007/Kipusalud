UPDATE usuarios
SET activo = FALSE
WHERE username IN (
    'admin',
    'farmaceutico1',
    'farmaceutico2',
    'cajero1',
    'cajero2',
    'supervisor1'
)
AND activo = TRUE;
