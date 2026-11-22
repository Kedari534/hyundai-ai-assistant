# Interview Notes — Hyundai AI Assistant Project

> Updated after each phase. These are natural, conversational answers — not textbook definitions.

---

## Phase 1 — Architecture & Planning

### Topics You Should Be Able to Explain

- What RAG is and why we use it instead of a bare LLM
- The role of embeddings and vector databases in RAG
- Why HNSW was chosen over IVFFlat
- Why embedding dimension is critical (and what breaks if it mismatches)
- Why ingestion is asynchronous
- What Flyway does and why we use it
- What JWT is and why it's stateless

---

### Question 1: Why HNSW over IVFFlat?

**Natural answer:**

> "HNSW and IVFFlat are both ways to do fast approximate nearest-neighbor search in pgvector. I chose HNSW because our app continuously ingests new brochures — that means new vectors being added all the time. HNSW is a graph-based index that handles new inserts gracefully without needing a rebuild. IVFFlat splits vectors into k-means clusters at build time, and when new vectors arrive, those cluster boundaries go stale — you get silent accuracy drops until you drop and recreate the index. For our scale of maybe 50 brochures, HNSW's slightly higher memory use is totally fine, and we avoid the operational complexity of periodic index rebuilds."

---

### Question 2: How does RAG work? Why not just send the question to Gemini?

**Natural answer:**

> "RAG stands for Retrieval-Augmented Generation. If you just ask Gemini 'What is the Alcazar's boot space?', it'll answer from its training data — which might be wrong, outdated, or hallucinated. With RAG, we first convert the user's question into a vector using an embedding model. Then we search our pgvector database for the most semantically similar text chunks from the actual Hyundai brochures we uploaded. We pass those chunks as context to Gemini along with a strict instruction: 'Only answer from this context.' So Gemini is acting like a very smart reader of a specific document, not a free-form oracle. Every fact it states has a citation — 'Alcazar Brochure, page 12.' That's the whole point: grounded, verifiable answers."

---

### Question 3: What breaks if the embedding dimension doesn't match?

**Natural answer:**

> "An embedding is a fixed-length list of numbers representing the meaning of text. `gemini-embedding-001` by default outputs 3072 numbers. If I define the pgvector column as `vector(1536)`, every time we try to store a 3072-number vector, we either get a database error or silent truncation. Even worse — if we stored chunks with one model giving 1536-dim vectors and later switched the query to use 3072-dim vectors, the cosine similarity math completely breaks because you can't compare vectors of different sizes. It's like trying to find the angle between a 2D point and a 3D point — it's undefined. That's why we lock the dimension in the Flyway migration SQL AND in the Spring AI config, and we validate they match on startup."

---

*More questions will be added after each phase.*


---

## Phase 2 — Scaffolding, Spring Boot 3.4 + Spring AI 1.1.8, Database & Flyway

### Topics You Should Be Able to Explain

- How Spring AI dependencies interact with Spring Boot versions (Spring Framework 6 vs 7)
- Why Flyway migrations are preferred over `hibernate.ddl-auto=update`
- What the health check endpoint does and how it prevents free-tier cold starts
- Why we isolate database configurations for unit/integration tests with `@ActiveProfiles("test")`
- How the vector extension (`pgvector`) is enabled via Flyway SQL migration

---

### Question 1: Why should we use Flyway migrations instead of letting Hibernate create tables (`ddl-auto=update`)?

**Natural answer:**

> "In production and enterprise systems, `ddl-auto=update` is dangerous and non-deterministic. It can alter existing tables unexpectedly, drop constraints, or fail silently during concurrent cluster startups. Flyway gives us version-controlled, immutable SQL scripts (`V1__...`, `V2__...`) that run deterministically in order across all environments — local dev, CI/CD pipelines, and cloud production. It also records each applied migration with a checksum in the `flyway_schema_history` table, making rollbacks and schema audits clear and safe."

---

### Question 2: How did you handle the dependency alignment between Spring Boot and Spring AI?

**Natural answer:**

> "Spring AI is evolving rapidly. Milestone 2.1.0-RC2 targets the upcoming Spring Framework 7 (which introduces internal retry structures like `org.springframework.core.retry.RetryTemplate`), whereas Spring Boot 3.4 runs on Spring Framework 6.2 with `spring-retry`. When building on Spring Boot 3.4, pinning the Spring AI BOM to the production-aligned `1.1.8` line ensures that all transitive dependencies—such as `spring-ai-starter-model-google-genai` and `spring-ai-starter-model-google-genai-embedding`—work cohesively with Spring Boot 3's runtime and classloader without ClassNotFoundExceptions."

---

### Question 3: Why do we have a public `/api/health` endpoint that pings the database?

**Natural answer:**

> "Free-tier hosting providers (like Render or Koyeb) spin down inactive applications after 15 to 60 minutes of inactivity. When a user finally visits, they experience a 30-to-50-second cold start while the JVM initializes. Having a lightweight `/api/health` endpoint serves two functions: first, an external free uptime monitor (like Cron-job.org or UptimeRobot) can ping it every 10–14 minutes to keep the backend warm; second, the endpoint performs a quick `SELECT 1` query to verify that the PostgreSQL database connection pool is healthy, returning HTTP 200 when alive or HTTP 503 when degraded."

---
