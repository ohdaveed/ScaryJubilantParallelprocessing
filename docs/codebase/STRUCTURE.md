# STRUCTURE.md — Repository Layout

**Project root:** `C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing`

## Top-Level Layout

| Path | Purpose |
|---|---|
| `src/` | React application source, hooks, pages, components, tests, and shared TS utilities |
| `lib/` | Server-side persistence, request validation, prompt helpers, Karl integrations, and migrations |
| `scripts/` | Local dev helpers, migration/seed scripts, audits |
| `docs/` | Project docs including this `codebase/` set |
| `eval/` | Eval runners for generation-quality checks |
| `public/` | Static frontend assets |
| `dist/` | Built frontend output |
| `.local/` | Local runtime artifacts such as fallback DB and logs |

## Frontend Structure (`src/`)

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Browser entrypoint; mounts `BrowserRouter` and `WorkspaceProvider` |
| `src/App.tsx` | Root shell; drives the four workspace tabs: `plan`, `generate`, `library`, `ideal` |
| `src/context/WorkspaceContext.tsx` | Aggregates app-wide state and domain actions |
| `src/hooks/` | Domain hooks such as pages, generation, plan map, queue, history, workspace state |
| `src/pages/` | Route/tab page components (`GeneratePage`, `LibraryPage`, `PlanPage`, `IdealPage`) |
| `src/components/` | Studio shell, preview, UI primitives, tab-level components |
| `src/services/` | Streaming and parse/repair service helpers |
| `src/utils/` | API clients, parsing, export, content-model helpers |
| `src/data/` | HHVC IA seed/sync data |
| `src/state/` | Shared app state types |
| `src/fixtures/` | Golden content fixtures for tests/evals |

## Backend Structure (`lib/` + root server)

| Path | Responsibility |
|---|---|
| `server.js` | Single Express application and HTTP route surface |
| `lib/persistence.js` | Store abstraction for Postgres/file modes and normalized content model |
| `lib/contentModel.js` | Server-side model mapping and governance helpers |
| `lib/requestSchemas.js` | Zod schemas for request validation |
| `lib/modelResponseGuards.js` | Anthropic response extraction / normalization guards |
| `lib/karlCitations.js` | Karl citation enforcement helpers |
| `lib/karlMcp.js` | Karl MCP discovery and client logic |
| `lib/prompts/` | Prompt builders for evaluation and improvement routes |
| `lib/migrations/` | SQL migrations plus JS migration runner |

## Important Runtime Entry Points

| File | Why it matters |
|---|---|
| `scripts/dev.mjs` | Starts both API and Vite, labels child process output, shuts both down together |
| `src/main.tsx` | Frontend boot sequence |
| `src/App.tsx` | User-visible shell and tab navigation |
| `src/context/WorkspaceContext.tsx` | Shared state composition point |
| `server.js` | Backend boot sequence, middleware, routes, and server listen call |
| `lib/persistence.js` | Chooses Postgres vs file-backed persistence at startup |

## High-Value Test Files

| File | Coverage area |
|---|---|
| `src/server.api.test.ts` | Request validation, rate limiting, and route-level API behavior |
| `src/server.concepts.test.ts` | Concept/IA/artifact/build-queue endpoints |
| `src/server.file-db.test.ts` | File-backed persistence behavior and version history |
| `src/persistence.postgres.test.ts` | Normalized Postgres path |
| `src/hooks/usePageGeneration.test.ts` | Retry loop, Karl remediation, progress state |
| `src/canonicalIa.test.ts` | Working canonical IA tree behavior |

## Supporting Documentation in Repo

| Path | Purpose |
|---|---|
| `DESIGN.md` | UI/design system source of truth |
| `CLAUDE.md` | Repo-specific coding and architecture notes |
| `docs/codebase/` | Codebase documentation set |
| `docs/codebase/WORKFLOW.md` | Preserved repo-specific workflow supplement |

## Structure Notes

- `server.js` and `lib/persistence.js` are the largest backend concentration points.
- Tests are mostly co-located under `src/` with `.test.ts` / `.test.tsx` suffixes.
- The repo includes local agent/tooling folders; these are workspace support files, not application runtime code.
- `srcpages/` exists in the repo but is not part of the current boot path from `src/main.tsx`.

## Unknowns

- [TODO] `srcpages/` may be legacy or experimental source. The current app entrypoint does not reference it.

## Evidence

- `docs/codebase/.codebase-scan.txt`
- `src/main.tsx`
- `src/App.tsx`
- `src/context/WorkspaceContext.tsx`
- `server.js`
- `lib/persistence.js`
- `scripts/dev.mjs`
- `DESIGN.md`
- `CLAUDE.md`
