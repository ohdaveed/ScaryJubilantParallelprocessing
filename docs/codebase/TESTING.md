# TESTING.md — Test Strategy and Coverage

## Test Stack

| Tool | Purpose |
|---|---|
| Vitest | Main test runner |
| jsdom / node environments | Component/hook tests and server-style tests |
| Testing Library | React component assertions |
| supertest | Express API endpoint tests |
| V8 coverage | Coverage output through Vitest |

`vitest.config.ts` sets:

- `environment: "node"`
- `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`
- coverage include on `src/**/*.ts` and `src/**/*.tsx`

## Test Organization

Tests are co-located with source under `src/` and use `.test.ts` / `.test.tsx` suffixes. There is not a separate top-level `tests/` tree for the main application.

## Coverage Areas Present

### Backend/API behavior

| File | Focus |
|---|---|
| `src/server.api.test.ts` | Request validation, rate limiting, malformed payload rejection, route guards |
| `src/server.concepts.test.ts` | Concept, IA, artifact, build-queue, and health endpoints |
| `src/server.file-db.test.ts` | File fallback behavior, pages/todos/preferences persistence, version retention and restore |
| `src/persistence.postgres.test.ts` | Postgres-mode initialization and normalized concept persistence |

### Generation and parsing

| File | Focus |
|---|---|
| `src/hooks/usePageGeneration.test.ts` | Generation success path, remediation after failing evaluation, visible `Consulting Karl...` progress, retry budget of 2 |
| `src/generationValidation.test.ts` | Page-type/component/placeholder validation |
| `src/services/pageParser.test.ts` | Structured parse repair flow |
| `src/services/chatStream.test.ts` | SSE parsing, progress callbacks, Karl tool detection |
| `src/utils.test.ts` | Prompt contract, quality gate, parsing helpers, overlap detection, exports |

### Canonical IA and content model

| File | Focus |
|---|---|
| `src/canonicalIa.test.ts` | Working canonical tree construction |
| `src/contentModel.test.ts` | Page-type/content-type mapping behavior |
| `src/hhvcCanonicalWorkingIaSeed.test.ts` | Seed completeness and placement invariants |
| `src/syncCanonicalWorkingIa.test.ts` | Sync and idempotence behavior |

### Frontend state and UI

| File | Focus |
|---|---|
| `src/hooks/usePagesData.test.ts` | Loading, hydration, legacy migration, delete behavior |
| `src/hooks/usePlanMap.test.ts` | Planned-page loading, seeding, linking, deletion |
| `src/hooks/useProjectModel.test.ts` | Bulk normalized-model loading |
| `src/hooks/useQueueRunner.test.ts` | Queue sequencing and stop behavior |
| `src/hooks/useVersionHistory.test.ts` | Version history UI logic |
| `src/hooks/useWorkspaceState.test.ts` | Selection/edit buffer workspace state |
| `src/components/SfGovContentDesignTool.test.tsx` | Studio shell rendering and interaction |
| `src/components/SfGovPreview.test.tsx` | Preview rendering rules |
| `src/components/IdealSiteMap.test.tsx` | Reference-only ideal map rendering |
| `src/components/ui.test.tsx` | Basic UI primitive guarantees |

## What The Current Tests Prove

- The current app contract includes both legacy queue/planned-page behavior and the newer normalized model endpoints.
- Postgres and file fallback paths both have direct test coverage.
- The generation flow is not a single API call; it includes parse repair, local validation, evaluation, conditional remediation, and re-evaluation.
- The frontend shell and key hooks are covered by targeted unit/integration-style tests.

## Practical Test Commands

| Command | Use |
|---|---|
| `npm test` | Full test suite |
| `npm run test:watch` | Watch mode |
| `npx vitest run src/hooks/usePageGeneration.test.ts` | Single high-value generation test file |

## Testing Caveats

- `src/server.api.test.ts`, `src/server.concepts.test.ts`, and `src/server.file-db.test.ts` set up environment variables in-process; they are not black-box deployed-environment tests.
- Coverage is configured against `src/`, so backend code living in root `server.js` or `lib/` is exercised indirectly through tests rather than included directly by the coverage include glob.
- The repo contains Playwright-based UI audit tooling, but the main checked-in automated suite is still Vitest-centric.

## Unknowns

- [TODO] No CI workflow file was inspected in this refresh, so this document does not assert which subsets run automatically in CI versus locally.

## Evidence

- `package.json`
- `vitest.config.ts`
- `src/server.api.test.ts`
- `src/server.concepts.test.ts`
- `src/server.file-db.test.ts`
- `src/persistence.postgres.test.ts`
- `src/hooks/usePageGeneration.test.ts`
- `src/generationValidation.test.ts`
- `src/services/pageParser.test.ts`
- `src/services/chatStream.test.ts`
- `src/hooks/usePagesData.test.ts`
- `src/hooks/usePlanMap.test.ts`
- `src/hooks/useProjectModel.test.ts`
- `src/canonicalIa.test.ts`
