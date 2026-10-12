ALTER TABLE personal ADD COLUMN farmacia_id BIGINT DEFAULT 1;
UPDATE personal SET farmacia_id = 1 WHERE farmacia_id IS NULL;
ALTER TABLE personal ALTER COLUMN farmacia_id SET NOT NULL;
ALTER TABLE personal ALTER COLUMN farmacia_id DROP DEFAULT;

CREATE INDEX idx_personal_farmacia ON personal(farmacia_id);
