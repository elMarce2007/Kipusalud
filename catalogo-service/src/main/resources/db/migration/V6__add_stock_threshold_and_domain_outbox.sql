ALTER TABLE productos
    ADD COLUMN stock_minimo INTEGER NOT NULL DEFAULT 0;

ALTER TABLE productos
    ADD CONSTRAINT chk_productos_stock_minimo_nonnegative CHECK (stock_minimo >= 0);

CREATE TABLE domain_outbox (
    event_id UUID PRIMARY KEY,
    routing_key VARCHAR(120) NOT NULL,
    payload TEXT NOT NULL,
    dedupe_key VARCHAR(200) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_catalogo_domain_outbox_pending
    ON domain_outbox (created_at)
    WHERE published_at IS NULL;

CREATE TABLE processed_domain_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
