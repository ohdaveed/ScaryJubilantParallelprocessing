# App Logic Separation Plan

Date: 2026-04-17
Owner: Copilot + david
Status: In progress

## Objective

Reduce `src/App.tsx` to composition/layout while moving domain logic into focused hooks and services, with no behavior regressions.

## Scope

In scope:

- Extract generation/refine orchestration from `src/App.tsx`
- Extract pages, Drive, plan-map, todo, and version-history logic into hooks
- Extract stream + parse/repair logic into services
- Keep current UI behavior and API contracts unchanged

Out of scope:

- New product features
- Visual redesign
- API contract changes

## Target Structure

- `src/App.tsx`
- `src/hooks/usePageGeneration.ts`
- `src/hooks/usePagesData.ts`
- `src/hooks/useDriveContext.ts`
- `src/hooks/usePlanMap.ts`
- `src/hooks/useTodoPanel.ts`
- `src/hooks/useVersionHistory.ts`
- `src/services/chatStream.ts`
- `src/services/pageParser.ts`
- `src/state/appTypes.ts`

## Milestones and Checklist

### M1: Baseline and Guardrails

- [x] Run targeted tests for generation/refine/import-adjacent behaviors
- [x] Run full build
- [x] Record baseline results in this file

Acceptance:

- Build passes
- Targeted tests pass

### M2: Extract Pure Services

- [x] Move streaming response parsing into `src/services/chatStream.ts`
- [x] Move parse+repair flow into `src/services/pageParser.ts`
- [x] Keep existing behavior by wiring services back into App

Acceptance:

- No UI or payload behavior changes
- Build/tests remain green

### M3: Extract Data Hooks

- [x] Create `src/hooks/usePagesData.ts` (load/migrate/list/save/delete wrappers)
- [x] Create `src/hooks/useDriveContext.ts` (list/select/fetch/cache)
- [x] Create `src/hooks/usePlanMap.ts` (list/seed/select/link)

- [x] Create `src/hooks/useVersionHistory.ts` (open/list/restore)

Acceptance:

- Each hook has a single domain responsibility
- App compiles with same behavior

### M4: Extract Generation Orchestrator Hook

- [x] Create `src/hooks/usePageGeneration.ts`
- [x] Move generate/refine orchestration into hook
- [x] Keep progress/karl/stream/evaluate state behavior unchanged

Acceptance:

- App delegates orchestration to hook
- No regression in generate/refine flow

### M5: Optional View Split (If Needed)

- [x] Split tab sections into presentational components only if `App.tsx` remains too large (map/library extracted)
- [x] Keep components dumb (props-in/callbacks-out)

Acceptance:

- `App.tsx` mostly composition
- No behavioral diff

### M6: Type Consolidation and Cleanup

- [x] Move shared inline object types into `src/state/appTypes.ts`
- [x] Remove duplicated shapes and dead helper logic

Acceptance:

- Consistent type usage across App/hooks/services

### M7: Final Validation

- [x] Run targeted tests
- [x] Run full build
- [ ] Manual smoke check: generate, refine, import, plan-link, version restore

Acceptance:

- Tests/build pass

- Core flows validated manually

## Risk Controls

- Keep refactor incremental: one milestone per commit-sized change
- Avoid changing UI markup while moving logic
- Preserve API request/response shapes
- Validate after each milestone before proceeding

## Rollback Strategy

- If regression appears in a milestone, revert only that milestone’s changes and continue with smaller slices.

## Baseline Results

- 2026-04-17: `npm run build` passed before refactor.
- 2026-04-17: Targeted tests for `src/utils.test.ts` and `src/components/SfGovPreview.test.tsx` passed before refactor.

## Validation Results (Current)

- 2026-04-17: After M2 extraction, `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: After M2 extraction, `npm run build` passed.
- 2026-04-17: After M3 extraction, `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: After M3 extraction, `npm run build` passed.
- 2026-04-17: After M4 extraction, `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: After M4 extraction, `npm run build` passed.
- 2026-04-17: After M5 map/library split, `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: After M5 map/library split, `npm run build` passed.
- 2026-04-17: After M6 type cleanup, `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: After M6 type cleanup, `npm run build` passed.
- 2026-04-17: M7 targeted tests rerun: `npm run test -- --run src/utils.test.ts src/components/SfGovPreview.test.tsx` passed (12 tests).
- 2026-04-17: M7 full build rerun: `npm run build` passed.
- 2026-04-17: M7 API smoke (server endpoints backing core flows) passed for generate path, refine path, import path, plan-link path, and version-restore path.

## Next Step

Complete manual UI smoke-check of generation/refine/import/plan-link/version-restore flows and mark M7 done.
