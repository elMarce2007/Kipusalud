package com.kipusalud.auditservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.auditservice.repository.DomainEventLogRepository;
import com.kipusalud.security.events.DomainEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class DomainEventAuditService {
    private final DomainEventLogRepository repository;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public DomainEventAuditService(
            DomainEventLogRepository repository, ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public void record(DomainEvent event) {
        if (event.eventId() == null || event.farmaciaId() == null || event.aggregateId() == null
                || event.eventType() == null || event.occurredAt() == null || event.data() == null) {
            throw new IllegalArgumentException("El evento recibido no cumple el contrato de auditoría");
        }
        try {
            String payload = objectMapper.writeValueAsString(event.data());
            int inserted = repository.insertIfAbsent(UUID.fromString(event.eventId()), event.eventType(),
                    event.farmaciaId(), event.aggregateId(), event.occurredAt(), event.actor(), payload);
            if (inserted == 1) {
                meterRegistry.counter("kipusalud.domain.events.processed", "type", event.eventType()).increment();
            }
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el evento de auditoría", e);
        }
    }
}
