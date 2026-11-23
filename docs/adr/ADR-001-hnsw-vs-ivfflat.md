# ADR-001: HNSW over IVFFlat for pgvector Index

**Date:** 2026-11-22  
**Status:** Accepted  
**Decision Makers:** Architect, AI/RAG Engineer

## Context

We need an approximate nearest-neighbor (ANN) index on the `document_chunks.embedding` column (`vector(1536)`). pgvector supports two options: HNSW and IVFFlat.

`gemini-embedding-001` defaults to 3072 dimensions. pgvector 0.7+ still refuses an HNSW or IVFFlat index on the `vector` type above 2000 dimensions (Supabase documents this). A `halfvec` expression index can cover 3072, but every query must repeat the cast. We store a 1536-dimension prefix, which Google lists as a recommended size, and L2-normalize it in application code because this model only pre-normalizes the full 3072 vector.

## Decision

**Use HNSW** (`CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`).

## Rationale

| Factor | HNSW | IVFFlat |
|---|---|---|
| Dynamic inserts | ✅ Handled without rebuild | ❌ Stale clusters after inserts |
| Build time | Slower | Faster |
| Memory | Higher | Lower |
| Recall (out-of-box) | >95% | Needs tuning |
| Operational complexity | Low | High (periodic rebuilds) |

Our dataset is dynamic (brochures uploaded/deleted throughout app lifetime). IVFFlat requires a full index rebuild when new data shifts the cluster distribution. HNSW's logarithmic graph traversal handles incremental updates natively.

At our scale (5–500 brochures, up to ~20k chunks), HNSW's memory overhead is acceptable on Render's 512MB free tier.

## Parameters

```sql
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

- `m = 16`: connections per node (default; good balance of recall and memory)  
- `ef_construction = 64`: build-time exploration factor (default)  
- `vector_cosine_ops`: cosine distance, standard for normalized text embeddings

## Consequences

- Higher RAM usage than IVFFlat (~2–5× raw vector size in RAM for the graph)
- No index rebuild needed when brochures are added or reprocessed
- Consistent >95% recall without parameter tuning
