# Semantic RAG Assistant

An intelligent, self-hosted knowledge-base assistant with grounded, cited answers.

Upload PDFs / DOCX / Markdown / plain text into your own knowledge bases, then chat with them from a web dashboard, a Chrome side-panel extension, or any MCP-compatible client (Claude Desktop, Cursor, etc.). Answers stream token-by-token via SSE, cite the exact chunks they were drawn from, and refuse to answer when the retrieved context is insufficient.

---

## Highlights

- **Hybrid retrieval** — dense (pgvector cosine similarity) + sparse (PostgreSQL `tsvector` FTS) fused with **Reciprocal Rank Fusion (RRF)**.
- **Advanced RAG techniques**, all independently toggleable via `.env`:
  - **HyDE** — LLM writes a hypothetical answer, embeds *that* instead of the raw query.
  - **Query expansion** — 3 paraphrased variants merged with the original.
  - **Contextual chunking** — each chunk gets an LLM-generated 2–3 sentence blurb prepended, both embedded and searchable, dramatically improving recall on short chunks.
  - **Semantic chunking** — sentence-embedding cosine drift finds natural topic boundaries instead of fixed-size splits.
  - **Reranker** — NVIDIA NIM `nv-rerankqa-mistral-4b-v3` re-scores the top candidates.
- **Grounded generation** — the LLM is instructed to answer *only* from retrieved context and always cite `[N]`. Uncited chunks are filtered and remaining citations are renumbered sequentially before the message is persisted.
- **Multilingual** — replies always match the question's language (UA / EN / PL / …), regardless of the language of the source documents.
- **SSE streaming** — chat tokens, citations, and completion signals stream to the frontend on a single `text/event-stream` connection.
- **Two frontends** — React 18 dashboard (KB management + chat, with a UA/EN language switcher and mobile-responsive layout) and a Chrome MV3 Side-Panel extension that can ingest the current page in one click.
- **MCP server** — exposes the retrieval + ingestion tools to any MCP client over SSE, authenticated with per-user API keys.
- **Multi-tenant** — user-owned or organization-owned knowledge bases, plus per-user KB sharing with invitation flow (`pending` → `accepted` / `declined`) and permissions (`viewer` / `editor`).

---

## Architecture

```
┌────────────────────┐   ┌────────────────────┐   ┌───────────────────┐
│  Webapp            │   │  Chrome Extension  │   │  MCP client       │
│  (React + Vite)    │   │  (MV3 SidePanel)   │   │  (Claude Desktop, │
│                    │   │                    │   │   Cursor, …)      │
└─────────┬──────────┘   └─────────┬──────────┘   └──────────┬────────┘
          │ REST + SSE             │ REST + SSE              │ MCP/SSE
          │                        │                         │ + API key
          └────────────┬───────────┴─────────────────────────┘
                       │
                 ┌─────▼──────────────────────────────────┐
                 │  nginx (prod)                          │
                 │  /api/* → backend                      │
                 │  /mcp/* → backend                      │
                 └─────┬──────────────────────────────────┘
                       │
              ┌────────▼─────────────────────────────────┐
              │  FastAPI backend (Python 3.12, async)    │
              │                                          │
              │  auth · api_keys · organizations · kb    │
              │  documents · chat (RAG + SSE) · mcp      │
              └─────┬────────────────────────┬───────────┘
                    │                        │
              ┌─────▼──────────┐   ┌─────────▼──────────┐
              │ PostgreSQL 16  │   │ OpenAI  /  NVIDIA  │
              │ + pgvector     │   │ NIM  (embeddings,  │
              │  (vector+FTS)  │   │ chat, reranker)    │
              └────────────────┘   └────────────────────┘
```

### Monorepo layout

