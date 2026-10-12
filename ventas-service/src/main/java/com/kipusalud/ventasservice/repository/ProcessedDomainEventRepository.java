package com.kipusalud.ventasservice.repository;

import com.kipusalud.ventasservice.entity.ProcessedDomainEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ProcessedDomainEventRepository extends JpaRepository<ProcessedDomainEvent, UUID> {
    @Modifying
    @Query(value = """
            insert into processed_domain_events(event_id, processed_at)
            values (:eventId, CURRENT_TIMESTAMP)
            on conflict (event_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("eventId") UUID eventId);
}
