# Raw Memories

Merged stage-1 raw memories (stable ascending thread-id order):

## Thread `019defe9-e370-79d2-9579-b4052cada13a`
updated_at: 2026-05-03T22:57:06+00:00
cwd: \\?\C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
rollout_path: C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl
rollout_summary_file: 2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md

---
description: AI generation quality/reliability rollout: add richer local Karl standards, deterministic validation, capped retries, and server-side Karl MCP escalation only after failing evaluation; keep user-visible progress during Karl consultation.
task: Karl-first generation reliability redesign and implementation
task_group: docs/superpowers/specs_and_plans + react_express_generation_pipeline
task_outcome: success
cwd: C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
keywords: Karl MCP, local standards, deterministic validation, retry loop, progress label, evaluateQualityGate, improveStructure, fetchKarlRemediation, /api/karl-remediate, vitest, esbuild EPERM
---

### Task 1: Rich local Karl standards

task: add local Karl standards bundle and wire into prompt contract

task_group: frontend prompt contract

task_outcome: success

Preference signals:
- user chose "only if the page receives a failing grade" for live Karl MCP consultation -> initial generation should rely on stored Karl standards rather than live MCP
- user also wanted "the intial content following memory karl standards" -> first-pass generation should be guided by local Karl standards

Reusable knowledge:
- `src/karlStandards.ts` now centralizes valid Karl page types, valid components, transaction-required labels, and placeholder patterns.
- `src/constants.ts` injects a dedicated `KARL_PROMPT_SECTION` into `buildGenerationUserPrompt`.
- `src/utils.test.ts` now checks the generation prompt includes Karl standards text.

Failures and how to do differently:
- None beyond the usual Vitest/esbuild sandbox issue; targeted tests may need escalation when the sandbox blocks spawning.

References:
- `src/karlStandards.ts`
- `src/constants.ts` prompt injection
- `src/utils.test.ts` prompt-contract assertion

### Task 2: Deterministic validator

task: add hard-rule generation validator

task_group: shared validation

task_outcome: success

Preference signals:
- user accepted a reliability-first design that favors deterministic checks before model evaluation -> keep hard rules local and explicit

Reusable knowledge:
- `src/generationValidation.ts` validates invalid page types, placeholders, and invalid components.
- `GenerationValidationResult` was added to `src/types.ts` for typed validation output.
- `src/generationValidation.test.ts` covers invalid page type and placeholder rejection.

Failures and how to do differently:
- Keep validator focused on hard structural rules; avoid subjective style checks here.

References:
- `validateGeneratedPage(...)`
- `GenerationValidationResult`
- `src/generationValidation.test.ts`

### Task 3: Retry invalid generations

task: add bounded retry loop in generation hook

task_group: frontend generation orchestration

task_outcome: success

Preference signals:
- user explicitly said `2 retries.` -> cap automatic retries at two
- user preferred self-correction instead of surfacing a bad first draft -> retry internally before acceptance

Reusable knowledge:
- `usePageGeneration.ts` now loops parse -> validate -> retry up to 2 times using a generated failure report.
- The retry test asserts actual repeated streaming and validation calls.

Failures and how to do differently:
- Vitest/esbuild in this environment can fail with `spawn EPERM`; rerun with escalation if the first targeted test does not start.

References:
- `MAX_GENERATION_RETRIES = 2`
- `buildRetryPrompt(...)`
- `src/hooks/usePageGeneration.test.ts` retry regression

### Task 4: Server-side Karl remediation endpoint

task: add `/api/karl-remediate` and stub Karl MCP helper

task_group: backend remediation endpoint

task_outcome: success

Preference signals:
- user wanted server-side Karl access with frontend-visible progress, not frontend-direct MCP access -> keep MCP consultation server-side and expose only progress/results
- user wanted escalation only after failing grades -> do not consult live Karl on every generation

