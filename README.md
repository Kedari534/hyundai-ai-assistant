# 🚗 Hyundai AI Assistant

A production-quality **RAG-based automotive AI assistant** for Hyundai dealerships, built for Cyepro Solutions.
Sales consultants can upload Hyundai vehicle brochures (PDFs) and ask natural-language questions —
the AI retrieves facts only from those documents (no hallucinations), generates structured comparison tables,
and streams answers in real-time.

> **Tech stack:** Java 21 · Spring Boot 3.4 · Spring AI 1.1.8 · Google Gemini · pgvector · Supabase · React + Vite 8 · Tailwind CSS v4

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🔍 RAG Q&A | Semantic search over uploaded brochures — answers sourced only from documents |
| 📋 Comparison Tables | Auto-generates markdown tables when comparing two vehicles |
| 📄 Document Management | Upload, process, and monitor PDF ingestion status |
| 🔐 JWT Auth | Register, login, refresh tokens, protected APIs |
| ⚡ Streaming | Server-Sent Events (SSE) — answers stream token-by-token |
| 🚫 Hallucination Guard | Returns "Not available in uploaded brochures" when no relevant chunks found |
| 🏷️ Source Citations | Every answer cites the brochure page it came from |
| 🌐 Responsive UI | Navy/blue design system, mobile-first, WCAG AA contrast |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌───────────────┐
│  React + Vite   │────▶│  Spring Boot (REST + SSE) │────▶│  Supabase DB  │
│  Tailwind CSS   │     │  Spring AI + Gemini        │     │  pgvector     │
│  Cloudflare     │     │  JWT + Spring Security     │     │  PostgreSQL 17│
│  Pages          │     │  Flyway migrations         │     │               │
└─────────────────┘     └──────────────────────────┘     └───────────────┘
                                      │
                              ┌───────▼────────┐
                              │ Google AI Studio│
                              │ Gemini Embeddings│
                              │ Gemini 3.5 Flash│
                              └────────────────┘
```

**RAG Pipeline:**
```
PDF Upload → PDFBox text extraction → Chunk (1600 chars, 200 overlap)
  → gemini-embedding-001 (3072-dim) → Truncate to 1536 → L2-normalize
  → Store in pgvector HNSW index
```

**Query Pipeline:**
```
User question → Embed → HNSW cosine search (top 6, min 0.35) → Ground prompt
  → Gemini 3.5 Flash → SSE stream → Citations
```

---

## 📋 Requirements

| Tool | Version |
|---|---|
| JDK | 21+ (tested on JDK 23.0.2) |
| Maven | 3.9+ |
| Node.js | 20+ |
| pnpm or npm | latest |
| PostgreSQL client | (for Supabase psql, optional) |

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Open

```bash
git clone https://github.com/<your-username>/hyundai-ai-assistant.git
cd hyundai-ai-assistant
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Enable the **pgvector** extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Note your **Project URL** and **DB Password**

### 3. Configure Backend Environment

Create `backend/.env`:

```env
# Database (Supabase)
DB_URL=jdbc:postgresql://db.<your-project-id>.supabase.co:5432/postgres?sslmode=require
DB_USERNAME=postgres
DB_PASSWORD=<your-supabase-db-password>

# Google AI
GOOGLE_AI_API_KEY=<your-google-ai-studio-api-key>

# JWT (generate a secure 256-bit secret)
JWT_SECRET=<at-least-64-chars-random-string>
JWT_EXPIRY_MS=3600000
JWT_REFRESH_EXPIRY_MS=604800000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Storage (local for dev)
APP_STORAGE_MODE=local
```

### 4. Run the Backend

```bash
cd backend
$env:PATH = "d:\tools\apache-maven-3.9.9\bin;" + $env:PATH  # Windows only if maven not in PATH
mvn spring-boot:run
```

Flyway will auto-apply all 6 migrations. Backend runs on **http://localhost:8080**.

Health check: `GET http://localhost:8080/actuator/health`

### 5. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**.

### 6. Upload Brochures & Test

