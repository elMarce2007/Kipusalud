FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app

COPY pom.xml /app/pom.xml
COPY security-core/pom.xml /app/security-core/pom.xml
COPY security-core/src /app/security-core/src
RUN mvn -f /app/pom.xml install -N -DskipTests --no-transfer-progress && \
    mvn -f /app/security-core/pom.xml install -DskipTests --no-transfer-progress

COPY cliente-service/pom.xml /app/cliente-service/pom.xml
RUN mvn -f /app/cliente-service/pom.xml dependency:go-offline -DskipTests --no-transfer-progress

COPY cliente-service/src /app/cliente-service/src
RUN mvn -f /app/cliente-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/cliente-service/target/*.jar app.jar
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8082/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]