Reusable knowledge:
- `server.js` now has `POST /api/karl-remediate`.
- `lib/karlMcp.js` is a safe stub returning `{ consulted: false, guidance: [], error: ... }` until a real runtime MCP integration is implemented.
- `src/server.api.test.ts` now guards the new route.

Failures and how to do differently:
- Keep the remediation contract small and non-throwing until live MCP access is actually available.

References:
- `server.js` `/api/karl-remediate`
- `lib/karlMcp.js`
- `src/server.api.test.ts`

### Task 5: Failing-grade rewrite path

task: consult remediation after failing evaluation and feed guidance into rewrite

task_group: frontend/backend remediation loop

task_outcome: success

Preference signals:
- user wanted the app to automatically revise the page after Karl guidance is fetched -> remediation should feed a rewrite, not just surface a message
- user wanted initial content to follow Karl memory standards and only consult live Karl MCP after a failing grade -> hybrid local-first, remote-escalation behavior

Reusable knowledge:
- `src/utils.ts` now exports `fetchKarlRemediation(...)` and `improveStructure(...)` accepts optional `evaluationFeedback`.
- `usePageGeneration.ts` calls remediation when `evaluateQualityGate(...)` returns `review_required` and merges guidance into the rewrite feedback.
- The hook regression test verifies remediation occurs before the second rewrite and the guidance is passed into `improveStructure`.

Failures and how to do differently:
- `fetchKarlRemediation()` degrades safely on failed fetches so the hook does not throw on remediation outages.

References:
- `fetchKarlRemediation(...)`
- `improveStructure(raw, preferences, evaluationFeedback?)`
- `usePageGeneration.ts` failing-grade path

### Task 6: Progress labels and broader verification

task: normalize progress states and verify broader regression set

task_group: UI reliability + test verification

task_outcome: success

Preference signals:
- user explicitly wanted a progress bar while consulting Karl -> show a visible in-flight state for remediation

Reusable knowledge:
- `chatStream.ts` uses `Generating draft` rather than older Karl-specific progress text.
- `usePageGeneration.ts` now sets `Consulting Karl...` before remediation fetch begins.
- The hook test asserts the visible progress state during remediation.
- Broader verification passed after rerunning one Vitest command with escalation because of sandbox `esbuild` spawn `EPERM`.

Failures and how to do differently:
- In this environment, a broader Vitest run may need escalation when esbuild is spawned; the first non-escalated run can fail even if the code is fine.

References:
- `src/services/chatStream.ts`
- `src/hooks/usePageGeneration.ts` progress labels
- `src/hooks/usePageGeneration.test.ts` progress-state regression
- `npm test -- src/services/pageParser.test.ts src/services/chatStream.test.ts src/utils.test.ts` (passed after escalation rerun)

## Thread `019df5d6-db09-7671-98d2-1e7922bc62f5`
updated_at: 2026-05-05T03:21:53+00:00
cwd: \\?\C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
rollout_path: C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T18-53-12-019df5d6-db09-7671-98d2-1e7922bc62f5.jsonl
rollout_summary_file: 2026-05-05T01-53-11-rftr-ai_route_validation_and_rate_limiting_worktree.md

---
description: HHVC app rollout to recommend npm packages, then implement Zod-backed AI-route validation and route-specific rate limiting in an isolated worktree; key takeaway is to use the project-local `.worktrees/` checkout, avoid concurrent `npm install` + `npm test`, and verify AI-route changes with `npm test -- src/server.api.test.ts`.
task: recommend npm packages and implement AI route validation/rate limiting
task_group: C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
task_outcome: uncertain
cwd: C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
keywords: npm recommendations, zod, express-rate-limit, react-query, msw, worktree, .worktrees, vitest, supertest, server.js, request schemas, rate limiting, baseline test race, debug/compression, trust proxy
---

### Task 1: Install runtime dependencies and dependency test

task: add zod and express-rate-limit to package.json and verify them in src/server.api.test.ts
task_group: dependency setup / test harness
task_outcome: success

