package com.kipusalud.security.events;

import java.time.Instant;
import java.util.Map;

public record DomainEvent(
        String eventId,
        String eventType,
        Long farmaciaId,
        Long aggregateId,
        Instant occurredAt,
        String actor,
        Map<String, Object> data
) {}
