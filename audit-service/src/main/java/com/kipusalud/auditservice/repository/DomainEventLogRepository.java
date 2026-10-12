package com.kipusalud.auditservice.repository;

import com.kipusalud.auditservice.entity.DomainEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface DomainEventLogRepository extends JpaRepository<DomainEventLog, UUID> {
    @Modifying
    @Query(value = """
            insert into domain_event_log(event_id, event_type, farmacia_id, aggregate_id, occurred_at, actor, payload)
            values (:eventId, :eventType, :farmaciaId, :aggregateId, :occurredAt, :actor, cast(:payload as jsonb))
            on conflict (event_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("eventId") UUID eventId,
            @Param("eventType") String eventType,
            @Param("farmaciaId") Long farmaciaId,
            @Param("aggregateId") Long aggregateId,
            @Param("occurredAt") Instant occurredAt,
            @Param("actor") String actor,
            @Param("payload") String payload);
}