```
├── backend/          # FastAPI, SQLAlchemy async, uv-managed
│   ├── src/
│   │   ├── main.py                  # App wiring, CORS, security headers, rate limit, MCP mount
│   │   ├── core/                    # config, database, deps, exceptions, embeddings, rate_limit
│   │   ├── auth/                    # register / login / refresh / me — JWT + Argon2
│   │   ├── api_keys/                # long-lived tokens for MCP clients (srag_… prefix)
│   │   ├── organizations/           # org CRUD + member invite/remove
│   │   ├── knowledge_bases/         # KB CRUD + share invitations
│   │   ├── documents/               # upload, URL-ingest, background parse→chunk→embed
│   │   ├── chat/                    # sessions, messages, retriever, reranker, RAG pipeline
│   │   ├── mcp_server/              # FastMCP tools & resources over SSE
│   │   └── settings/                # runtime toggles (embedding provider, reranker)
│   └── alembic/                     # migrations
├── webapp/           # React 18 + TypeScript + Vite — dashboard
├── extension/        # React + TypeScript + Vite — Chrome MV3 SidePanel
├── nginx/            # reverse proxy config for production
├── docker-compose.yml
└── docs/             # design docs, changelog, benchmark results
```

### Database (13 tables)

| Group | Tables |
|---|---|
| **Auth** | `users`, `refresh_tokens`, `api_keys` |
| **Multi-tenant** | `organizations`, `organization_members` |
| **RAG** | `knowledge_bases`, `kb_shares`, `documents`, `chunks`, `embeddings` |
| **Chat** | `sessions`, `messages`, `message_citations` |

`embeddings` is a separate table from `chunks` on purpose — re-embedding with a new model doesn't touch text data or invalidate FTS. `chunks.fts_vector` is a `tsvector` column populated at ingest time (`to_tsvector('simple', content)`), and `embeddings.vector` is a `vector(1536)` column queried with cosine distance (`<=>`).

---

## Data flow

### Ingestion

```
upload / ingest-url / MCP ingest_document
    │
    ├─ validate:    MIME allow-list (PDF/DOCX/TXT/MD) + magic-bytes check
    │               (%PDF, PK\x03\x04) — declared type must match real bytes
    │
    ▼
save file to disk (deduplicated per-KB by SHA-256 content_hash → 409 on
duplicate) → status "uploading"
    │
    ▼
background task: process_document
    │
    ├─ parse:       PyMuPDF (PDF) · python-docx (DOCX) · UTF-8 read (TXT/MD)
    │
    ├─ chunk:       semantic (sentence-embedding cosine drift, 100–1024 tokens)
    │               or recursive (LangChain, 512 / 64 overlap) — env toggle
    │
    ├─ contextualize (optional): LLM adds a 2–3 sentence "this chunk is about …"
    │                            prefix; raw chunk kept in metadata.original_content
    │                            so citations show the original text.
    │
    ├─ embed:       OpenAI text-embedding-3-small (default, 1536-d)
    │               or NVIDIA nv-embedqa-e5-v5 — batched, 100 per API call
    │
    └─ persist:     chunks + embeddings + fts_vector (to_tsvector('simple', content))
                    → status "ready"   (or "failed" — with error_message, files cleaned up)
```

### Retrieval + generation

```
user query
    │
    ├─ HyDE (optional):        LLM writes a plausible answer paragraph
    │                          → embed the answer instead of the raw query
    │
    ├─ Query expansion (opt):  LLM writes 3 paraphrased variants
    │                          → each variant runs its own vector + FTS pass
    │
    ├─ Vector search:          pgvector <=> cosine, top-N per query
    ├─ FTS search:             to_tsquery over chunks.fts_vector, top-N per query
    │
    ├─ RRF fusion:             1 / (60 + rank), per-query, then per-chunk max
    │
    ├─ Rerank (optional):      NVIDIA NIM /ranking on top 20 candidates
    │                          → keep top-K (default 5)
    │
    ├─ Build prompt:           strict system prompt + numbered [N] context blocks
    │
    ├─ Stream via SSE:         OpenAI chat.completions stream=True
    │                          → forward tokens as {"token": "..."} events
    │
    ├─ Post-process:           drop chunks the LLM didn't cite,
    │                          renumber remaining [N] sequentially by first appearance
    │
    └─ Persist:                save assistant message + message_citations
                               emit {"citations": [...]} then {"done": true}
```

The frontend receives three SSE event types on one connection: `token` (append to bubble), `citations` (attach source cards), `done` (final rewritten content and — on the first message — the auto-generated session title).

---