Preference signals:
- user accepted the narrowed plan flow (“yes”, “you decide”) after receiving package recommendations -> comfortable with staged, agent-led narrowing once enough context is gathered.

Reusable knowledge:
- project-local `.worktrees/` exists and is ignored; use it for isolated implementation branches.
- running `npm install` and `npm test` at the same time in the new worktree produced a misleading partial-install failure involving `compression`/`debug`; rerun serially.
- focused API smoke test command: `npm test -- src/server.api.test.ts`.

Failures and how to do differently:
- initial top-level dependency expectations were brittle; move dependency checks into a named Vitest test and also verify runtime importability.

References:
- `git worktree add .worktrees/ai-route-hardening -b feature/ai-route-hardening`
- baseline error: `Cannot find module ... node_modules/compression/node_modules/debug/src/index.js`
- commits: `759dce8...`, `4eeb16c...`

### Task 2: Add request schema module and boundary tests

task: create lib/requestSchemas.js and add direct schema/helper tests in src/server.api.test.ts
task_group: validation schema / test coverage
task_outcome: success

Preference signals:
- user repeatedly approved the design and plan steps -> staged review gates were acceptable for this feature.

Reusable knowledge:
- `lib/requestSchemas.js` exports `chatRequestSchema`, `evaluateRequestSchema`, `improveStructureRequestSchema`, and `parseRequestBody`.
- keep the schema shallow and non-mutating; whitespace-only values should be rejected without changing the original strings.
- `images` should remain shallow at the boundary so malformed image entries do not reject the whole chat request before server integration.
- direct in-process tests should cover the schema/helper module itself, not just route-level red assertions.

Failures and how to do differently:
- `z.string().trim()` was too mutation-heavy for boundary parsing; use validation that preserves the original input.
- over-modeling `images` caused unnecessary strictness relative to current server behavior.
- route-level red tests needed several iterations to ensure they stayed red for intended reasons and did not depend on unrelated live upstream behavior.

References:
- schema/helper module: `lib/requestSchemas.js`
- focused test file: `src/server.api.test.ts`
- task commits: `ab33602...`, `e83565c...`, `f74a9c9...`, `12f1b49...`, `d7aae71...`, `b8e2648...`, `aab52cd...`

### Task 3: Integrate validation and route-specific AI throttling

task: wire parseRequestBody and express-rate-limit into server.js for the three AI routes
task_group: Express API hardening
task_outcome: success

Preference signals:
- the user accepted the staged flow and did not ask to broaden scope beyond the three expensive AI routes -> keep enforcement narrow and localized.

Reusable knowledge:
- `server.js` should use `parseRequestBody(...)` at the top of `/api/chat`, `/api/evaluate`, and `/api/improve-structure`.
- route-specific limiter instances should remain route-specific even if thresholds are shared.
- `app.set("trust proxy", 1)` was added for proxy/IP consistency and limiter tests.
- the repeated `/api/chat` limiter regression test belongs in `src/server.api.test.ts`.

Failures and how to do differently:
- reusing one limiter instance across two routes violated the “route-specific middleware” requirement; keep separate middleware objects.
- rebuilding the chat upstream body from a cleaned parsed object can accidentally reintroduce boundary-only fields; preserve the cleaned downstream payload shape.

References:
- main integration commit: `9de75969bb734355efece55001cc0d1758605b81`
- follow-up cleanup commit: `418ec84481e69ed07f3a80a03074a43ee2345597`
- Task 3 focused test result: `10 tests passed`

### Task 4: Final verification / branch closeout

task: verify the AI route hardening rollout end state
task_group: verification
ntask_outcome: uncertain

Reusable knowledge:
- end-to-end rollout verification centered on `npm test -- src/server.api.test.ts` in the feature worktree.
- final branch closeout was not reached in the captured rollout, so do not treat the rollout as fully wrapped up.

References:
- worktree: `C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing\.worktrees\ai-route-hardening`
- branch: `feature/ai-route-hardening`

