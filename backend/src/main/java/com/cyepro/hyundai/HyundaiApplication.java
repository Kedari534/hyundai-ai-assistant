package com.cyepro.hyundai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

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
        SpringApplication.run(HyundaiApplication.class, args);
        log.info("==============================================");
        log.info("  Hyundai AI Assistant started successfully");
        log.info("  API: http://localhost:8080/api/health");
        log.info("==============================================");
    }
}
