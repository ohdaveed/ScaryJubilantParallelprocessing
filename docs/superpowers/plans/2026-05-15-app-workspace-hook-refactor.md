# App Workspace Hook Refactor Plan

Date: 2026-05-15
Owner: Copilot
Status: In progress
Spec: `docs/superpowers/specs/2026-05-15-app-workspace-hook-refactor-design.md`

## Objective

Extract the non-visual workspace logic from `src/App.tsx` into a dedicated hook so the root component becomes a thin composition layer, while preserving current routing, preview, export, and database-mode behavior.

## Scope

In scope:

- Move route-to-tab synchronization into `src/hooks/useAppWorkspace.ts`
- Move DB-mode fetch and banner decision logic into the hook
- Move derived workspace values into the hook:
  - preview URL text
  - preview summary line
  - library row data
  - footer/status text
  - stream bar message
  - topic validation state
- Move app-level handlers into the hook:
  - tab navigation
  - browse-library navigation
  - generate trigger
  - page-goal updates
  - page-type updates
  - library page select/delete wiring
  - screenshot export trigger wiring
- Keep `src/App.tsx` responsible for shell composition, the hidden screenshot export target, and preview rendering

Out of scope:

- UI redesign
- Routing semantic changes
- Screenshot export behavior changes
- Workspace context contract changes
- New product features

## Target Structure

- `src/App.tsx`
- `src/hooks/useAppWorkspace.ts` (new)
- `src/hooks/useAppWorkspace.test.ts` (new, if needed for direct hook coverage)
- `src/components/SfGovContentDesignTool.test.tsx` (existing shell coverage remains relevant)

## Milestones and Checklist

### M1: Baseline and Guardrails

- [ ] Run targeted tests for the shell and current app-adjacent flows
- [ ] Run a TypeScript check on the touched workspace slice
- [ ] Record any current failures or warnings before editing

Acceptance:

- Baseline behavior is understood before the refactor starts
- No new scope has been added beyond the approved spec

### M2: Extract `useAppWorkspace`

- [ ] Create `src/hooks/useAppWorkspace.ts`
- [ ] Move URL/tab synchronization into the hook
- [ ] Move DB-mode fetch logic into the hook
- [ ] Move derived preview, library, footer, stream, and validation state into the hook
- [ ] Move app-level handlers into the hook

Acceptance:

- The hook owns the non-visual workspace logic currently embedded in `App.tsx`
- Existing behavior stays the same for tab routing and derived labels

### M3: Thin `App.tsx`

- [ ] Replace the in-file workspace derivations in `src/App.tsx` with hook output
- [ ] Keep screenshot export DOM ownership in `App.tsx`
- [ ] Preserve the hidden preview/export ref and `SfGovContentDesignTool` wiring
- [ ] Keep the file-mode banner in the root render path

Acceptance:

- `src/App.tsx` reads like a composition layer
- The visible UI and export path remain unchanged

### M4: Validation and Cleanup

- [ ] Add or update a focused test if the new hook needs direct coverage
- [ ] Run `npm test`
- [ ] Run `npx tsc --noEmit`
- [ ] Run `npm run dev` and smoke-check routing, banner rendering, and preview/export behavior

Acceptance:

- Tests and typecheck pass
- The dev server still boots cleanly
- The refactor does not change user-visible behavior

## File Map

| File                                | Change                                                     |
| ----------------------------------- | ---------------------------------------------------------- |
| `src/App.tsx`                       | Simplify to composition and render wiring                  |
| `src/hooks/useAppWorkspace.ts`      | CREATE - host routing, banner, derived state, and handlers |
| `src/hooks/useAppWorkspace.test.ts` | CREATE or UPDATE - focused coverage if needed              |

## Risk Controls

- Keep the extraction incremental: move one responsibility at a time and rewire immediately
- Preserve existing routing and screenshot export semantics instead of redesigning them
- Avoid pulling DOM ownership into the hook
- Keep the file-mode banner visible in the root component so it cannot be dropped accidentally

## Rollback Strategy

- If a milestone introduces regressions, revert only the last extraction slice and shrink the next edit to the smallest controllable boundary
- If the hook starts to grow too large, split helper calculations into small local functions inside the hook file before adding more behavior

## Notes

- The spec already establishes the intended boundary: `App.tsx` should stay thin, and `useAppWorkspace` should own the orchestration logic
- The existing `SfGovContentDesignTool` shell test remains the best lightweight guardrail for preserving the visual shell while the root component changes
