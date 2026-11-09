CREATE TABLE demo_sessions (
    id UUID PRIMARY KEY,
    farmacia_id BIGINT NOT NULL UNIQUE,
    creada_en TIMESTAMPTZ NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_demo_sessions_farmacia
        FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
);

CREATE INDEX idx_demo_sessions_expiration ON demo_sessions(expira_en);
