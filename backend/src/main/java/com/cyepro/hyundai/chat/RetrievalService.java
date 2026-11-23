package com.cyepro.hyundai.chat;

import com.cyepro.hyundai.ingestion.EmbeddingService;
import com.cyepro.hyundai.ingestion.VectorMath;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RetrievalService {

    private static final int MAX_CONTEXT_CHARS = 14000;

    private final JdbcTemplate jdbc;
    private final EmbeddingService embeddings;
    private final int topK;
    private final double minSimilarity;

    public RetrievalService(JdbcTemplate jdbc,
                            EmbeddingService embeddings,
                            @Value("${app.rag.top-k:6}") int topK,
                            @Value("${app.rag.min-similarity:0.35}") double minSimilarity) {
        this.jdbc = jdbc;
        this.embeddings = embeddings;
        this.topK = topK;
        this.minSimilarity = minSimilarity;
    }

    public List<RetrievedChunk> retrieve(String question, VehicleQueryPlanner.RetrievalPlan plan) {
        float[] vector = embeddings.embed(question);
        String literal = VectorMath.toPgVector(vector);
        List<RetrievedChunk> found = new ArrayList<>();
        if (plan.vehicles().isEmpty()) {
            found.addAll(search(literal, null));
        } else {
            for (String vehicle : plan.vehicles()) {
                found.addAll(search(literal, vehicle));
            }
        }
        return trim(found);
    }

    private List<RetrievedChunk> search(String vectorLiteral, String vehicle) {
        String sql = """
                SELECT document_id, document_name, vehicle_model, page_number, content,
                       1 - (embedding <=> CAST(? AS vector)) AS similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                  AND (? IS NULL OR vehicle_model = ?)
                ORDER BY embedding <=> CAST(? AS vector)
                LIMIT ?
                """;
        List<RetrievedChunk> rows = jdbc.query(sql, (rs, row) -> new RetrievedChunk(
                rs.getObject("document_id", UUID.class),
                rs.getString("document_name"),
                rs.getString("vehicle_model"),
                rs.getInt("page_number"),
                rs.getString("content"),
                rs.getDouble("similarity")
        ), vectorLiteral, vehicle, vehicle, vectorLiteral, topK);
        return rows.stream().filter(chunk -> chunk.similarity() >= minSimilarity).toList();
    }

    private List<RetrievedChunk> trim(List<RetrievedChunk> chunks) {
        List<RetrievedChunk> kept = new ArrayList<>();
        int chars = 0;
        for (RetrievedChunk chunk : chunks) {
            if (chars + chunk.content().length() > MAX_CONTEXT_CHARS) {
                break;
            }
            kept.add(chunk);
            chars += chunk.content().length();
        }
        return kept;
    }
}
