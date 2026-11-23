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

### Correction after re-reading the repo and current docs (23 Nov 2026)

The earlier Phase 1 note treats `vector(3072)` plus an HNSW index as the safe choice. That migration will fail on Supabase.

pgvector can **store** a 3072-dimension `vector`, but an HNSW or IVFFlat index on the `vector` type allows at most **2,000 dimensions** (pgvector 0.7+; still true in the 0.8 line). Supabase documents the same limit. `V3__create_document_chunks_pgvector.sql` creates `USING hnsw (embedding vector_cosine_ops)` on `vector(3072)`. Flyway will stop with an error like "column cannot have more than 2000 dimensions for hnsw index".

`gemini-embedding-001` still defaults to 3072 and can be shortened to 768, 1536, or 3072. Google says the full 3072 vector is already normalized. A shortened vector from this model is **not** normalized, so we must L2-normalize it ourselves before cosine search. `gemini-embedding-2` auto-normalizes shortened vectors, but its embedding space is incompatible with `gemini-embedding-001`, so we do not mix them.

Recommended lock, pending approval: `gemini-embedding-001`, output size **1536**, column `vector(1536)`, HNSW with `vector_cosine_ops`, normalize every vector in Java before insert and before query.

`gemini-2.0-flash` was shut down on 1 June 2026. The value in `application.yml` will not answer chat requests. Replacement candidates to confirm in Phase 2: `gemini-3.5-flash-lite` (cheaper, better free-tier fit) or `gemini-3.6-flash` (stronger tables). Do not enable Google Search grounding; that would answer from the web instead of the brochures.

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

---

## Phase 4 — Frontend Design System, React + Vite, Shell & Pages

### Topics You Should Be Able to Explain

- Why Tailwind v4 uses CSS variables in `@theme` and `@import "tailwindcss"` instead of `tailwind.config.js`
- How the Axios interceptor manages JWT Bearer tokens and handles token refresh on 401
- How route guards (`Protected` and `Guest`) work in React Router with `AuthProvider`
- Why smooth scrolling (Lenis) must be disabled or isolated on chat log containers (`data-lenis-prevent`)
- How the password strength calculator evaluates user security without external dependencies
- How server-sent events (SSE) and streamed markdown are formatted with tables and source citations

---

### Question 1: How does your frontend handle authentication state and expired tokens?

**Natural answer:**

> "We use a React Context (`AuthProvider`) combined with Axios request and response interceptors. When a user logs in, the access and refresh tokens are stored in `localStorage`. The Axios request interceptor attaches the access token to the `Authorization: Bearer <token>` header for all outgoing API calls. If the backend responds with a 401 Unauthorized, the response interceptor catches it, pauses queued requests, calls `POST /api/auth/refresh` with the refresh token to get a new access token, updates storage, and transparently retries the original request. If the refresh token is also invalid or expired, the user is logged out and redirected to `/login`."

---

### Question 2: Why did you isolate smooth scrolling (Lenis) on the Chat page?

**Natural answer:**

> "Lenis provides premium inertial smooth scrolling across the main layout, but virtual smooth-scrolling engines hijack native scroll event listeners. In an AI chat interface where responses stream token-by-token and auto-scroll must follow the bottom anchor, Lenis would fight against programmatic scroll updates (`scrollIntoView` or `scrollTop = scrollHeight`). We added `data-lenis-prevent` to the message history container and disabled Lenis window listening on the chat route so native, instant auto-scrolling works cleanly without stutter."

---

### Question 3: How are markdown comparison tables and source citations rendered in the UI?

**Natural answer:**

> "When the AI assistant streams or outputs answers comparing vehicles (like Alcazar vs Creta), it formats the comparison as standard GitHub Flavored Markdown (GFM) tables. We use `react-markdown` with `remark-gfm` configured with custom component overrides for `table`, `thead`, `th`, and `td`. This renders the markdown as modern responsive tables with navy headers, zebra striping, and horizontal overflow protection. In addition, when the backend returns source metadata (document name, page number), we render them as interactive source badge chips below the response that users can inspect."

---

## Phases 5–8 — Documents, ingestion, retrieval, chat

