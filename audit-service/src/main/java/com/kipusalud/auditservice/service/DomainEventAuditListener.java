package com.kipusalud.auditservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.security.events.DomainEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class DomainEventAuditListener {
    private final ObjectMapper objectMapper;
    private final DomainEventAuditService auditService;

    public DomainEventAuditListener(ObjectMapper objectMapper, DomainEventAuditService auditService) {
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @RabbitListener(queues = "kipusalud.audit.domain-events")
    public void handle(String payload) throws Exception {
        auditService.record(objectMapper.readValue(payload, DomainEvent.class));
    }
}
