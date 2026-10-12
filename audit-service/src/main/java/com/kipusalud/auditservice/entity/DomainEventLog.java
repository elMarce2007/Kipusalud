package com.kipusalud.auditservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "domain_event_log")
public class DomainEventLog {
    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "event_type", nullable = false, length = 120)
    private String eventType;

    @Column(name = "farmacia_id", nullable = false)
    private Long farmaciaId;

    @Column(name = "aggregate_id", nullable = false)
    private Long aggregateId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(length = 120)
    private String actor;

    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    protected DomainEventLog() {}
}
