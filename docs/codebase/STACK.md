# STACK.md — Technology Stack

**Project:** hhvc-tool — SF.gov Healthy Housing & Vector Control Content Design Tool  
**Type:** React + Express + PostgreSQL full-stack application

## Runtime & Languages

| Component | Version | Requirement |
|-----------|---------|-------------|
| **Node.js** | ≥20.16.0 | Required for scripts, API server, build tools |
| **TypeScript** | ^5.9.3 | Type checking (dev); compiled to JS for runtime |
| **JavaScript** | ES2022 | Runtime standard; ESM (`"type": "module"` in package.json) |

## Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **UI Framework** | React | ^18.3.1 | Component-based UI |
| **Build Tool** | Vite | ^5.4.21 | Dev server, production bundling |
| **Dev Server** | Vite dev server | ^5.4.21 | Port 5000 (proxies `/api` to Express on 3001) |
| **DOM Utilities** | html-to-image | ^1.11.13 | Canvas-based image capture (screenshots) |
| **PDF Rendering** | html2canvas | ^1.4.1 | Image-to-canvas for PDF export |
| **PDF Generation** | jspdf | ^2.5.1 | PDF export from canvas |
| **State Management** | React Hooks + Context | Native | Custom hooks: `usePagesData`, `usePageGeneration`, `usePlanMap`, etc. |
| **CSS** | CSS Modules + CSS | Vanilla | `src/**/*.module.css` for scoped styles; global in `src/index.css` |

## Backend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Web Framework** | Express | ^4.22.1 | HTTP API server (port 3001) |
| **HTTP Parser** | Express built-in | — | JSON body parsing (limit: 20MB) |
| **AI/LLM** | Anthropic Claude API | v1 (2023-06-01) | Page generation, Karl evaluation, content improvement |
| **Claude Models** | claude-sonnet-4-x, claude-haiku-4-x | Latest | Prompt caching enabled on all routes |
| **File Format Parsers** | mammoth | ^1.12.0 | Word (.docx) to plain text |
| **File Format Parsers** | pdf-parse | ^2.4.5 | PDF to plain text |
| **Archive Handling** | jszip | ^3.10.1 | ZIP file extraction (for .docx parsing) |
| **HTTP Client** | Fetch API | Native | Calls to Anthropic API |
| **Request Tracing** | crypto.randomUUID | Native | Request ID tracking for logs |

## Database Stack

| Layer | Primary | Fallback | Configuration |
|-------|---------|----------|----------------|
| **Database Engine** | PostgreSQL | JSON file (.local/hhvc-local-db.json) | Dual persistence; file-based used if DB unavailable |
| **Connection Pool** | pg (node-postgres) | — | v8.20.0; connection pooling via `pg.Pool` |
| **Connection String** | Neon hosted PostgreSQL | — | Via `DATABASE_URL` env var; `sslmode=require` |
| **Fallback Trigger** | Connection failure | — | Auto-detected; no manual config needed (file mode is default fallback) |
| **Env Override** | `DB_FALLBACK_MODE=file` | — | Force file-based mode at startup (skips DB connection attempt) |

## Testing Stack

| Tool | Version | Scope |
|------|---------|-------|
| **Test Framework** | Vitest | ^3.2.4 | Unit + integration tests |
| **HTTP Testing** | supertest | ^7.1.1 | API integration tests (Express endpoints) |
| **Test Organization** | Vitest glob patterns | — | `src/**/*.test.ts`, `src/**/*.test.tsx` |

## Build & Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Package Manager** | npm (with package-lock.json) | Dependency resolution |
| **NPM Scripts** | — | Entry points: `npm run dev`, `npm test`, `npm run build` |
| **TypeScript Compiler** | ^5.9.3 | Type checking via `tsc --noEmit` |
| **Vite Plugins** | @vitejs/plugin-react | ^4.7.0 | React Fast Refresh, JSX transformation |

## Development Commands

```bash
npm run dev              # Start Vite (5000) + Express API (3001)
npm test                 # Run Vitest suite
npm run test:watch      # Vitest watch mode
npm run build           # Production build → dist/
npm run preview         # Preview production build
npm run metrics:fixtures # Report fixture metrics
```

## Environment Variables

| Variable | Required | Type | Purpose |
|----------|----------|------|---------|
| `ANTHROPIC_API_KEY` | Yes | String | Anthropic API key for Claude calls |
| `DATABASE_URL` | No | String | PostgreSQL connection string (Neon) |
| `DB_FALLBACK_MODE` | No | Enum | Set to `file` to force file-based persistence |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | String | Path or base64 JSON for Google Drive API (legacy; backend only) |

**Note:** Server reads `.env` at process start via `node --env-file=.env`. Changes require restart.

## Key Constraints

| Constraint | Detail | Implication |
|-----------|--------|------------|
| **Request Size Limit** | 20MB (Express) | PDF/Word uploads capped at 20MB |
| **Image Upload Limit** | 4MB per image max | 3 images max per API request |
| **Timeout** | 45s default, 60s for `/api/chat` | Requests must complete within window |
| **Page Version Retention** | 50 snapshots max per page | Oldest snapshots dropped after 50 versions |
| **No ESLint** | TypeScript is primary static analysis | Use `tsc --noEmit` for type checking |

## Evidence

- `package.json`: dependencies, devDependencies, scripts, Node.js version range
- `AGENTS.md`: Node.js version guidance, env var documentation
- `.env`: current configuration (DATABASE_URL, ANTHROPIC_API_KEY, GOOGLE_APPLICATION_CREDENTIALS)
- `server.js`: Express setup, fetch to Anthropic, request parsing
- `src/App.tsx`: React imports, hooks, CSS imports
- `lib/persistence.js`: PostgreSQL connection via `pg.Pool`; file-based fallback logic
