package com.kipusalud.ventasservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.security.events.DomainEvent;
import com.kipusalud.ventasservice.repository.ProcessedDomainEventRepository;
import com.kipusalud.ventasservice.socket.SocketNotificationServer;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class SaleNotificationListener {
    private final ObjectMapper objectMapper;
    private final SocketNotificationServer notifications;
    private final ProcessedDomainEventRepository processedEvents;

    public SaleNotificationListener(
            ObjectMapper objectMapper, SocketNotificationServer notifications,
            ProcessedDomainEventRepository processedEvents) {
        this.objectMapper = objectMapper;
        this.notifications = notifications;
        this.processedEvents = processedEvents;
    }

    @RabbitListener(queues = "kipusalud.sales.notifications")
    @Transactional
    public void handle(String payload) throws Exception {
        DomainEvent event = objectMapper.readValue(payload, DomainEvent.class);
        if (event.eventId() == null || event.farmaciaId() == null || event.aggregateId() == null
                || !"venta.confirmada".equals(event.eventType())) {
            throw new IllegalArgumentException("El evento de venta no cumple el contrato esperado");
        }
        if (processedEvents.insertIfAbsent(UUID.fromString(event.eventId())) == 1) {
            notifications.notificar("Se registró una venta nueva.");
        }
    }
}
