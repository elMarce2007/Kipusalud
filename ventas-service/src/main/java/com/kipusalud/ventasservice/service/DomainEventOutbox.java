package com.kipusalud.ventasservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.security.TenantContext;
import com.kipusalud.security.events.DomainEvent;
import com.kipusalud.ventasservice.entity.DomainOutboxEvent;
import com.kipusalud.ventasservice.repository.DomainOutboxRepository;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class DomainEventOutbox {
    static final String EXCHANGE = "kipusalud.domain.events";

    private final DomainOutboxRepository repository;
    private final ObjectMapper objectMapper;
    private final RabbitTemplate rabbitTemplate;

    public DomainEventOutbox(
            DomainOutboxRepository repository, ObjectMapper objectMapper, RabbitTemplate rabbitTemplate) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public void record(String eventType, Long aggregateId, String dedupeKey, Map<String, Object> data) {
        UUID eventId = UUID.randomUUID();
        DomainEvent event = new DomainEvent(eventId.toString(), eventType, TenantContext.requireFarmaciaId(),
                aggregateId, Instant.now(), TenantContext.requireUsername(), data);
        try {
            repository.save(new DomainOutboxEvent(eventId, eventType, objectMapper.writeValueAsString(event),
                    dedupeKey, Instant.now()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el evento de dominio " + eventType, e);
        }
    }

    @Scheduled(fixedDelayString = "${kipusalud.events.outbox-poll-ms:1000}")
    @Transactional
    public void publishPending() {
        List<DomainOutboxEvent> pending = repository.findPendingForUpdate(PageRequest.of(0, 20));
        for (DomainOutboxEvent event : pending) {
            try {
                CorrelationData correlation = new CorrelationData(event.getEventId().toString());
                rabbitTemplate.convertAndSend(EXCHANGE, event.getRoutingKey(), event.getPayload(), correlation);
                CorrelationData.Confirm confirm = correlation.getFuture().get(5, TimeUnit.SECONDS);
                if (!confirm.isAck()) {
                    throw new IllegalStateException("RabbitMQ no confirmó el evento: " + confirm.getReason());
                }
                if (correlation.getReturned() != null) {
                    throw new IllegalStateException("RabbitMQ aceptó el evento, pero ninguna cola lo recibió");
                }
                event.setPublishedAt(Instant.now());
                repository.save(event);
            } catch (Exception e) {
                throw new IllegalStateException(
                        "No se pudo publicar el evento " + event.getEventId() + "; permanece en el outbox", e);
            }
        }
    }
}
