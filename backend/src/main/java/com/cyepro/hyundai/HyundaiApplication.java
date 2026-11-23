package com.cyepro.hyundai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Hyundai AI Assistant — entry point.
 *
 * @EnableAsync enables Spring's @Async support for the
 * ingestion pipeline (PDF processing happens in background threads).
 */
@Slf4j
@EnableAsync
@SpringBootApplication
public class HyundaiApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(HyundaiApplication.class, args);
        log.info("==============================================");
        log.info("  Hyundai AI Assistant started successfully");
        log.info("  API: http://localhost:8080/api/health");
        log.info("==============================================");
    }

    private static void loadDotEnv() {
        Path[] candidates = new Path[]{
                Path.of(".env"),
                Path.of("backend", ".env"),
                Path.of("..", "backend", ".env")
        };
        for (Path path : candidates) {
            if (Files.exists(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                            continue;
                        }
                        int eq = trimmed.indexOf('=');
                        String key = trimmed.substring(0, eq).trim();
                        String value = trimmed.substring(eq + 1).trim();
                        if (System.getenv(key) == null && System.getProperty(key) == null) {
                            System.setProperty(key, value);
                        }
                    }
                    log.info("Loaded environment variables from {}", path.toAbsolutePath());
                    break;
                } catch (IOException e) {
                    log.warn("Could not read .env from {}: {}", path, e.getMessage());
                }
            }
        }
    }
}