## Thread `019df644-d463-7ab2-8fbd-ce972f85656d`
updated_at: 2026-05-05T04:14:45+00:00
cwd: \\?\C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
rollout_path: C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T20-53-19-019df644-d463-7ab2-8fbd-ce972f85656d.jsonl
rollout_summary_file: 2026-05-05T03-53-19-XgId-hhvc_content_model_separation_file_backed_refactor_postgres.md

---
description: Normalized the HHVC content model and file-backed persistence, but left the Postgres/Neon path for follow-up; future work should extend the same concept/IA/artifact split to live DB tables and routes.
task: Refactor HHVC content model and persistence separation; then update Postgres/Neon path
task_group: hhvc-content-design-tool
task_outcome: partial
cwd: C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
keywords: PageConcept, IANode, PageArtifact, ArtifactVersion, ArtifactVariant, ReferenceExample, BuildQueueItem, NeonDB, Postgres, file-backed persistence, planned_pages, page_versions, todos, reference-only, execution queue, duplicate title detection, placeholder titles, migration
---

### Task 1: Normalize HHVC content model and persistence

task: Refactor HHVC content system logic separation and persistence boundaries
task_group: content-architecture / persistence
task_outcome: partial

Preference signals:
- when the user said the problem was a “product-architecture problem, not just a content cleanup exercise,” they want future work to separate concepts, IA, artifacts, references, workflow, and queue state rather than patching symptoms.
- when the user selected Ideal Map as “Reference Only (Recommended),” they want Ideal Map to stay benchmark-only and not mix with working IA or drafts.
- when the user selected Generate as “Anchor by Default (Recommended),” they want generation to start from canonical intent when possible, with experiments clearly labeled instead of freeform drift.
- when the user selected “Execution Queue (Recommended)” for pages to build, they want backlog state kept operational and separate from canonical site structure.

Reusable knowledge:
- Legacy file-backed state in `lib/persistence.js` had overloaded tables/arrays (`pages`, `planned_pages`, `todos`, `page_versions`) and needed a normalization pass to keep the old routes working while introducing the new model.
- The file-backed migration can derive canonical concepts from legacy planned pages, IA nodes from planned-page parent links, artifacts from legacy pages, artifact versions from legacy page versions, and build queue items from legacy todos.
- New shared helpers in `src/utils/contentModel.ts` and `lib/contentModel.js` provide title normalization, intent-key generation, content-type mapping, placeholder detection, duplicate-concept detection, and workflow labeling.
- New normalized UI/API types were introduced in `src/types.ts`: `PageConcept`, `IANode`, `PageArtifact`, `ArtifactVersion`, `ArtifactVariant`, `ReferenceExample`, `BuildQueueItem`.
- The UI now treats Site Plan as canonical concepts, Ideal Map as reference-only, Library as artifact management, and build queue items as operational work rather than IA.

Failures and how to do differently:
- The live Postgres/Neon path was not fully updated in this rollout. `lib/persistence.js` normalized the file store, but the SQL schema and CRUD methods still need equivalent `page_concepts`, `ia_nodes`, `page_artifacts`, `artifact_versions`, `artifact_variants`, `reference_examples`, and `build_queue_items` tables/queries.
- Verification should not stop at passing file-backed tests; add DB-mode coverage or a Neon/Postgres smoke test before declaring the refactor complete.
- `npx tsc --noEmit` surfaced unrelated existing test debt in `src/services/pageParser.test.ts` (`utils` undefined); do not treat that as part of the refactor unless touching that file intentionally.

References:
- `lib/persistence.js` now has file-store migration helpers and normalized record mappers, but the Postgres branch still uses the legacy tables and needs the same conceptual split.
- `server.js` normalized endpoints exist already, so the DB path can be aligned to the same API contract rather than inventing a second shape.
- Successful targeted verification: `npm test -- src/components/IdealSiteMap.test.tsx src/server.api.test.ts`.
- Remaining user request at end of rollout: “update the postgres path so that neondb will work”.

