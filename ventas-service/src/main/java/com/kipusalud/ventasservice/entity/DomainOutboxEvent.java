package com.kipusalud.ventasservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "domain_outbox")
public class DomainOutboxEvent {
    @Id
    private UUID eventId;

    @Column(name = "routing_key", nullable = false, length = 120)
    private String routingKey;

    @Column(nullable = false, columnDefinition = "text")
    private String payload;

    @Column(name = "dedupe_key", unique = true, length = 200)
    private String dedupeKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    protected DomainOutboxEvent() {}

    public DomainOutboxEvent(UUID eventId, String routingKey, String payload, String dedupeKey, Instant createdAt) {
        this.eventId = eventId;
        this.routingKey = routingKey;
        this.payload = payload;
        this.dedupeKey = dedupeKey;
        this.createdAt = createdAt;
    }

    public UUID getEventId() { return eventId; }
    public String getRoutingKey() { return routingKey; }
    public String getPayload() { return payload; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant publishedAt) { this.publishedAt = publishedAt; }
}
