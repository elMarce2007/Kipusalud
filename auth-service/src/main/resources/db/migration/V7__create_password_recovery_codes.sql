-- Códigos de recuperación de contraseña de un solo uso. El administrador o el
-- gerente lo genera para un colaborador de su farmacia y se lo entrega en persona;
-- solo se guarda el hash del código.
CREATE TABLE codigos_recuperacion (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    farmacia_id BIGINT NOT NULL,
    codigo_hash VARCHAR(100) NOT NULL,
    intentos INTEGER NOT NULL DEFAULT 0,
    expira_en TIMESTAMPTZ NOT NULL,
    usado_en TIMESTAMPTZ,
    creado_por VARCHAR(50) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_codigos_recuperacion_intentos CHECK (intentos >= 0)
);

CREATE INDEX idx_codigos_recuperacion_usuario ON codigos_recuperacion (usuario_id, creado_en DESC);
