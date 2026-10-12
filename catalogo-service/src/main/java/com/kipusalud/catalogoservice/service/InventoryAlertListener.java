package com.kipusalud.catalogoservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kipusalud.catalogoservice.repository.ProcessedDomainEventRepository;
import com.kipusalud.catalogoservice.socket.SocketNotificationServer;
import com.kipusalud.security.events.DomainEvent;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Component
public class InventoryAlertListener {
    private final ObjectMapper objectMapper;
    private final SocketNotificationServer notifications;
    private final ProcessedDomainEventRepository processedEvents;

    public InventoryAlertListener(
            ObjectMapper objectMapper, SocketNotificationServer notifications,
            ProcessedDomainEventRepository processedEvents) {
        this.objectMapper = objectMapper;
        this.notifications = notifications;
        this.processedEvents = processedEvents;
    }

    @RabbitListener(queues = "kipusalud.catalogo.inventory-alerts")
    @Transactional
    public void handle(String payload) throws Exception {
        DomainEvent event = objectMapper.readValue(payload, DomainEvent.class);
        if (event.eventId() == null || event.farmaciaId() == null || event.aggregateId() == null
                || !Set.of("inventario.stock_bajo", "inventario.stock_recuperado", "inventario.vencimiento")
                .contains(event.eventType())) {
            throw new IllegalArgumentException("El evento de inventario no cumple el contrato esperado");
        }
        if (processedEvents.insertIfAbsent(UUID.fromString(event.eventId())) == 1) {
            notifications.notificar("Se actualizó una alerta de inventario.");
        }
    }
}