1. Register: `POST /api/auth/register` with `{ "email", "password", "fullName" }`
2. Open `http://localhost:5173` → Log in
3. Go to **Documents** tab → Upload a Hyundai PDF brochure
4. Wait for status to show **COMPLETED**
5. Go to **Chat** tab → Ask questions!

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `users` | Authentication (BCrypt passwords, JWT) |
| `documents` | Uploaded PDF metadata + processing status |
| `document_chunks` | Text chunks with 1536-dim pgvector embeddings |
| `chat_sessions` | Conversation threads |
| `chat_messages` | Individual messages with ratings |

**Flyway migrations:** `V1` through `V6` in `backend/src/main/resources/db/migration/`

---

## 🔑 API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, fullName}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Get JWT token |
| POST | `/api/auth/refresh` | `{refreshToken}` | Refresh access token |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload PDF (multipart/form-data, field: `file`, `vehicleModel`) |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/{id}` | Get document details |
| DELETE | `/api/documents/{id}` | Delete document |
| GET | `/api/documents/models` | List supported vehicle models |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/sessions` | Create session `{title}` |
| GET | `/api/chat/sessions` | List sessions |
| POST | `/api/chat/sessions/{id}/messages` | Send message → SSE stream |
| GET | `/api/chat/sessions/{id}/history` | Get message history |
| POST | `/api/chat/messages/{id}/rate` | Rate a message `{rating: 1 or -1}` |

**SSE stream format:**
```
event:token
data:word

event:sources
data:[{"vehicleModel":"ALCAZAR","documentName":"...","pageNumber":1,"similarity":0.87}]
```

---

## 🌍 Production Deployment

### Backend → Render

1. Create **New Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `mvn package -DskipTests`
   - **Start Command:** `java -jar target/hyundai-ai-assistant-1.0.0.jar`
   - **Instance Type:** Free
4. Add **Environment Variables** (same as `.env` above, plus):
   - `APP_STORAGE_MODE=supabase`
   - `SUPABASE_URL=https://<project-id>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`
   - `CORS_ALLOWED_ORIGINS=https://<your-cloudflare-pages-domain>`
5. Deploy → Copy the `https://<service>.onrender.com` URL

### Frontend → Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variable:**
   - `VITE_API_URL=https://<your-render-backend>.onrender.com`
5. Deploy → Get your `https://<project>.pages.dev` URL

### After Deploy

- Update Render env var `CORS_ALLOWED_ORIGINS` to your Cloudflare Pages URL
- Re-upload brochures via the Documents page (Render's disk is ephemeral; use `APP_STORAGE_MODE=supabase` for persistence)

---

## 🧪 Running Tests

```bash
cd backend
mvn test
# 60 unit tests: Auth, Documents, Chat, Ingestion, Storage
```

```bash
cd frontend
npm run build
# Zero-error Vite build validates the frontend
```

---

## 📂 Project Structure

```
hyundai-ai-assistant/
├── backend/
│   ├── src/main/java/com/cyepro/hyundai/
│   │   ├── auth/           # JWT, SecurityConfig, AuthController
│   │   ├── document/       # Upload, ingestion pipeline
│   │   ├── chat/           # RAG chat, SSE streaming
│   │   ├── ingestion/      # PDF → chunks → embeddings
│   │   └── config/         # Async, CORS, app config
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/   # V1–V6 Flyway migrations
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── pages/          # AuthPage, ChatPage, DocumentsPage
│   │   ├── components/     # Shell (sidebar nav)
│   │   └── api.js          # Axios client + SSE helpers
│   ├── index.css           # Design tokens (navy, Tailwind v4)
│   └── vite.config.js
├── brochures/              # Sample Hyundai PDF brochures
├── docs/
│   └── INTERVIEW_NOTES.md
└── README.md
```

---

## 🎯 Supported Vehicle Models

Alcazar · Creta · i20 · Aura · Venue · Verna · Exter · Tucson · Grand i10 Nios

---

## 🔒 Security

- **Passwords:** BCrypt (strength 12)
- **JWT:** HS256, configurable expiry, refresh token rotation
- **SQL:** JPA parameterized queries + Spring Data (no raw SQL in app code)
- **Upload validation:** Only PDF, max 20 MB, no path traversal
- **CORS:** Locked to configured origins
- **Secrets:** Never committed — always read from environment variables

---

## 📝 License

MIT — Free to use, modify, and deploy.

---

## 👨‍💻 Built By

**Cyepro Solutions** — This project was built as a demonstration of full-stack RAG (Retrieval-Augmented Generation) for the Indian automotive dealership market.
