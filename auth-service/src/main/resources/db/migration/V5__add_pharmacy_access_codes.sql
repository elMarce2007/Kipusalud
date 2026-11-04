ALTER TABLE farmacias ADD COLUMN codigo VARCHAR(41);

UPDATE farmacias
SET codigo = 'KIPU-' || UPPER(gen_random_uuid()::TEXT);

ALTER TABLE farmacias ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE farmacias ADD CONSTRAINT uk_farmacias_codigo UNIQUE (codigo);
