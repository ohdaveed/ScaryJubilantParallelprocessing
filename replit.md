# HHVC SF.gov Content Design Tool

A React-based AI content design tool for the San Francisco Department of Public Health — Healthy Housing & Vector Control (HHVC). Generates SF.gov web page designs using Claude (Anthropic API) with optional Karl documentation integration.

## Architecture

**Frontend:** React 18 + TypeScript + Vite on port 5000  
**Backend:** Express.js API proxy on port 3001 (keeps API key server-side)  
**Workflow:** `npm run dev` runs both via `concurrently`

## Project Structure

```
src/
  types.ts          — TypeScript interfaces (PageDraft, TodoItem, etc.)
  constants.ts      — SYSTEM_PROMPT, PAGE_TYPES, USER_TYPES, UI styling maps
  utils.ts          — Parsing logic, storage shim (localStorage), helper fns
  App.tsx           — Main app (Page builder, System map, Library tabs)
  main.tsx          — React entry point
  index.css         — CSS custom properties / design tokens
  components/
    ui.tsx          — Reusable UI components (Badge, Btn, Card, etc.)
server.js           — Express proxy: POST /api/chat → Anthropic API
vite.config.ts      — Vite config: port 5000, proxy /api/* → :3001
index.html          — HTML entry point
```

## Key Design Decisions

- **API key security:** `ANTHROPIC_API_KEY` lives only in the backend proxy (`server.js`). Frontend calls `/api/chat` which is proxied through Vite to Express.
- **Storage:** Uses a `localStorage` shim (exported from `utils.ts`) to persist pages and todos. Pages stored under `hhvc:<timestamp>` keys.
- **Streaming:** Claude responses stream via SSE. The backend forwards the raw stream; the frontend reads chunks and renders them live.
- **Karl integration:** MCP server URL passed in the Anthropic API request body. When Karl responds, the app shows "Karl connected" status.
- **Model:** `claude-sonnet-4-20250514` with `anthropic-beta: mcp-client-2025-04-04`

## Required Secrets

- `ANTHROPIC_API_KEY` — Anthropic API key (set in Replit Secrets)

## Running

The "Start application" workflow runs `npm run dev`, which starts both the backend (port 3001) and Vite frontend (port 5000) concurrently.
