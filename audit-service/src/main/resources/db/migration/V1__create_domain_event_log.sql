CREATE TABLE domain_event_log (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(120) NOT NULL,
    farmacia_id BIGINT NOT NULL,
    aggregate_id BIGINT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    actor VARCHAR(120),
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_event_log_tenant_time
    ON domain_event_log (farmacia_id, occurred_at DESC);

CREATE INDEX idx_domain_event_log_tenant_type_time
    ON domain_event_log (farmacia_id, event_type, occurred_at DESC);