## Thread `019e0055-5659-74e2-bbf6-741832f8fa8a`
updated_at: 2026-05-07T04:33:30+00:00
cwd: \\?\C:\Users\david\projects\ScaryJubilantParallelprocessing
rollout_path: C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl
rollout_summary_file: 2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md

---
description: VS Code workspace baseline plus canonical IA inspector and Karl-aware section metadata; repo uses nested app root, dual-process dev script, and live `hhvc-working` IA review
---
task: setup vscode workspace baseline and inspect dev topology
task_group: repo-setup
 task_outcome: success
cwd: C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing
keywords: vscode, settings.json, tasks.json, launch.json, typescript tsdk, vitest, vite, express, dual-process dev, port 5000, port 5001, .gitignore

### Task 1: VS Code workspace baseline
 task: committed .vscode baseline for nested app root
 task_group: repo-setup
 task_outcome: success

Preference signals:
- user chose "Repo .vscode (Recommended)" and "Current only (Recommended)" -> default to committed workspace files that track the repo’s existing stack, not extra lint/format tooling
- user chose "Balanced" -> workspace should be ready and low-noise, not heavily opinionated

Reusable knowledge:
- actual app root is the nested `ScaryJubilantParallelprocessing` folder, not the parent container directory
- `npm run dev` runs `scripts/dev.mjs`, which launches both `server.js` and Vite
- Vite can fall back from `5000` to `5001` when port 5000 is occupied

Failures and how to do differently:
- initial workspace config assumed fixed ports too early; later verification showed port-bumping behavior, so launch/task readiness should tolerate dynamic Vite ports
- full repo tests were unrelatedly red during early verification, so do not treat early failures as evidence that editor config is broken

References:
- `.vscode/extensions.json`, `.vscode/settings.json`, `.vscode/tasks.json`, `.vscode/launch.json`
- `.gitignore` updated to allow committing only those `.vscode` files
- `scripts/dev.mjs`
- live startup examples: `Local: http://localhost:5000/` and earlier `Local: http://localhost:5001/`

### Task 2: Commit and push workspace baseline
 task: git commit/push workspace editor files
 task_group: git
 task_outcome: success

Preference signals:
- user explicitly asked to "commit and push" -> when implementation is complete, preserve it in git and push if possible

Reusable knowledge:
- stale `.git/index.lock` blocked the first commit attempt; retrying after the lock disappeared worked
- repository was on `main` with `origin/main`

Failures and how to do differently:
- if `git commit` fails with `index.lock`, check for active git processes and retry after the stale lock clears rather than assuming repo corruption

References:
- commit `00b1170` `Add VS Code workspace baseline`
- `git push origin main` reported `Everything up-to-date` after the commit because `origin/main` already had the latest pushed state

### Task 3: stale worktree and branch cleanup
 task: prune stale worktree registrations and remove zero-diff local branches
 task_group: git/worktrees
 task_outcome: success

Preference signals:
- user asked about other worktrees/branches, then asked to clean up stale worktrees -> check both branch inventory and worktree metadata before deleting anything

Reusable knowledge:
- `git worktree prune --verbose` removed stale registrations whose gitdir pointed to a non-existent location
- `git branch -vv` is useful after prune to confirm branches are no longer attached to dead worktrees
- `feature/ai-route-hardening` still contained its commit history after prune and was later pushed to `origin/feature/ai-route-hardening`

Failures and how to do differently:
- `git worktree list` could still echo stale paths even after prune, so confirm cleanup with `git branch -vv` and actual branch refs before concluding history is lost
- do not delete a substantive branch until it is preserved remotely or otherwise intentionally retained

References:
- pruned stale worktree metadata for `worktrees/ai-route-hardening` and `worktrees/copilot-worktree-2026-05-05T01-12-50`
- deleted local branches: `claude/inspiring-wilbur-c3c98d`, `copilot/worktree-2026-05-05T01-12-50`
- pushed branch: `origin/feature/ai-route-hardening`

