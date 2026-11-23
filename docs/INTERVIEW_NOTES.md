# Interview Notes — Hyundai AI Assistant

Technical Q&A covering architecture decisions, trade-offs, and "why" explanations.
Useful for walkthrough conversations, code reviews, and understanding the project deeply.

---

## Phase 1 — Architecture & Tech Stack

**Q1: Why Spring AI instead of LangChain4j or calling the Gemini API directly?**

Spring AI integrates naturally into the Spring ecosystem (Spring Boot auto-configuration, `@Service`, `@Autowired`).
It provides a vendor-neutral `ChatModel` and `EmbeddingModel` interface — if we ever switch from Gemini to OpenAI,
we change only one config property, not the application logic.
Calling the API directly would require writing our own HTTP client, error handling, retries, and streaming logic.
Spring AI gives all of that for free.

**Q2: Why pgvector with HNSW index instead of a dedicated vector DB like Pinecone or Weaviate?**

We already need PostgreSQL for user data and documents. Adding a second database (Pinecone) means:
- Two separate services to manage, pay for, and monitor
- Cross-service joins are impossible (can't JOIN pgvector results with user rows in Pinecone)
- More operational complexity

pgvector with HNSW gives ~90% of Pinecone's performance for our scale (thousands of chunks, not billions).
Free-tier Supabase includes both — perfect for a dealership product.

**Q3: Why 1536 dimensions instead of the full 3072 from Gemini?**

Three reasons:
1. pgvector's HNSW index has a hard limit of 2000 dimensions
2. `gemini-embedding-001` returns 3072 dimensions by default — too large for HNSW
3. Google designed `gemini-embedding-001` as a **Matryoshka embedding**: the first N values already capture
   the core semantic meaning. Truncating to 1536 and L2-normalizing gives 95%+ of the quality
   at half the storage and much faster HNSW build time

We also L2-normalize (make the vector length = 1) so that cosine similarity = dot product,
which HNSW can compute very fast.

---

## Phase 2 — Backend Scaffold & Database Migrations

**Q4: Why Flyway instead of Hibernate `ddl-auto: create` or `update`?**

`ddl-auto: create` drops and recreates tables on every restart — you lose all data.
`ddl-auto: update` tries to infer what changed and apply diffs — it often gets it wrong
(e.g., it can't rename a column, only add one).

Flyway uses versioned migration scripts (`V1__init.sql`, `V2__documents.sql`…).
Every migration runs exactly once, in order, and is never modified.
If you need to change the schema, you create a new migration.
This means: **the schema in production always matches the code**, and you have a full audit trail.

**Q5: Why use `baseline-on-migrate=true` with `baseline-version=0` for Supabase?**

Supabase's `public` schema is never completely empty — Supabase pre-creates internal tables.
Flyway treats any existing schema as "already has migrations applied" and fails with
"Found non-empty schema but no schema history table."

`baseline-on-migrate=true` tells Flyway: "this schema already existed; create a fake baseline entry
at version 0 and then run all my migrations starting from V1."
Setting `baseline-version=0` (not 1) ensures V1 is NOT skipped — all 6 migrations apply cleanly.

**Q6: Why is JWT stored in the Authorization header (Bearer token) instead of cookies?**

We're building an API-first backend that serves both a web SPA and potentially a mobile app.
HttpOnly cookies work well for same-origin requests but are complex for cross-origin APIs.
Bearer tokens in the Authorization header work universally (fetch, Axios, curl, Retrofit).
We mitigate XSS risk by keeping short expiry times (1 hour) and using refresh tokens (7 days)
that are rotated on use.

---

## Phase 3 — JWT Auth

**Q7: What is the difference between the access token and refresh token?**

The **access token** is short-lived (1 hour). It travels in every API request's
`Authorization: Bearer <token>` header. Because it's short-lived, a stolen token
expires quickly.

The **refresh token** is long-lived (7 days) and stored client-side. It is only sent
to the `/api/auth/refresh` endpoint to get a new access token. This separates
"proving who I am" (refresh) from "making API calls" (access), so the high-value
refresh token is transmitted much less frequently.

**Q8: Why BCrypt with strength 12 instead of SHA-256 or MD5?**

SHA-256 and MD5 are fast — which is bad for passwords, because an attacker can try
billions of guesses per second (brute force / rainbow tables).
BCrypt is intentionally slow: strength 12 means 2^12 = 4096 iterations.
An attacker who steals the hash database would need years to crack even simple passwords.
The slowness doesn't matter for login (one hash per login attempt by one user) but
is catastrophic for attackers (billions of guesses).

---

## Phase 4 — Frontend

**Q9: Why Vite 8 (Rolldown) instead of webpack or Create React App?**

Vite uses native ES modules in development — the browser imports files directly
without bundling. This makes hot-module replacement nearly instant (<100ms) vs
webpack's 3-10 second rebuilds.
Rolldown (Vite 8's production bundler, written in Rust) produces the smallest bundles
with the fastest build times. CRA is deprecated.

**Q10: Why Server-Sent Events (SSE) for chat streaming instead of WebSockets?**

WebSockets are bidirectional — necessary for real-time multiplayer apps, collaborative editing, etc.
Chat streaming is unidirectional: the user sends one message, the server streams back one response.
SSE is a simple HTTP response that keeps the connection open and sends `data:` lines.
SSE works through proxies, CDNs, and load balancers with zero special configuration.
WebSockets require special proxy support (Upgrade headers) and are overkill for this use case.

---

## Phase 5 — Document Ingestion Pipeline

**Q11: How does the ingestion pipeline work end-to-end?**

```
1. User uploads PDF via multipart POST /api/documents/upload
2. File saved to disk (dev) or Supabase Storage (prod) with a UUID filename
3. Document record created in DB with status = PENDING
4. IngestionOrchestrator.ingestAsync() runs on a separate thread pool (@Async)
5. PDFBox extracts text page by page
6. ChunkingService splits text at 1600-char boundaries with 200-char overlap
   (overlap prevents cutting a sentence mid-thought)
7. For each chunk: EmbeddingService calls gemini-embedding-001 → 3072-dim float[]
8. VectorMath.fitAndNormalize() truncates to 1536, L2-normalizes
9. DocumentChunk saved to document_chunks with the vector
10. Document status updated to COMPLETED (or FAILED with error message)
```

**Q12: Why chunk at 1600 characters with 200-character overlap?**

A chunk needs to be small enough to be semantically focused (one topic = one vector)
but large enough to contain a complete thought.
1600 characters ≈ 250–300 words ≈ a full paragraph or spec block.

Overlap solves the "edge problem": if a sentence about "engine torque" starts at the
end of chunk 1 and continues in chunk 2, without overlap, neither chunk fully captures it.
With 200-character overlap, both chunks include enough context.

**Q13: Why is ingestion done asynchronously?**

A large PDF with 50 pages might generate 100+ chunks. Each chunk requires one API call
to Gemini for embedding (and those calls have rate limits and latency).
If we did this synchronously during the HTTP request, the upload endpoint would take
60+ seconds to respond — the browser would time out.

Async ingestion returns immediately with `status: PENDING`, then the ingestion runs
in the background. The UI polls (or the user refreshes) until `status: COMPLETED`.

---

## Phase 6 — RAG Chat

**Q14: What is "grounding" and why does it prevent hallucinations?**

Grounding means: before calling the LLM, we build a prompt that contains the actual
text from the matching brochure chunks. The LLM's instruction says:
> "Answer ONLY using the context below. If the answer is not in the context, say 'Not available in the uploaded brochures.'"

The LLM doesn't use its training knowledge about Hyundai cars — it only reads the
provided context. This prevents:
- Making up specs for a model variant that doesn't exist in the brochures
- Confusing specifications from different model years

**Q15: What happens when the user asks about a vehicle not in any uploaded brochure?**

The RAG pipeline runs cosine similarity search. If no chunks score above 0.35 similarity,
`ChatService` skips the LLM entirely and returns the fixed string:
> "I'm sorry, but that information is not available in the uploaded brochures."

This is better than calling the LLM with no context — without context, the LLM would
either hallucinate from training data or refuse to answer. We skip the API call entirely,
saving cost and latency.

**Q16: How does the VehicleQueryPlanner work?**

It's a lightweight keyword-extraction layer that runs before vector search:
1. It detects vehicle names in the question ("Alcazar", "Creta", "i20")
2. It detects the query aspect ("engine", "safety", "price", "variants")
3. It detects if it's a comparison question (contains "vs", "compare", "versus")
4. It detects if it's a recommendation question ("recommend", "suggest", "which one")

The detected vehicles are used to narrow the vector search to only those vehicles' chunks.
This prevents irrelevant chunks from other vehicles polluting the context.

---

## Phase 7 — Live Database (Supabase + pgvector)

**Q17: Why local disk storage in dev but Supabase Storage in prod?**

In development, local disk is instant (no latency, no API calls, no costs).
In production on Render (free tier), the filesystem is **ephemeral** — every deploy
wipes the disk. If we stored files locally, every redeploy would lose all uploaded PDFs.

Supabase Storage is a persistent object store (like S3) backed by Supabase's
infrastructure. Files uploaded to it survive redeploys.
The `APP_STORAGE_MODE` env var switches between implementations — the application code
calls `StorageService` interface methods and doesn't know which backend is active.

**Q18: What is the Flyway baseline issue with Supabase and how was it fixed?**

Supabase pre-populates the `public` schema with its own internal tables.
Flyway's default behavior: if the schema isn't empty and there's no `flyway_schema_history` table,
it refuses to run (to protect against accidentally running migrations on a database that
already has user tables from a different source).

Fix: `baseline-on-migrate: true` with `baseline-version: "0"`:
- Flyway creates a fake entry in `flyway_schema_history` saying "version 0 is the baseline"
- Then it applies V1, V2, V3, V4, V5, V6 in order
- Future runs see that V1–V6 are already in history and skip them

**Q19: Why is `rating` stored as INTEGER but the original migration used SMALLINT?**

`SMALLINT` in PostgreSQL is a 2-byte integer (range -32768 to 32767).
`INTEGER` in PostgreSQL is a 4-byte integer.

Hibernate's `@Column` annotation on a Java `Integer` field generates DDL for `INTEGER`.
When Hibernate validates the schema (`ddl-auto: validate`), it found `int2` (Supabase's name
for SMALLINT) but expected `int4` (INTEGER) — schema validation failure.

The fix was:
1. `ALTER TABLE chat_messages ALTER COLUMN rating TYPE INTEGER;` on the live DB
2. Update `V6__message_rating.sql` from `SMALLINT` to `INTEGER` for future clean deployments

Since Flyway never re-runs a migration that's already in history, the ALTER was needed
for the existing column.

---

## Phase 8 — GitHub

**Q20: What should be in .gitignore for this project?**

Critical exclusions:
- `.env` / `*.env` — Never commit secrets (DB passwords, API keys, JWT secrets)
- `target/` — Maven build output (can be rebuilt from source)
- `node_modules/` — npm packages (can be restored with `npm install`)
- `dist/` — Vite production build output
- `uploads/` — User-uploaded files (not source code, potentially large)
- `.idea/`, `.vscode/` — IDE-specific config (team may use different editors)

---

## Phase 9 — Production Deployment

**Q21: Why Render for the backend and Cloudflare Pages for the frontend?**

Render's free tier supports:
- Always-on web services (after a cold start delay)
- Custom build and start commands
- Persistent environment variables
- Automatic HTTPS

Cloudflare Pages' free tier supports:
- 500 builds/month
- Unlimited bandwidth
- Global CDN edge delivery
- Unlimited static hosting

The combination gives zero hosting cost for a demo/portfolio project.
In production, Render's free tier has ~15 second cold starts after inactivity —
acceptable for a dealership demo, not for a 24/7 production SaaS.

**Q22: What is CORS and why is it configured as it is?**

CORS (Cross-Origin Resource Sharing) is a browser security policy.
When the frontend at `https://hyundai.pages.dev` calls the backend at `https://hyundai.onrender.com`,
the browser blocks the request unless the backend explicitly allows the frontend's origin
in its `Access-Control-Allow-Origin` response header.

We configure `CORS_ALLOWED_ORIGINS` to exactly match the Cloudflare Pages URL.
Using `*` (allow all origins) would let any website on the internet call our backend
using a logged-in user's credentials — a security vulnerability.

---

## General RAG Concepts

**Q23: What is RAG (Retrieval-Augmented Generation) and why not just fine-tune the LLM?**

**Fine-tuning** trains the LLM on your data, baking knowledge into its weights.
Problems:
- Expensive (GPU time, labeled training data)
- The model learns the data at a point in time — stale when the brochures change
- You need to retrain every time there's a new Hyundai model

**RAG** keeps the LLM's weights unchanged. Instead, it retrieves relevant text
from your documents at query time and passes it as context.
Advantages:
- Zero training cost — just embed and store
- Instantly up-to-date — upload a new brochure and it's searchable immediately
- Transparent — you can show users exactly which brochure page the answer came from
- Controllable — the LLM can't go "off-script" because it's told to answer only from context

For a dealership where brochures change with every model year, RAG is the correct choice.

**Q24: What is cosine similarity and why use it for semantic search?**

Two vectors (embeddings) represent two texts in a high-dimensional semantic space.
Cosine similarity measures the angle between them: 1.0 = identical meaning, 0.0 = unrelated.

We use cosine similarity because it's **direction-only** — the magnitude (length) of the
vector doesn't affect the score. After L2-normalizing all embeddings (making them unit vectors),
cosine similarity = dot product, which HNSW can compute in microseconds.

A score of 0.35 (our threshold) means "somewhat related" — below that, we reject the chunk
as not relevant enough to include in the LLM's context.
