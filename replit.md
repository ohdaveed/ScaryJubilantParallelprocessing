# HHVC SF.gov Content Design Tool

A React-based AI content design tool for the San Francisco Department of Public Health — Healthy Housing & Vector Control (HHVC). Generates SF.gov web page designs using Claude (Anthropic API) with optional Karl documentation integration, Karl evaluation scoring, and PostgreSQL-backed persistence.

## Architecture

**Frontend:** React 18 + TypeScript + Vite on port 5000  
**Backend:** Express.js API server on port 3001 (keeps API key server-side)  
**Database:** Replit PostgreSQL (`DATABASE_URL` auto-provisioned)  
**Workflow:** `npm run dev` runs both via `concurrently`

## Project Structure

```
src/
  types.ts          — TypeScript interfaces (PageDraft, TodoItem, KarlEvaluation, etc.)
  constants.ts      — SYSTEM_PROMPT, PAGE_TYPES, USER_TYPES, UI styling maps
  utils.ts          — Parsing logic, pagesApi/todosApi REST clients, lsLegacy migration helper
  App.tsx           — Main app (Builder, Library, System Map tabs)
  main.tsx          — React entry point
  index.css         — CSS custom properties / design tokens + keyframe animations
  components/
    ui.tsx          — Reusable UI components (Badge, Btn, Card, KarlEvalPanel, etc.)
server.js           — Express server: Anthropic proxy + PostgreSQL CRUD API
vite.config.ts      — Vite config: port 5000, proxy /api/* → :3001
index.html          — HTML entry point
scripts/
  post-merge.sh     — Post-merge setup: npm install
```

## API Endpoints (server.js)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/chat | Stream Anthropic page generation (with Karl MCP) |
| POST | /api/evaluate | Karl evaluation score for a generated page |
| GET | /api/pages | List all pages from DB |
| POST | /api/pages | Save/upsert a page |
| DELETE | /api/pages/:id | Delete a page |
| GET | /api/todos | List all todos |
| POST | /api/todos | Create todo |
| PATCH | /api/todos/:id | Toggle done state |
| DELETE | /api/todos/:id | Delete todo |

## Database Schema

```sql
CREATE TABLE pages (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at TIMESTAMP DEFAULT NOW());
CREATE TABLE todos (id SERIAL PRIMARY KEY, topic TEXT, user_type TEXT, done BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW());
```

Tables are auto-created by `initDb()` on server start.

## Key Design Decisions

- **API key security:** `ANTHROPIC_API_KEY` lives only in the backend. Frontend calls `/api/chat`.
- **Streaming:** Claude responses stream via SSE. Backend forwards raw stream; frontend reads live.
- **Karl integration:** MCP server URL passed in Anthropic request. Shows "Karl connected" when active.
- **Karl evaluation:** Separate `POST /api/evaluate` call runs after generation using `claude-haiku-4-20250514`.
- **Storage:** PostgreSQL via `pg` pool. `pagesApi`/`todosApi` in `utils.ts` are typed REST clients. `lsLegacy` handles one-time migration of legacy `hhvc:*` localStorage keys.
- **Model:** `claude-sonnet-4-20250514` with `anthropic-beta: mcp-client-2025-04-04`

## Required Secrets

- `ANTHROPIC_API_KEY` — Anthropic API key (set in Replit Secrets)
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)

## Running

The "Start application" workflow runs `npm run dev`, which starts both the backend (port 3001) and Vite frontend (port 5000) concurrently.

## Post-Merge

`scripts/post-merge.sh` runs `npm install` after each task merge. Configured via `[postMerge]` in `.replit`.
