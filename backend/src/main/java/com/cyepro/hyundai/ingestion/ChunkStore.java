package com.cyepro.hyundai.ingestion;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public class ChunkStore {

    private final JdbcTemplate jdbc;

    public ChunkStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void replace(UUID documentId, String documentName, String vehicleModel, List<StoredChunk> chunks) {
        jdbc.update("DELETE FROM document_chunks WHERE document_id = ?", documentId);
        jdbc.batchUpdate("""
                INSERT INTO document_chunks
                    (id, document_id, document_name, vehicle_model, page_number, chunk_index, content, embedding)
                VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS vector))
                """, chunks, chunks.size(), (ps, chunk) -> {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, documentId);
            ps.setString(3, documentName);
            ps.setString(4, vehicleModel);
            ps.setInt(5, chunk.pageNumber());
            ps.setInt(6, chunk.chunkIndex());
            ps.setString(7, chunk.text());
            ps.setString(8, VectorMath.toPgVector(chunk.embedding()));
        });
    }

    public record StoredChunk(int pageNumber, int chunkIndex, String text, float[] embedding) {}
}
