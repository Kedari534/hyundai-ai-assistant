package com.cyepro.hyundai.ingestion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Turns brochure text and questions into the same 1536-number space.
 * If Gemini returns the full 3072 values, the first 1536 are the
 * Matryoshka prefix. We always normalize before cosine search.
 */
@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);

    private final EmbeddingModel embeddingModel;
    private final String apiKey;

    public EmbeddingService(
            EmbeddingModel embeddingModel,
            @Value("${spring.ai.google.genai.api-key:}") String apiKey) {
        this.embeddingModel = embeddingModel;
        this.apiKey = apiKey;
    }

    public float[] embed(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IngestionException("GOOGLE_AI_API_KEY is not configured, so the brochure cannot be indexed.");
        }
        String input = text == null ? "" : text.strip();
        if (input.length() > 8000) {
            input = input.substring(0, 8000);
        }
        float[] raw = embeddingModel.embed(input);
        if (raw.length != EmbeddingDimensions.WIDTH) {
            log.info("Embedding width was {}. Using the first {} values.", raw.length, EmbeddingDimensions.WIDTH);
        }
        return VectorMath.fitAndNormalize(raw, EmbeddingDimensions.WIDTH);
    }
}
