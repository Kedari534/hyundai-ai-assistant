package com.cyepro.hyundai.document.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {

    @Bean
    public BrochureStorage brochureStorage(
            @Value("${app.storage.mode:local}") String mode,
            @Value("${app.storage.local-dir:uploads}") String localDir,
            @Value("${app.supabase.url:}") String supabaseUrl,
            @Value("${app.supabase.service-role-key:}") String serviceRoleKey,
            @Value("${app.supabase.storage-bucket:brochures}") String bucket) {
        if ("supabase".equalsIgnoreCase(mode)) {
            return new SupabaseBrochureStorage(supabaseUrl, serviceRoleKey, bucket);
        }
        return new LocalBrochureStorage(localDir);
    }
}
