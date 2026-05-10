# STACK.md — Technology Stack

**Project:** `hhvc-tool`  
**Repo state reviewed:** 2026-05-09  
**Application type:** React/Vite SPA + single-file Express API + normalized persistence layer

## Runtime and Languages

| Area | Technology | Version / requirement | Notes |
|---|---|---|---|
| Package/runtime | Node.js | `>=20.16.0` | Required by `package.json` engines |
| Module format | ESM | `"type": "module"` | Backend and scripts use ESM imports |
| App languages | TypeScript + JavaScript | TS `^5.9.3` | Frontend and tests are TypeScript; server/persistence are JavaScript |

## Frontend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| UI | React | `^18.3.1` | SPA rendered from `src/main.tsx` |
| Routing | `react-router-dom` | `^7.14.2` | `BrowserRouter` with path-driven workspace tabs |
| Build/dev server | Vite | `^5.4.21` | Serves frontend on port `5000` and proxies `/api` to `3001` |
| Vite React plugin | `@vitejs/plugin-react` | `^4.7.0` | JSX transform / React integration |
| UI state | React Context + custom hooks | native | `WorkspaceProvider` composes domain hooks |
| Styling | CSS + CSS Modules | native | Global styles plus scoped module styles |
| Font assets | `@fontsource/*` | `^5.2.8` | Self-hosted DM Serif Display, Plus Jakarta Sans, JetBrains Mono |
| Export helpers | `html-to-image`, `jspdf` | `^1.11.13`, `^2.5.2` | Screenshot/PDF export helpers |

## Backend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| HTTP server | Express | `^4.22.1` | All routes live in `server.js` |
| Compression | `compression` | `^1.8.1` | Applied to API JSON responses |
| Security headers | `helmet` | `^8.1.0` | CSP disabled explicitly |
| Parameter pollution guard | `hpp` | `^0.2.3` | Global middleware |
| CORS | `cors` | `^2.8.6` | Local defaults plus env-driven origins |
| Rate limiting | `express-rate-limit` | `^8.5.1` | Separate limits for chat/evaluate/improve |
| Logging | `pino`, `pino-http` | `^10.3.1`, `^11.0.0` | Request IDs are generated per request |
| Request validation | `zod` | `^4.4.3` | Route body validation in `lib/requestSchemas.js` |
| Word import | `mammoth` | `^1.12.0` | DOCX text extraction |
| PDF import | `pdf-parse` | `^2.4.5` | Loaded through `createRequire` |

## AI and Content-System Integrations

| Area | Technology | Notes |
|---|---|---|
| LLM provider | Anthropic Messages API | Used by `/api/chat`, `/api/evaluate`, and `/api/improve-structure` |
| MCP client | `@modelcontextprotocol/sdk` | Karl guidance lookup client in `lib/karlMcp.js` |
| Karl guidance path | Karl MCP + local Karl prompt rules | Local rules run first; remote remediation is conditional |
| Prompt/runtime guards | local parser + validator | Structured repair in `src/services/pageParser.ts`; page validation in `src/generationValidation.ts` |

## Persistence

| Layer | Technology | Notes |
|---|---|---|
| Primary store | PostgreSQL via `pg` | `DATABASE_URL` is the primary persistence path |
| Hosted target | Neon/Postgres-compatible URL | `createPersistence()` normalizes some SSL modes before connecting |
| Migrations | SQL files + JS runner | `lib/migrations/*.sql`, `lib/migrations/runner.js` |
| Fallback store | local JSON file | File mode lives at `.local/hhvc-local-db.json` by default |
| Fallback selector | `DB_FALLBACK_MODE=file` or missing/unavailable DB | File store is explicit fallback, not the preferred mode |

## Testing and QA Tooling

| Tool | Version | Scope |
|---|---|---|
| Vitest | `^3.2.4` | Unit and integration tests |
| jsdom | `^29.1.1` | DOM-oriented component/hook tests where needed |
| Testing Library | `@testing-library/react`, `@testing-library/dom` | React component tests |
| supertest | `^7.1.1` | Express API route tests |
| Playwright | `@playwright/test` | Present for UI audit scripts / browser QA |
| Coverage | `@vitest/coverage-v8` | V8 coverage output configured in `vitest.config.ts` |

## Key npm Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Starts `server.js` and Vite together through `scripts/dev.mjs` |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview built frontend |
| `npm test` / `npm run test:watch` | Run Vitest once / in watch mode |
| `npm run migrate:karl-connected` | Migration helper for Karl-connected flags |
| `npm run seed:hhvc-working` | Seed HHVC working IA |
| `npm run eval*` | Eval suites for generation quality |
| `npm run ui:audit` | Playwright-based UI audit script |

## Environment and Config Surface

| Variable / config | Role |
|---|---|
| `ANTHROPIC_API_KEY` | Required for Anthropic-backed generation/evaluation/improvement |
| `DATABASE_URL` | Primary Postgres connection string |
| `DB_FALLBACK_MODE` | Force file-backed mode when set to `file` |
| `LOCAL_DB_PATH` | Override local JSON persistence path |
| `ADMIN_TOKEN` / `HHVC_ADMIN_TOKEN` | Optional write-protection for non-GET API routes |
| `CHAT_RATE_LIMIT`, `EVALUATE_RATE_LIMIT`, `IMPROVE_RATE_LIMIT` | AI route throttling |
| `CORS_ORIGINS`, `CORS_ORIGIN`, `URL`, `DEPLOY_PRIME_URL`, `DEPLOY_URL` | Additional allowed CORS origins |
| `KARL_MCP_URL`, `KARL_MCP_SERVER_NAME`, `KARL_MCP_CONFIG_PATH` | Karl MCP discovery / override path |
| `VITE_ADMIN_TOKEN` | Optional frontend-provided admin token header |

## Unknowns

- [TODO] Deployment target is not fully described in repo config. The repo exposes local dev wiring and deploy-related env hooks, but not a complete production platform definition.

## Evidence

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `vitest.config.ts`
- `scripts/dev.mjs`
- `server.js`
- `lib/persistence.js`
- `lib/migrations/runner.js`
- `lib/requestSchemas.js`
- `lib/karlMcp.js`
- `src/main.tsx`
