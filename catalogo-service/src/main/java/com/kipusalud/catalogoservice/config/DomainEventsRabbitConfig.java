package com.kipusalud.catalogoservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainEventsRabbitConfig {
    public static final String EXCHANGE = "kipusalud.domain.events";
    public static final String DEAD_LETTER_EXCHANGE = "kipusalud.domain.events.dead-letter";
    public static final String INVENTORY_ALERTS_QUEUE = "kipusalud.catalogo.inventory-alerts";
    public static final String INVENTORY_ALERTS_DLQ = INVENTORY_ALERTS_QUEUE + ".dlq";
    private static final String INVENTORY_ALERTS_DLQ_KEY = "catalogo.inventory-alerts.dead";

    @Bean
    TopicExchange domainEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    DirectExchange domainEventsDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    Queue inventoryAlertsQueue() {
        return QueueBuilder.durable(INVENTORY_ALERTS_QUEUE)
                .deadLetterExchange(DEAD_LETTER_EXCHANGE)
                .deadLetterRoutingKey(INVENTORY_ALERTS_DLQ_KEY)
                .build();
    }

    @Bean
    Queue inventoryAlertsDeadLetterQueue() {
        return QueueBuilder.durable(INVENTORY_ALERTS_DLQ).build();
    }

    @Bean
    Binding stockLowBinding(
            @Qualifier("inventoryAlertsQueue") Queue inventoryAlertsQueue,
            @Qualifier("domainEventsExchange") TopicExchange domainEventsExchange) {
        return BindingBuilder.bind(inventoryAlertsQueue).to(domainEventsExchange).with("inventario.stock_bajo");
    }

    @Bean
    Binding stockRecoveredBinding(
            @Qualifier("inventoryAlertsQueue") Queue inventoryAlertsQueue,
            @Qualifier("domainEventsExchange") TopicExchange domainEventsExchange) {
        return BindingBuilder.bind(inventoryAlertsQueue).to(domainEventsExchange).with("inventario.stock_recuperado");
    }

    @Bean
    Binding expiryAlertBinding(
            @Qualifier("inventoryAlertsQueue") Queue inventoryAlertsQueue,
            @Qualifier("domainEventsExchange") TopicExchange domainEventsExchange) {
        return BindingBuilder.bind(inventoryAlertsQueue).to(domainEventsExchange).with("inventario.vencimiento");
    }

    @Bean
    Binding inventoryAlertsDeadLetterBinding(
            @Qualifier("inventoryAlertsDeadLetterQueue") Queue inventoryAlertsDeadLetterQueue,
            @Qualifier("domainEventsDeadLetterExchange") DirectExchange domainEventsDeadLetterExchange) {
        return BindingBuilder.bind(inventoryAlertsDeadLetterQueue).to(domainEventsDeadLetterExchange)
                .with(INVENTORY_ALERTS_DLQ_KEY);
    }
}