## Getting started

### Prerequisites

- Docker + Docker Compose, **or** local Python 3.12 + Node 22 + PostgreSQL 16 with the `vector` extension.
- An OpenAI API key (default provider) **or** an NVIDIA NIM API key.
- The reranker (`RERANKER_ENABLED=true`) always uses NVIDIA NIM — set `NVIDIA_API_KEY` if you want reranking on, or set `RERANKER_ENABLED=false` to skip it.

### 1. Configure environment

```bash
cp .env.example .env
# then edit .env — at minimum set:
#   POSTGRES_PASSWORD=…
#   DATABASE_URL=postgresql+asyncpg://postgres:<pw>@postgres:5432/semantic_rag
#   JWT_SECRET=$(openssl rand -hex 32)
#   OPENAI_API_KEY=sk-…
```

Optional configuration:

| Env var                         | Default  | Purpose                                                        |
| ------------------------------- | -------- | -------------------------------------------------------------- |
| `CONTEXTUAL_CHUNKING_ENABLED`   | `true`   | LLM context blurb per chunk (higher ingest cost, better recall). |
| `HYDE_ENABLED`                  | `true`   | Embed a hypothetical answer instead of the raw query.          |
| `QUERY_EXPANSION_ENABLED`       | `true`   | Fan-out to 3 paraphrased variants.                             |
| `SEMANTIC_CHUNKING_ENABLED`     | `true`   | Sentence-drift chunking (else fixed-size recursive).           |
| `RERANKER_ENABLED`              | `true`   | Rerank top-20 candidates via NVIDIA NIM.                       |
| `EMBEDDING_PROVIDER`            | `openai` | `openai` (1536-d) or `nvidia` (`nv-embedqa-e5-v5`).            |
| `CHUNK_SIZE` / `CHUNK_OVERLAP`  | `512/64` | Recursive fallback chunker size (chars).                       |
| `MAX_FILE_SIZE_MB`              | `50`     | Upload hard cap.                                               |

### 2. Run with Docker (recommended)

```bash
docker compose up --build -d
docker compose exec backend uv run alembic upgrade head
```

- Webapp:   http://localhost/
- Backend:  http://localhost/api/  (or http://localhost:8000/ directly)
- MCP SSE:  http://localhost/mcp/sse?api_key=srag_...

### 3. Or run locally

```bash
# --- Backend ---
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --reload
# → http://localhost:8000

# --- Webapp ---
cd webapp
npm install
npm run dev
# → http://localhost:5173

# --- Chrome extension ---
cd extension
npm install
npm run build
# then in chrome://extensions → Enable Developer mode → Load unpacked → select extension/dist
```

---

## Using it

### Web dashboard

Create an account, then:

1. **Dashboard** — one card per knowledge base (name, doc count, chunk count, last updated).
2. **KB detail page** — drag-and-drop upload of PDF / DOCX / TXT / MD (≤ 50 MB by default). Status polls every 2 s: `uploading` → `processing` → `ready` (or `failed`). You can also share the KB with other users at `viewer` or `editor` permissions.
3. **Chat** — pick a KB, ask a question. Tokens stream in; `[1]`, `[2]`, … citation badges are clickable and slide open a panel showing the source document, relevance %, and the exact chunk excerpt.
4. **Organizations** — create an org, invite members, and create org-owned KBs that all members can use.
5. **Settings** — switch embedding provider or toggle reranker at runtime (in-memory override, resets on restart); manage API keys for MCP clients; tune search mode + `top_k` per client (persisted in `localStorage`).
6. **UA / EN language switcher** with a full translation dictionary (100+ keys), UA is the default; date locales follow the selected language.

### Chrome extension

Open the side panel on any web page:

- **Ingest current page** — the banner extracts readable text via the content script and creates a document in an "auto" KB (`Browser Pages`, `Browser Pages 1`, …) or an existing one.
- **Chat** — same UX as the webapp, in a compact panel next to the page.
- **Server URL** setting — point the extension at any backend (localhost, staging, prod).

### MCP client

