# ADR-002: Asynchronous PDF Ingestion

**Date:** 2026-11-22  
**Status:** Accepted

## Context

PDF ingestion involves: text extraction (PDFBox), chunking, N×API calls to `gemini-embedding-001`, and N×DB inserts. For a 100-page brochure with ~200 chunks, this takes 30–90 seconds.

## Decision

**Asynchronous ingestion** using Spring `@Async` with a dedicated thread pool.

## Flow

1. `POST /api/documents` validates file, stores to Supabase Storage, saves DB row (`status=UPLOADED`), returns `202 Accepted` immediately.
2. `IngestionOrchestrator` (`@Async`) picks up the document ID, sets `status=PROCESSING`, runs the full pipeline.
3. On success: `status=COMPLETED`, `chunksCount`, `processedAt` updated.
4. On failure: `status=FAILED`, `errorMessage` set.
5. Frontend polls `GET /api/documents/{id}/status` every 3 seconds, animates the status badge.

## Rationale

- Blocking an HTTP thread for 90 seconds wastes server resources and triggers proxy timeouts (Render's proxy has a 30-second timeout for initial response).
- 202 Accepted is the correct HTTP semantics for "request accepted, processing deferred."
- Status polling is simple to implement and transparent to the user.

## Alternative Considered

**SSE for ingestion progress**: Would give real-time progress (page N of M). Rejected for MVP as it adds complexity; polling achieves the same UX result.

## Consequences

- Upload returns immediately — users see the document appear instantly with "Processing" status.
- Backend thread pool must be sized appropriately (2–4 threads for free tier).
- If the backend restarts during ingestion, in-flight documents stay `PROCESSING` forever → added startup recovery: on boot, set any `PROCESSING` documents to `FAILED` with message "Server restarted during processing. Please reprocess."
