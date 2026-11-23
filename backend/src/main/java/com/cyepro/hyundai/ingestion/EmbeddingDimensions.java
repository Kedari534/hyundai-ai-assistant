package com.cyepro.hyundai.ingestion;

/**
 * Stored embedding width. Must match the vector(1536) column in Flyway V3.
 * pgvector will not build an HNSW index on vector columns wider than 2000.
 */
public final class EmbeddingDimensions {

    public static final int WIDTH = 1536;

    private EmbeddingDimensions() {}
}
