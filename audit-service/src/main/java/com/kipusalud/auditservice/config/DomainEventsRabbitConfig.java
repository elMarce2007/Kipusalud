package com.kipusalud.auditservice.config;

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
    public static final String AUDIT_QUEUE = "kipusalud.audit.domain-events";
    public static final String AUDIT_DLQ = AUDIT_QUEUE + ".dlq";
    private static final String AUDIT_DLQ_KEY = "audit.domain-events.dead";

    @Bean
    TopicExchange domainEventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    DirectExchange domainEventsDeadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE, true, false);
    }

    @Bean
    Queue auditEventsQueue() {
        return QueueBuilder.durable(AUDIT_QUEUE)
                .deadLetterExchange(DEAD_LETTER_EXCHANGE)
                .deadLetterRoutingKey(AUDIT_DLQ_KEY)
                .build();
    }

    @Bean
    Queue auditEventsDeadLetterQueue() {
        return QueueBuilder.durable(AUDIT_DLQ).build();
    }

    @Bean
    Binding auditAllEventsBinding(
            @Qualifier("auditEventsQueue") Queue auditEventsQueue,
            @Qualifier("domainEventsExchange") TopicExchange domainEventsExchange) {
        return BindingBuilder.bind(auditEventsQueue).to(domainEventsExchange).with("#");
    }

    @Bean
    Binding auditEventsDeadLetterBinding(
            @Qualifier("auditEventsDeadLetterQueue") Queue auditEventsDeadLetterQueue,
            @Qualifier("domainEventsDeadLetterExchange") DirectExchange domainEventsDeadLetterExchange) {
        return BindingBuilder.bind(auditEventsDeadLetterQueue).to(domainEventsDeadLetterExchange)
                .with(AUDIT_DLQ_KEY);
    }
}
