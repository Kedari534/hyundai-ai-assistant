package com.cyepro.hyundai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for the PDF ingestion pipeline.
 *
 * WHY a dedicated thread pool?
 * - Spring's default @Async executor is unbounded — it can spin up
 *   unlimited threads, overwhelming a 512MB free-tier container.
 * - We cap at 2 ingestion threads (one at a time is fine for a demo;
 *   2 allows some concurrency without OOM).
 * - Queue capacity 10 means we can queue up to 10 uploads before
 *   rejecting with a friendly error.
 */
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Bean(name = "ingestionExecutor")
    public Executor ingestionExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);        // 1 thread always ready
        executor.setMaxPoolSize(2);         // allow burst of 2 concurrent ingestions
        executor.setQueueCapacity(10);      // queue up to 10 uploads
        executor.setThreadNamePrefix("ingestion-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);  // graceful shutdown
        executor.initialize();
        return executor;
    }

    @Bean(name = "chatExecutor")
    public Executor chatExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("chat-");
        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return ingestionExecutor();
    }
}
