# CONCERNS.md — Risks, Debt, and Fragile Areas

## Highest-Value Current Concerns

### 1. Large backend concentration points

- `server.js` is the only Express server file and owns middleware, request validation wiring, Anthropic calls, and all route handlers.
- `lib/persistence.js` is also a large concentration point with both file-store and Postgres-store behavior plus model mapping logic.

**Risk:** Changes to route behavior or persistence contracts are easy to couple unintentionally.

### 2. Mixed-era data model surface

- The repo still supports legacy-ish entities such as `todos` and `planned-pages`.
- At the same time, the normalized content model now includes `PageConcept`, `IANode`, `PageArtifact`, `ArtifactVariant`, `ReferenceExample`, and `BuildQueueItem`.

**Risk:** New features can accidentally patch the old page/planned-page shape instead of using the normalized model.

### 3. Dual persistence modes

- Postgres is the intended primary path, but the app can silently fall back to local file storage when startup fails.
- That improves resilience, but it also increases the chance that a developer thinks they are exercising the Postgres path when they are actually in file mode.

**Risk:** Behavior can diverge across environments if migrations or DB assumptions lag behind file-mode behavior.

### 4. Generation flow complexity

- `usePageGeneration.ts` owns prompt construction, streaming progress, parse/repair, retry, evaluation, remediation, persistence, and UI state transitions.
- The current flow is correct but dense.

**Risk:** Small edits can break progress states, retry behavior, or the conditional Karl remediation branch.

### 5. High-churn UI shell files

Recent history shows repeated edits in:

- `src/App.tsx`
- `src/components/SfGovContentDesignTool.tsx`
- `src/components/SfGovContentDesignTool.css`
- `src/hooks/usePageGeneration.ts`
- `server.js`
- `lib/persistence.js`

**Risk:** These files likely carry the most hidden coupling and should be treated as regression-prone.

## Documentation Divergences Fixed In This Refresh

The previously checked-in codebase docs had drifted in several important ways:

- They over-emphasized older `planned_pages` / page-draft persistence instead of the normalized content model.
- They described file-backed persistence too broadly instead of documenting Postgres as the primary path with fallback.
- They under-described the current four-tab studio shell and context-composed frontend state shape.
- They did not clearly describe Karl remediation as conditional on a failing quality gate.

## Testing Gaps and Caveats

- The test suite is broad, but the coverage include glob focuses on `src/`, so root/backend JS files are not represented directly in coverage metrics.
- The app has local audit scripts and eval scripts, but they are separate from the core Vitest suite.
- The repo does not, from the inspected files, expose an end-to-end deployed-environment smoke test path in these docs.

## Workflow and Operational Concerns

- `docs/codebase/WORKFLOW.md` is preserved as requested, but its current content appears more historical/analytical than canonical runtime documentation.

**Risk:** Readers may mistake it for current source-of-truth behavior unless they treat it as a supplement.

- `srcpages/` exists outside the active boot path.

**Risk:** New contributors may read it as live source unless they start from `src/main.tsx`.

## Security and Access Concerns

- Write-route protection is optional and env-driven; local/dev setups may run without admin-token protection.
- CORS is configurable and permissive for localhost by design.

**Risk:** Misconfigured environments could assume stronger write protection than is actually enabled.

## Open Unknowns

- [TODO] Confirm the intended long-term status of legacy queue/planned-page APIs once the normalized model fully replaces older workflows.
- [TODO] Confirm whether `WORKFLOW.md` should eventually be refreshed or explicitly labeled historical.
- [TODO] Confirm the production deploy target and runtime observability beyond local logs/CORS hooks.

## Evidence

- `server.js`
- `lib/persistence.js`
- `src/App.tsx`
- `src/hooks/usePageGeneration.ts`
- `src/context/WorkspaceContext.tsx`
- `src/utils/api.ts`
- `src/types.ts`
- `src/server.api.test.ts`
- `src/server.concepts.test.ts`
- `src/server.file-db.test.ts`
- `src/persistence.postgres.test.ts`
- `docs/codebase/WORKFLOW.md`
- `docs/codebase/.codebase-scan.txt`
