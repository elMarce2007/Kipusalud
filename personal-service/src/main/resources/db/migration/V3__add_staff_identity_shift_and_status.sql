-- Datos del colaborador: DNI, colegiatura (CQFP), teléfono, turno y estado.
-- Opcionales salvo el estado, que por defecto es activo.
ALTER TABLE personal
    ADD COLUMN dni VARCHAR(8),
    ADD COLUMN colegiatura VARCHAR(20),
    ADD COLUMN telefono VARCHAR(20),
    ADD COLUMN turno VARCHAR(20),
    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE personal
    ADD CONSTRAINT ck_personal_turno CHECK (turno IS NULL OR turno IN ('MANANA', 'TARDE', 'NOCHE', 'ROTATIVO'));

-- El DNI identifica a un colaborador dentro de la farmacia.
CREATE UNIQUE INDEX uk_personal_farmacia_dni ON personal (farmacia_id, dni) WHERE dni IS NOT NULL;
