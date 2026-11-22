-- ============================================================
-- V5: Startup recovery — reset stuck PROCESSING documents
-- If the backend restarts mid-ingestion, documents get stuck in
-- PROCESSING forever. This migration (runs once at startup) is
-- NOT the right place for this. Instead we handle it in the
-- application startup hook. This migration adds a helper view.
-- ============================================================

-- View: documents with chunk counts (useful for admin queries)
CREATE OR REPLACE VIEW document_summary AS
SELECT
    d.id,
    d.display_name,
    d.vehicle_model,
    d.status,
    d.total_pages,
    COUNT(dc.id)         AS actual_chunk_count,
    d.chunks_count       AS recorded_chunk_count,
    d.uploaded_at,
    d.processed_at,
    u.email              AS uploaded_by_email
FROM documents d
LEFT JOIN document_chunks dc ON dc.document_id = d.id
LEFT JOIN users u ON u.id = d.uploaded_by
GROUP BY d.id, u.email;

COMMENT ON VIEW document_summary IS 'Admin view: documents with live chunk counts';
