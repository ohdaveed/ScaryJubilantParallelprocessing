# ARCHITECTURE.md — System Design

## System Overview

The repo is a full-stack HHVC authoring tool with three major runtime layers:

1. A Vite/React SPA for planning, generating, reviewing, and browsing HHVC pages.
2. A single-file Express API in `server.js` for AI operations and persistence-backed CRUD.
3. A persistence layer in `lib/persistence.js` that exposes the same application contract through Postgres primary mode or local JSON fallback mode.

## Runtime Composition

```text
Browser
  -> Vite SPA (`src/main.tsx` -> `App.tsx`)
  -> WorkspaceProvider composes domain hooks
  -> frontend API clients in `src/utils/api.ts`
  -> `/api/*`
Express (`server.js`)
  -> middleware: compression, helmet, hpp, cors, json, pino
  -> request validation via `lib/requestSchemas.js`
  -> Anthropic/Karl routes
  -> CRUD/model routes
  -> persistence adapter from `createPersistence()`
Persistence (`lib/persistence.js`)
  -> Postgres store after migrations
  -> or file-backed store at `.local/hhvc-local-db.json`
```

## Frontend State Architecture

`WorkspaceContext` is the frontend composition root. It does not own all logic directly; it wires domain hooks together and exposes a single app-facing context.

| Hook | Responsibility |
|---|---|
| `usePagesData` | Load page summaries, hydrate full pages, migrate legacy localStorage pages/todos |
| `usePlanMap` | Planned-page tree, initial sitemap seeding, linking built pages |
| `usePageGeneration` | Generation, streaming, retry, evaluation, remediation, refine flow |
| `useVersionHistory` | Version listing and restore actions |
| `useWorkspaceState` | UI-local workspace state such as selections/edit buffers |
| `useProjectModel` | Bulk load normalized model data: concepts, nodes, artifacts, variants, references, queue |

## UI Shell and Navigation

The current application shell is tab-oriented, not a generic multi-route site:

- `plan`: canonical concepts and working HHVC IA
- `generate`: authoring/generation workspace
- `library`: page library and selection flow
- `ideal`: reference-only benchmark map

`App.tsx` keeps the tab state URL-driven and renders the relevant page through lazy-loaded route components.

## Backend Route Architecture

All HTTP routes are defined inline in `server.js`. They group into these subsystems:

| Route group | Endpoints |
|---|---|
| Health | `GET /api/health` |
| AI generation/evaluation | `POST /api/chat`, `POST /api/evaluate`, `POST /api/improve-structure`, `POST /api/karl-remediate` |
| Preferences | `GET/POST/DELETE /api/preferences` |
| Pages and versions | `GET/POST/DELETE /api/pages`, `PATCH /api/pages/:id/review`, `GET /api/pages/:id/versions`, `GET /api/pages/:id/versions/:versionId`, `POST /api/pages/:id/restore/:versionId` |
| Legacy execution queue | `GET/POST/PATCH/DELETE /api/todos` |
| Planned pages | `GET/POST/PATCH/DELETE /api/planned-pages` |
| Normalized content model | `GET/POST/PATCH /api/page-concepts`, `GET /api/ia-nodes`, `GET /api/page-artifacts`, `POST /api/page-artifacts/:id/promote`, `GET/POST /api/artifact-variants`, `GET /api/reference-examples`, `GET/POST/PATCH/DELETE /api/build-queue` |

## Persistence Model

The persistence layer is no longer just page drafts plus planned pages. It supports a normalized content system with separate concepts, IA placement, artifacts, references, and queue state.

### Core persisted model

| Entity | Role |
|---|---|
| `PageConcept` | Canonical user/task concept with governance and canonical-title rules |
| `IANode` | Placement of a concept inside a specific IA map |
| `PageArtifact` | Concrete page output/draft/import/build snapshot tied optionally to a concept |
| `ArtifactVersion` | Version history snapshots for artifacts |
| `ArtifactVariant` | Alternative artifacts for the same concept |
| `ReferenceExample` | Reference-only benchmark pages/maps |
| `BuildQueueItem` | Execution queue item for build/generation work |

### Store selection behavior

- If `DB_FALLBACK_MODE=file` is set, the app uses the local JSON store immediately.
- If `DATABASE_URL` is absent, the app also uses the file store.
- If `DATABASE_URL` is present, the app attempts migrations and Postgres startup first.
- If Postgres init fails, the app falls back to the file store and logs the fallback.

## Generation and Remediation Flow

The current generation architecture is hybrid local-first:

1. `usePageGeneration.generate()` builds a prompt from constants, selected context, and preferences.
2. `src/services/chatStream.ts` streams Anthropic output from `/api/chat`.
3. `src/services/pageParser.ts` attempts structured parsing and, if needed, a repair pass through `/api/chat`.
4. `src/generationValidation.ts` validates page type, placeholders, and component names locally.
5. The generation loop retries invalid output up to `MAX_GENERATION_RETRIES = 2`.
6. The page is evaluated through `/api/evaluate`.
7. Only if the resulting quality gate is `review_required`, the app calls `/api/karl-remediate`, shows `Consulting Karl...`, applies the returned guidance through `/api/improve-structure`, and re-evaluates.

This means Karl remediation is conditional, not the first or only review path.

## Request Validation and Trust Boundaries

- Server request bodies are validated with Zod schemas in `lib/requestSchemas.js`.
- Write routes can be protected by `ADMIN_TOKEN` / `HHVC_ADMIN_TOKEN`.
- The frontend adds `x-admin-token` automatically through `src/utils/apiFetch.ts` if `VITE_ADMIN_TOKEN` or stored local token exists.
- The AI layer is wrapped with response extraction, parse guards, and timeouts before results are trusted.

## Intent vs. Reality Divergences Corrected In This Refresh

- Older docs over-focused on `planned_pages` and page drafts; current code has a normalized concept/artifact/queue model.
- Older docs treated file-backed persistence as the normal path; current code treats Postgres as primary and file mode as fallback.
- Older docs described Karl remediation too broadly; current code uses it only after a failing quality gate.
- Older docs under-described the current four-tab studio shell and context-composed frontend state model.

## Unknowns

- [TODO] The repo does not expose a full production deployment topology. Architecture here documents the checked-in runtime, not external infrastructure.

## Evidence

- `src/main.tsx`
- `src/App.tsx`
- `src/context/WorkspaceContext.tsx`
- `src/hooks/usePageGeneration.ts`
- `src/hooks/usePagesData.ts`
- `src/hooks/usePlanMap.ts`
- `src/hooks/useProjectModel.ts`
- `src/services/chatStream.ts`
- `src/services/pageParser.ts`
- `src/generationValidation.ts`
- `server.js`
- `lib/persistence.js`
- `lib/requestSchemas.js`
- `src/utils/api.ts`
- `src/types.ts`
