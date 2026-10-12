package com.kipusalud.ventasservice.config;

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
    public static final String SALES_NOTIFICATIONS_QUEUE = "kipusalud.sales.notifications";
    public static final String SALES_NOTIFICATIONS_DLQ = SALES_NOTIFICATIONS_QUEUE + ".dlq";
    private static final String SALES_NOTIFICATIONS_DLQ_KEY = "sales.notifications.dead";

    @Bean
    TopicExchange domainEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    DirectExchange domainEventsDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    Queue salesNotificationsQueue() {
        return QueueBuilder.durable(SALES_NOTIFICATIONS_QUEUE)
                .deadLetterExchange(DEAD_LETTER_EXCHANGE)
                .deadLetterRoutingKey(SALES_NOTIFICATIONS_DLQ_KEY)
                .build();
    }

    @Bean
    Queue salesNotificationsDeadLetterQueue() {
        return QueueBuilder.durable(SALES_NOTIFICATIONS_DLQ).build();
    }

    @Bean
    Binding saleConfirmedBinding(
            @Qualifier("salesNotificationsQueue") Queue salesNotificationsQueue,
            @Qualifier("domainEventsExchange") TopicExchange domainEventsExchange) {
        return BindingBuilder.bind(salesNotificationsQueue).to(domainEventsExchange).with("venta.confirmada");
    }

    @Bean
    Binding salesNotificationsDeadLetterBinding(
            @Qualifier("salesNotificationsDeadLetterQueue") Queue salesNotificationsDeadLetterQueue,
            @Qualifier("domainEventsDeadLetterExchange") DirectExchange domainEventsDeadLetterExchange) {
        return BindingBuilder.bind(salesNotificationsDeadLetterQueue).to(domainEventsDeadLetterExchange)
                .with(SALES_NOTIFICATIONS_DLQ_KEY);
    }
}
