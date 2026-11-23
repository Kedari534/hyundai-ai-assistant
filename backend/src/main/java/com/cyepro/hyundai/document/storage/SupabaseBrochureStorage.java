package com.cyepro.hyundai.document.storage;

import com.cyepro.hyundai.common.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Stores original PDFs in Supabase Storage. Free Java hosts delete the
 * local filesystem on restart, so the file has to live somewhere else.
 */
public class SupabaseBrochureStorage implements BrochureStorage {

    private static final Logger log = LoggerFactory.getLogger(SupabaseBrochureStorage.class);

    private final RestClient client;
    private final String bucket;

    public SupabaseBrochureStorage(String supabaseUrl, String serviceRoleKey, String bucket) {
        if (supabaseUrl == null || supabaseUrl.isBlank() || serviceRoleKey == null || serviceRoleKey.isBlank()) {
            throw new BusinessException(
                    "Supabase storage is selected but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
        this.bucket = bucket;
        this.client = RestClient.builder()
                .baseUrl(trimSlash(supabaseUrl) + "/storage/v1")
                .defaultHeader("Authorization", "Bearer " + serviceRoleKey)
                .defaultHeader("apikey", serviceRoleKey)
                .build();
    }

    @Override
    public void save(String path, byte[] bytes) {
        try {
            client.post()
                    .uri("/object/{bucket}/{path}", bucket, path)
                    .header("x-upsert", "true")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(bytes)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            log.error("Supabase upload failed: {}", ex.getStatusCode());
            throw new BusinessException("The brochure could not be stored.", HttpStatus.BAD_GATEWAY);
        }
    }

    @Override
    public byte[] read(String path) {
        try {
            byte[] body = client.get()
                    .uri("/object/{bucket}/{path}", bucket, path)
                    .retrieve()
                    .body(byte[].class);
            if (body == null) {
                throw new BusinessException("The brochure file is missing from storage.", HttpStatus.NOT_FOUND);
            }
            return body;
        } catch (RestClientResponseException ex) {
            throw new BusinessException("The brochure file is missing from storage.", HttpStatus.NOT_FOUND);
        }
    }

    @Override
    public void delete(String path) {
        try {
            client.delete()
                    .uri("/object/{bucket}/{path}", bucket, path)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            log.warn("Supabase delete failed for {}: {}", path, ex.getStatusCode());
        }
    }

    private static String trimSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
