package com.cyepro.hyundai.ingestion;

public record ChunkDraft(int pageNumber, int chunkIndex, String text) {}
