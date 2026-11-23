-- ============================================================
-- V3: Create document_chunks table with pgvector
--
-- WHY pgvector?
--   We store each text chunk's semantic embedding as a vector.
--   pgvector adds a native 'vector' column type to PostgreSQL and
--   provides cosine/L2/dot-product similarity operators + ANN indexes.
--
-- WHY HNSW index?
--   See docs/adr/ADR-001-hnsw-vs-ivfflat.md
--   Short: our data is dynamic (brochures added/deleted); HNSW
--   handles incremental inserts without rebuild. IVFFlat needs
--   full index rebuild when new vectors arrive.
--
-- CRITICAL: vector(1536) is the width we store.
--   gemini-embedding-001 can emit 3072, but pgvector refuses an HNSW
--   index on the vector type above 2000 dimensions.
--   We ask for 1536 (or keep the first 1536 values) and L2-normalize
--   in Java. 3072 is already normalized; a shortened vector is not.
--   Lock this width in EmbeddingDimensions.WIDTH as well.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;   -- enable pgvector

CREATE TABLE document_chunks (
    id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID     NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    page_number   INTEGER  NOT NULL,
    chunk_index   INTEGER  NOT NULL,
    content       TEXT     NOT NULL,
    -- gemini-embedding-001, shortened to 1536 so HNSW can index it
    embedding     vector(1536),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B-tree indexes for metadata filtering (used before vector search)
CREATE INDEX idx_chunks_document_id   ON document_chunks (document_id);
CREATE INDEX idx_chunks_vehicle_model ON document_chunks (vehicle_model);
CREATE INDEX idx_chunks_page_number   ON document_chunks (page_number);

-- HNSW index for approximate nearest-neighbor search
-- m=16: each node has 16 bidirectional connections (default, good balance)
-- ef_construction=64: exploration factor at build time (default)
-- vector_cosine_ops: use cosine distance (best for normalized text embeddings)
CREATE INDEX idx_chunks_embedding_hnsw ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE  document_chunks                IS 'Text chunks from PDF brochures with vector embeddings';
COMMENT ON COLUMN document_chunks.embedding      IS 'gemini-embedding-001 vector, dim=1536, L2-normalized, cosine similarity';
COMMENT ON COLUMN document_chunks.chunk_index    IS 'Position of this chunk within the document (0-based)';