### What you should be able to explain

- Upload returns 202 because indexing calls Gemini once per chunk and must not hold the HTTP thread.
- A comparison searches each vehicle separately, then the model writes one table from both result sets.
- If no chunk passes the similarity threshold, we do not call Gemini. The fixed sentence is the whole answer.
- Page numbers come from reading the PDF one page at a time, not from guessing after a single full-text extract.

### Question 1: Why is the vector 1536 if the model can emit 3072?

> "pgvector will store 3072 numbers, but it refuses to build the HNSW index we need once the width passes 2000. Google’s embedding model is Matryoshka-trained, so the first 1536 numbers are a supported size. We L2-normalize that shorter vector ourselves, because only the full 3072 vector arrives already normalized. Cosine search is a direction comparison, so an unnormalized vector would rank by magnitude as well as meaning."

### Question 2: Why not one similarity search for “Alcazar vs Creta”?

> "One search returns the nearest chunks in the whole library. The longer brochure, or the one whose wording is closer to the question, fills the top results and the other car disappears. I detect both names and run the same question vector twice, once with a vehicle filter. The prompt then sees two labeled piles and has to say when a cell is missing."

### Question 3: What happens if the brochure is a scan?

> "PDFBox reads characters, not pictures. If the file has almost no letters, ingestion marks it FAILED with a message that it looks image-only. We do not OCR in this version, and we do not pretend the empty text is a brochure the model can answer from."

---

## Phase 3 — JWT Authentication (register, login, token refresh, protected routes)

### Topics You Should Be Able to Explain

- What JWT is, what it contains, and why it's stateless
- Why we use BCrypt and what the "strength" number means
- How Spring Security's filter chain works and where JWT fits
- Why we use `AuthenticationManager` for login (not check password directly)
- Why `OncePerRequestFilter` exists and what it does
- The difference between an access token and a refresh token
- Why controllers are "thin" and business logic lives in services
- How `@Valid` and Bean Validation work (and what happens on failure)
- Why we return generic error messages for bad credentials

---

### Question 1: What is a JWT and why is it stateless?

**Natural answer:**

> "JWT stands for JSON Web Token. It has three Base64-encoded parts separated by dots: a header (algorithm used), a payload (claims like user ID, email, role, expiry), and a signature. The server signs it with a secret key using HMAC-SHA256. On every request, the client sends this token in the `Authorization: Bearer <token>` header. The server just verifies the signature — if it's valid and not expired, the user is authenticated. No session stored anywhere. That's what stateless means: the server can verify who you are without checking a database or a session store. This is why JWT scales well — any instance of the server can verify the token independently."

---

### Question 2: Why BCrypt? What does the strength (cost factor) number mean?

**Natural answer:**

> "BCrypt is a password hashing algorithm specifically designed to be slow. That's the point — it makes brute-force attacks expensive. The strength number (we use 12) is a cost factor. Internally BCrypt runs 2^12 = 4,096 rounds of key derivation. On a modern CPU, BCrypt with strength 12 takes about 250–300ms per hash. If an attacker steals your database, cracking one password takes 250ms instead of microseconds. At scale, cracking a million passwords would take years, not minutes. We don't use MD5 or SHA-256 for passwords because those are designed to be fast — that's the opposite of what you want."

---

### Question 3: Walk me through what happens when a user logs in with wrong credentials.

**Natural answer:**

> "The login request hits `POST /api/auth/login`. Spring's `@Valid` runs Bean Validation first — if the email format is wrong or password is blank, it returns 422 before we even touch the database. If validation passes, `AuthService.login()` calls `AuthenticationManager.authenticate()`. This goes through Spring Security's `DaoAuthenticationProvider`, which loads the user from the database by email, then calls `BCryptPasswordEncoder.matches(rawPassword, storedHash)`. If it doesn't match, Spring throws `BadCredentialsException`. We catch that and throw our own `BusinessException` with the message 'Invalid email or password.' — deliberately vague. The `GlobalExceptionHandler` converts that to a 401 JSON response. We never say 'email not found' or 'wrong password' separately — that would tell an attacker which one was correct."

---

