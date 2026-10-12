FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app

COPY pom.xml /app/pom.xml
COPY security-core/pom.xml /app/security-core/pom.xml
COPY security-core/src /app/security-core/src
RUN mvn -f /app/pom.xml install -N -DskipTests --no-transfer-progress && \
    mvn -f /app/security-core/pom.xml install -DskipTests --no-transfer-progress

COPY auth-service/pom.xml /app/auth-service/pom.xml
RUN mvn -f /app/auth-service/pom.xml dependency:go-offline -DskipTests --no-transfer-progress

COPY auth-service/src /app/auth-service/src
RUN mvn -f /app/auth-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/auth-service/target/*.jar app.jar
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8081/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]