# HHVC SF.gov Content Design Tool

A React-based AI content design tool for the San Francisco Department of Public Health — Healthy Housing & Vector Control (HHVC). Generates SF.gov web page designs using Claude (Anthropic API) with Karl documentation integration and automated evaluation.

## Architecture

**Frontend:** React 18 + TypeScript + Vite on port 5000  
**Backend:** Express.js API + DB proxy on port 3001 (keeps API key server-side)  
**Database:** PostgreSQL (Replit built-in) via `pg` pool  
**Workflow:** `npm run dev` runs both via `concurrently`

## Project Structure

```
src/
  types.ts          — TypeScript interfaces (PageDraft, TodoItem, KarlEvaluation, etc.)
  constants.ts      — SYSTEM_PROMPT, PAGE_TYPES, USER_TYPES, UI styling maps
  utils.ts          — Parsing logic, pagesApi/todosApi (REST), runKarlEvaluation, helpers
  App.tsx           — Main app (Builder, Library, System Map tabs)
  main.tsx          — React entry point
  index.css         — CSS custom properties / design tokens, keyframe animations
  components/
    ui.tsx          — Reusable UI components (Badge, Btn, Card, KarlEvalPanel, etc.)
server.js           — Express: /api/chat proxy, /api/evaluate, /api/pages CRUD, /api/todos CRUD
vite.config.ts      — Vite config: port 5000, proxy /api/* → :3001
index.html          — HTML entry point
```

## Key Design Decisions

- **API key security:** `ANTHROPIC_API_KEY` lives only in the backend proxy (`server.js`). Frontend calls `/api/chat` which is proxied through Vite to Express.
- **Database:** PostgreSQL via `pg` Pool. Two tables: `pages` (id TEXT PK, data JSONB) and `todos` (id SERIAL PK, topic, user_type, done). Pages API at `/api/pages`, Todos API at `/api/todos`. Existing localStorage data is migrated to DB on first load.
- **Karl evaluation:** After page generation, `/api/evaluate` is called automatically. It sends the draft to `claude-haiku-4-20250514` with Karl MCP attached and returns a structured JSON score (grade A-F, score 0-100, passed/warnings/failed lists). Results stored on `PageDraft.karlEvaluation` and displayed in the success state and page detail view via `KarlEvalPanel`.
- **Streaming:** Claude responses stream via SSE. The backend forwards the raw stream; the frontend reads chunks and renders them live.
- **Karl generation integration:** MCP server URL passed in the Anthropic API request body. When Karl responds, the app shows "Karl connected" status.
- **Model:** `claude-sonnet-4-20250514` for generation, `claude-haiku-4-20250514` for evaluation; both with `anthropic-beta: mcp-client-2025-04-04`

## Required Secrets

- `ANTHROPIC_API_KEY` — Anthropic API key (set in Replit Secrets)
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Set automatically by Replit DB

## Running

The "Start application" workflow runs `npm run dev`, which starts both the backend (port 3001) and Vite frontend (port 5000) concurrently.
