package com.kipusalud.authservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "demo_sessions")
public class DemoSession {

    @Id
    private UUID id;

    @Column(name = "farmacia_id", nullable = false, unique = true)
    private Long farmaciaId;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    @Column(name = "expira_en", nullable = false)
    private Instant expiraEn;

    protected DemoSession() {}

    public DemoSession(UUID id, Long farmaciaId, Instant creadaEn, Instant expiraEn) {
        this.id = id;
        this.farmaciaId = farmaciaId;
        this.creadaEn = creadaEn;
        this.expiraEn = expiraEn;
    }

    public UUID getId() { return id; }
    public Long getFarmaciaId() { return farmaciaId; }
    public Instant getExpiraEn() { return expiraEn; }
}
