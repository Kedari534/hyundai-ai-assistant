# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom first so dependency layer is cached
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source and build fat JAR (skip tests — they run in CI)
COPY src ./src
RUN mvn package -DskipTests -q

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the fat JAR from the build stage
COPY --from=build /app/target/hyundai-ai-assistant-1.0.0.jar app.jar

# Local uploads directory (used when APP_STORAGE_MODE=local)
RUN mkdir -p uploads && chown appuser:appgroup uploads

USER appuser

EXPOSE 8080

# JVM flags tuned for Render's free tier (512MB RAM)
ENTRYPOINT ["java", \
  "-Xmx400m", \
  "-Xms128m", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
