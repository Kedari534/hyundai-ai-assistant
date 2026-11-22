-- ============================================================
-- V2: Create documents table
-- ============================================================

CREATE TABLE documents (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by       UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    original_filename VARCHAR(255) NOT NULL,
    display_name      VARCHAR(255) NOT NULL,
    vehicle_model     VARCHAR(100) NOT NULL,
    storage_path      VARCHAR(500) NOT NULL,
    storage_bucket    VARCHAR(100) NOT NULL DEFAULT 'brochures',
    file_size_bytes   BIGINT       NOT NULL,
    mime_type         VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    status            VARCHAR(20)  NOT NULL DEFAULT 'UPLOADED'
                                   CHECK (status IN ('UPLOADED','PROCESSING','COMPLETED','FAILED')),
    error_message     TEXT,
    total_pages       INTEGER,
    chunks_count      INTEGER,
    uploaded_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    processed_at      TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_status        ON documents (status);
CREATE INDEX idx_documents_vehicle_model ON documents (vehicle_model);
CREATE INDEX idx_documents_uploaded_by   ON documents (uploaded_by);
CREATE INDEX idx_documents_uploaded_at   ON documents (uploaded_at DESC);

COMMENT ON TABLE  documents              IS 'Hyundai PDF brochures uploaded for RAG ingestion';
COMMENT ON COLUMN documents.status       IS 'UPLOADED→PROCESSING→COMPLETED or FAILED';
COMMENT ON COLUMN documents.storage_path IS 'Supabase Storage object path, e.g. brochures/uuid/filename.pdf';
