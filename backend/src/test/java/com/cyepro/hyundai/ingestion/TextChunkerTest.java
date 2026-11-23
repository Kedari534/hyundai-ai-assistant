package com.cyepro.hyundai.ingestion;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TextChunkerTest {

    private final TextChunker chunker = new TextChunker(200, 20);

    @Test
    void keepsASpecListAsOneChunk() {
        String page = """
                Engine
                - Displacement: 1482 cc
                - Max Power: 160 PS
                - Max Torque: 253 Nm
                """;
        List<ChunkDraft> chunks = chunker.chunk(List.of(new PageText(2, page)));
        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0).pageNumber()).isEqualTo(2);
        assertThat(chunks.get(0).text()).contains("1482 cc").contains("253 Nm");
    }

    @Test
    void recordsThePageNumberForEachPiece() {
        String page = "A".repeat(500);
        List<ChunkDraft> chunks = chunker.chunk(List.of(new PageText(4, page)));
        assertThat(chunks).hasSizeGreaterThan(1);
        assertThat(chunks).allMatch(chunk -> chunk.pageNumber() == 4);
    }
}