### Task 4: live canonical IA inspector
 task: add read-only live canonical IA inspector under Site Plan
 task_group: hhvc canonical ia
 task_outcome: success

Preference signals:
- user wanted the repo cleaned up in stages and accepted the notion of reviewing the canonical IA before touching page artifacts -> separate structural review from content review
- user had not reviewed `page_artifacts` yet -> do not seed real content bodies too early

Reusable knowledge:
- `Site Plan` is the `/plan` route
- `useProjectModel()` already hydrates live model data; the inspector could use concepts + nodes without creating a broader app state surface
- live inspector compares persisted `hhvc-working` data to local seed expectations and can show drift/orphans

Failures and how to do differently:
- a separate workspace surface was unnecessary; keeping the inspector under the existing plan/map tab was simpler and matched the current app structure
- avoid expanding global state unless other pages need the data; the inspector can be mostly self-contained

References:
- `src/pages/PlanPage.tsx`
- `src/components/CanonicalIaInspector.tsx`
- `src/utils/canonicalIa.ts`
- `src/canonicalIa.test.ts`
- full verification later passed: `20` test files, `122` tests

### Task 5: consult Karl MCP and add section metadata
 task: consult Karl docs and encode manual section metadata in canonical IA seed
 task_group: hhvc canonical ia / karl
 task_outcome: success

Preference signals:
- user explicitly asked "consult karl mcp before proceeding" -> future IA metadata changes should check Karl docs first
- user said they had not reviewed page artifacts -> prefer metadata-first structural review rather than content-body seeding

Reusable knowledge:
- Karl Topic pages can use child topics, manual `services`, and manual `resources`
- transactions/step-by-steps tagged to a topic appear under `More services`
- Related pages only support `Transaction`, `Information`, `Campaign`, `Topic`
- Resources sections are supported on `About`, `Campaign`, `Resource collection`, `Topic`
- the correct canonical model should distinguish `auto_service` from `manual_section`, and `services` from `resources`

Failures and how to do differently:
- first draft used a looser `manual_support` notion; Karl guidance made it clear the model should be explicit about section surface and headings
- `Related` should stay separate from structural IA; do not treat it as generic placement metadata

References:
- Karl docs:
  - Topic: https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/building-a-page-by-content-type/topic
  - Topics: https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/topics
  - Related: https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/related
  - Resources: https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/components/resources
  - Choosing a content type: https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/choosing-a-content-type
- commit `baca0cb` `Add Karl section metadata to canonical IA`
- updated fixture: `src/data/hhvcCanonicalWorkingIaSeed.ts`
- updated test: `src/hhvcCanonicalWorkingIaSeed.test.ts`
- updated inspector: `src/components/CanonicalIaInspector.tsx`

### Task 6: run dev server and expose Site Plan URL
 task: verify local dev stack and site plan route
 task_group: dev server / app review
 task_outcome: success

Preference signals:
- user asked to "show me the site plan page" and then to start the dev stack -> future similar asks should provide the exact route and local URL, not pretend the browser UI is directly renderable in terminal

Reusable knowledge:
- final live startup showed Vite at `http://localhost:5000/` and API at `http://localhost:3001`
- `Site Plan` is reachable at `http://localhost:5000/plan`
- when the port is busy, Vite may shift, so read logs instead of hardcoding the frontend URL

Failures and how to do differently:
- the terminal cannot render the browser UI directly; use the dev logs and give the exact URL instead

References:
- dev log showed:
  - `VITE v5.4.21 ready`
  - `Local: http://localhost:5000/`
  - `API server running on port 3001`
- `src/pages/PlanPage.tsx` composes the live inspector into the existing plan/map workspace
- `scripts/dev.mjs` handles dual-process startup and the `--no-open` hook-like behavior