1. Create an API key in the webapp Settings page (starts with `srag_`).
2. Point your MCP client at `http://localhost/mcp/sse?api_key=srag_...`.
3. Available tools:
   - `list_knowledge_bases()` — every KB the user can access, with permission role.
   - `search_knowledge_base(query, knowledge_base_id, mode="hybrid", top_k=5)` — retrieves ranked chunks. `mode` = `"hybrid"` / `"vector"` / `"fts"`.
   - `get_chunk_by_id(chunk_id)` — full chunk text + document context.
   - `ingest_document(knowledge_base_id, title, text_content=..., file_url=...)` — adds a document; returns a `document_id` you can poll with the `knowledge://documents/{id}` resource.
4. Available resources:
   - `knowledge://stats/{knowledge_base_id}` — doc / chunk / embedding counts.
   - `knowledge://documents/{document_id}` — metadata + processing status.

---

## Tech stack

**Backend** — Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, PostgreSQL 16 + pgvector, Pydantic v2, `pwdlib[argon2]`, `python-jose`, PyMuPDF, python-docx, LangChain text-splitters, OpenAI SDK, `slowapi` (rate-limit), FastMCP.

**Webapp** — React 18, TypeScript, Vite 5, React Router v6, Axios (with auto-refresh 401 interceptor), custom `useSSE` hook (EventSource wrapper), CSS Modules, Lucide React, Outfit + IBM Plex Mono.

**Extension** — React 19, TypeScript, Vite 8, Chrome MV3 manifest (sidePanel, activeTab, storage, tabs, scripting).

**Infra** — Docker Compose (postgres + backend + nginx), nginx for static hosting + reverse proxy with SSE-friendly settings (`proxy_buffering off`, long `proxy_read_timeout`).

---

## Development notes

The backend follows a strict feature-based layout — see [`CLAUDE.md`](CLAUDE.md) for the full convention. In short, every module contains `models.py`, `schemas.py`, `service.py`, `router.py`; business logic lives in `service.py`, never in the router; every service function takes `db: AsyncSession`.

Migrations:

```bash
cd backend
uv run alembic revision --autogenerate -m "add x column"
uv run alembic upgrade head
```

Tests and benchmarks (see `backend/tests/`):

```bash
# Integration tests — requires TEST_DATABASE_URL in .env; skipped otherwise
uv run pytest

# Retrieval benchmark — HR@5, MRR, TTFT across 8 feature configurations
uv run python -m tests.benchmark_rag --email user@example.com --password ... \
    --kb-id <uuid> --output results.csv
```

Rate limits (via `slowapi`) are enforced per-IP:

- `POST /auth/register` — 3/min
- `POST /auth/login` — 5/min
- `POST /documents/upload` — 10/min
- `POST /chat/sessions/{id}/messages` — 20/min

---

## Security

- Passwords hashed with **Argon2** (`pwdlib[argon2]`).
- JWT with short-lived access tokens (15 min) + rotating refresh tokens (30 days). Refresh tokens are stored as SHA-256 hashes and revoked on every rotation.
- API keys stored as SHA-256 hashes; only the raw key is returned once, at creation.
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`.
- CORS locked to configured origins + `chrome-extension://<32 hex>` regex for the extension.
- Uploads capped at `MAX_FILE_SIZE_MB` (default 50 MB), MIME allow-list, **magic-bytes verification** (`%PDF`, `PK\x03\x04`), and filename sanitised via `Path.name` to block path traversal.
- Per-KB duplicate protection: `UNIQUE (knowledge_base_id, content_hash)` — re-uploading the same file into the same KB returns `409`.
- KB access is checked on every read/write; MCP tools re-verify via `check_kb_access` on each call.
- Rate limits on the sensitive endpoints (register / login / upload / chat) via `slowapi` (in-memory; swap for Redis in multi-process deployments — see [`docs/SECURITY.md`](docs/SECURITY.md)).
- All raw SQL uses SQLAlchemy `text()` with bound parameters; the FTS query string is pre-tokenised through a `\w+` regex before `to_tsquery`.

Do **not** commit real secrets to `.env` — the file is gitignored, but `.env.example` is what should be shared. Generate `JWT_SECRET` with `openssl rand -hex 32`.

---

## License

[MIT](LICENSE)
