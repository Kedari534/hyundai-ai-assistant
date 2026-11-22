package com.cyepro.hyundai.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public health check endpoint — no authentication required.
 *
 * Used by:
 * - UptimeRobot / cron-job.org to keep the backend awake (free-tier sleep prevention)
 * - Deployment pipeline smoke tests
 * - Frontend "API status" indicator
 *
 * Returns 200 when healthy, 503 when DB is unreachable.
 */
@Slf4j
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.application.name}")
    private String appName;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "UP");
        status.put("app", appName);
        status.put("version", "1.0.0");
        status.put("timestamp", Instant.now().toString());

        // Check DB connectivity
        String dbStatus;
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            dbStatus = "UP";
        } catch (Exception e) {
            log.error("Health check: DB connection failed", e);
            dbStatus = "DOWN";
            status.put("status", "DEGRADED");
        }
        status.put("db", dbStatus);

        int httpStatus = "DOWN".equals(dbStatus) ? 503 : 200;
        return ResponseEntity.status(httpStatus).body(status);
    }
}
