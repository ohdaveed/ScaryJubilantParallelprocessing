# Task Group: ScaryJubilantParallelprocessing canonical IA inspector / Karl metadata review flow
scope: covers live canonical IA inspection, Karl-aware section metadata, and local dev URL verification for the HHVC app's Site Plan workflow
applies_to: cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing; reuse_rule=safe for the same repo and closely related canonical-IA review work in this checkout family, but treat live URLs, fixture semantics, and inspector surfaces as checkout-specific

## Task 1: Add live canonical IA inspector under Site Plan, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; read-only inspector added to the existing plan workspace)

### keywords

- Site Plan, /plan, CanonicalIaInspector, src/pages/PlanPage.tsx, src/components/CanonicalIaInspector.tsx, src/utils/canonicalIa.ts, useProjectModel, hhvc-working, orphan counts, expected-vs-live counts

## Task 2: Consult Karl docs and encode manual section metadata in canonical IA seed, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; Karl section surfaces encoded in the canonical seed and inspector)

### keywords

- Karl MCP, manual_section, auto_service, services, resources, section headings, section order, src/data/hhvcCanonicalWorkingIaSeed.ts, src/hhvcCanonicalWorkingIaSeed.test.ts, Related pages, Topic pages, More services

## Task 3: Verify dev stack and provide exact Site Plan URL, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; dual-process dev startup checked and Site Plan URL surfaced)

### keywords

- npm run dev -- --no-open, scripts/dev.mjs, VITE v5.4.21 ready, Local: http://localhost:5000/, API server running on port 3001, http://localhost:5000/plan, dual-process dev, port 5001

## User preferences

- when choosing the next cleanup layer, the user accepted reviewing the canonical IA before touching `page_artifacts` -> separate structural review from content review instead of mixing them in one pass [Task 1]
- when the user said they had not reviewed `page_artifacts` yet -> avoid seeding real content bodies too early and prefer metadata-first structural review [Task 1][Task 2]
- when the user explicitly asked "consult karl mcp before proceeding" -> future IA metadata changes in this repo should check Karl guidance before encoding semantics [Task 2]
- when the user asked to "show me the site plan page" and then start the dev stack -> provide the exact local URL and route instead of pretending the browser UI is directly renderable in terminal output [Task 3]

## Reusable knowledge

- `Site Plan` is the `/plan` route, and the inspector fit best as a read-only addition inside `src/pages/PlanPage.tsx` rather than a separate workspace surface [Task 1][Task 3]
- `useProjectModel()` already hydrates the live model data needed for the inspector, so the smallest useful change was to derive the tree from live concepts/nodes instead of adding broader app state [Task 1]
- The inspector workflow compares persisted `hhvc-working` data to local seed expectations and surfaces drift/orphans, which makes it the first place to look before editing page artifacts [Task 1]
- Karl guidance in this repo is specific: Topic pages can use child topics plus manual `services` and `resources`; transactions and step-by-steps tagged to a topic appear under `More services`; Related pages only support `Transaction`, `Information`, `Campaign`, and `Topic`; Resources sections are supported on `About`, `Campaign`, `Resource collection`, and `Topic` [Task 2]
- The canonical model should distinguish `auto_service` from `manual_section`, and `services` from `resources`, instead of collapsing them into a looser support concept [Task 2]
- The dev stack is dual-process: `npm run dev` runs `scripts/dev.mjs`, which starts both `server.js` and Vite; the final verified frontend/API pair in this rollout was `http://localhost:5000/` and `http://localhost:3001` [Task 3]

## Failures and how to do differently

- Symptom: IA review work sprawls into extra UI/state surface area. Cause: treating the inspector as a separate workspace feature instead of an inspection layer on the existing plan route. Fix: keep the inspector under `Site Plan` unless another page truly needs the data [Task 1]
- Symptom: metadata naming gets fuzzy and stops matching Karl's editable surfaces. Cause: using umbrella concepts like `manual_support`. Fix: encode explicit section surfaces, headings, and placement semantics after checking Karl docs [Task 2]
- Symptom: the reported frontend URL is wrong or stale. Cause: hardcoding the Vite port instead of reading the startup logs. Fix: read the live `npm run dev` logs and report the actual route, because Vite can shift from `5000` to `5001` when the port is occupied [Task 3]

# Task Group: ScaryJubilantParallelprocessing VS Code workspace baseline / git worktree hygiene
scope: covers repo-tracked VS Code setup for the nested app root, commit/push expectations, and safe cleanup of stale worktree metadata and zero-diff local branches
applies_to: cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing; reuse_rule=safe for the same repo checkout family, but treat branch names, remote state, and transient lock behavior as point-in-time

## Task 1: Commit a balanced repo-tracked VS Code baseline for the nested app root, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; committed `.vscode` baseline for the nested app root)

### keywords

- .vscode/extensions.json, .vscode/settings.json, .vscode/tasks.json, .vscode/launch.json, .gitignore, typescript tsdk, vitest, vite, express, scripts/dev.mjs, Local: http://localhost:5001/, Local: http://localhost:5000/

## Task 2: Commit/push the workspace baseline after transient git lock handling, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; commit `00b1170` and push behavior captured)

### keywords

- git commit, git push origin main, index.lock, 00b1170, Add VS Code workspace baseline, origin/main, Everything up-to-date

## Task 3: Prune stale worktree metadata and preserve substantive branches remotely, completed

### rollout_summary_files

- rollout_summaries/2026-05-07T02-47-33-SePo-vs_code_workspace_and_canonical_ia_karl_section_metadata.md (cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\06\rollout-2026-05-06T19-47-33-019e0055-5659-74e2-bbf6-741832f8fa8a.jsonl, updated_at=2026-05-07T04:33:30+00:00, thread_id=019e0055-5659-74e2-bbf6-741832f8fa8a, success; stale registrations removed and `feature/ai-route-hardening` preserved on origin)

### keywords

- git worktree prune --verbose, git worktree list, git branch -vv, prunable, feature/ai-route-hardening, origin/feature/ai-route-hardening, claude/inspiring-wilbur-c3c98d, copilot/worktree-2026-05-05T01-12-50

## User preferences

- when the user chose `Repo .vscode (Recommended)` and `Current only (Recommended)` -> default to committed workspace files that track the repo's existing stack, not extra lint/format tooling [Task 1]
- when the user chose `Balanced` -> keep editor setup ready and low-noise rather than heavily opinionated [Task 1]
- when the user explicitly asked to "commit and push" -> preserve completed implementation work in git and push it when possible instead of leaving it only in the local checkout [Task 2]
- when the user asked about other worktrees/branches and then to clean up stale worktrees -> inspect both branch inventory and worktree metadata before deleting anything [Task 3]

## Reusable knowledge

- The actual app root is the nested `C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing` folder, not the parent container directory [Task 1]
- `npm run dev` launches `scripts/dev.mjs`, which starts both `server.js` and Vite; editor tasks and launch configs should reflect that dual-process topology [Task 1]
- Vite can fall back from `5000` to `5001` when the preferred port is occupied, so launch/task readiness should tolerate dynamic frontend ports [Task 1]
- The repo-tracked workspace set in this rollout was `.vscode/extensions.json`, `.vscode/settings.json`, `.vscode/tasks.json`, and `.vscode/launch.json`, with `.gitignore` updated to allow only those files from `.vscode/` [Task 1]
- `git worktree prune --verbose` removes stale registrations whose gitdir points at a non-existent location, and `git branch -vv` is the right follow-up to confirm branches are no longer attached to dead worktrees [Task 3]
- `feature/ai-route-hardening` still contained its commit history after prune and was preserved by pushing `origin/feature/ai-route-hardening` before deleting unrelated zero-diff local branches [Task 3]

## Failures and how to do differently

- Symptom: workspace launch settings become brittle. Cause: assuming fixed frontend ports before reading the actual dev startup behavior. Fix: design the VS Code baseline around the dual-process dev script and dynamic Vite ports [Task 1]
- Symptom: an early `npm test` failure gets mistaken for editor-config breakage. Cause: unrelated pre-existing test failures were present during the first verification pass. Fix: separate workspace-config verification from unrelated suite debt [Task 1]
- Symptom: `git commit` fails with `index.lock`. Cause: a stale or transient lock file from concurrent git activity. Fix: check for active git processes and retry after the lock disappears instead of assuming repo corruption [Task 2]
- Symptom: stale worktree paths look like lost history. Cause: `git worktree list` can still echo prunable paths even after prune. Fix: confirm cleanup with `git branch -vv` and actual branch refs before concluding history was lost, and do not delete a substantive branch until it is preserved remotely [Task 3]

# Task Group: ScaryJubilantParallelprocessing AI route validation / route-specific rate limiting
scope: covers Zod-backed request validation and route-specific throttling for the three expensive AI routes, implemented in a project-local worktree with focused API verification
applies_to: cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing; reuse_rule=safe for the same app or closely related Express API hardening work, but treat branch names, worktree paths, and exact route contracts as checkout-specific

## Task 1: Add validation dependencies and establish a reliable focused API baseline, completed

### rollout_summary_files

- rollout_summaries/2026-05-05T01-53-11-rftr-ai_route_validation_and_rate_limiting_worktree.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T18-53-12-019df5d6-db09-7671-98d2-1e7922bc62f5.jsonl, updated_at=2026-05-05T03:21:53+00:00, thread_id=019df5d6-db09-7671-98d2-1e7922bc62f5, success; `zod` and `express-rate-limit` added after serial baseline rerun)

### keywords

- zod, express-rate-limit, .worktrees/ai-route-hardening, git worktree add, npm test -- src/server.api.test.ts, compression, debug, runtime importability, Vitest dependency test

## Task 2: Create shallow request schemas and direct boundary tests, completed

### rollout_summary_files

- rollout_summaries/2026-05-05T01-53-11-rftr-ai_route_validation_and_rate_limiting_worktree.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T18-53-12-019df5d6-db09-7671-98d2-1e7922bc62f5.jsonl, updated_at=2026-05-05T03:21:53+00:00, thread_id=019df5d6-db09-7671-98d2-1e7922bc62f5, success; `lib/requestSchemas.js` and direct schema/helper tests added)

### keywords

- lib/requestSchemas.js, chatRequestSchema, evaluateRequestSchema, improveStructureRequestSchema, parseRequestBody, whitespace-only values, z.string().trim(), images, passthrough, src/server.api.test.ts

## Task 3: Integrate parseRequestBody and route-specific limiter middleware into server.js, completed

### rollout_summary_files

- rollout_summaries/2026-05-05T01-53-11-rftr-ai_route_validation_and_rate_limiting_worktree.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T18-53-12-019df5d6-db09-7671-98d2-1e7922bc62f5.jsonl, updated_at=2026-05-05T03:21:53+00:00, thread_id=019df5d6-db09-7671-98d2-1e7922bc62f5, success; validation and throttling wired into `/api/chat`, `/api/evaluate`, and `/api/improve-structure`)

### keywords

- server.js, /api/chat, /api/evaluate, /api/improve-structure, parseRequestBody, express-rate-limit, app.set("trust proxy", 1), repeated /api/chat limiter regression test, route-specific middleware

## Task 4: Final branch closeout remained incomplete, partial

### rollout_summary_files

- rollout_summaries/2026-05-05T01-53-11-rftr-ai_route_validation_and_rate_limiting_worktree.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T18-53-12-019df5d6-db09-7671-98d2-1e7922bc62f5.jsonl, updated_at=2026-05-05T03:21:53+00:00, thread_id=019df5d6-db09-7671-98d2-1e7922bc62f5, partial; focused verification passed but branch-finish state was not captured)

### keywords

- feature/ai-route-hardening, 10 tests passed, final regression verification, branch closeout, review gates, worktree

## User preferences

- after package recommendations, the user accepted the narrowed plan flow with "yes" and "you decide" -> staged, agent-led narrowing is acceptable once enough context is gathered [Task 1]
- during implementation planning and review, the user repeatedly approved the staged flow -> review gates and incremental steps were acceptable for this feature [Task 2][Task 3]
- the user did not ask to broaden scope beyond the three expensive AI routes -> keep enforcement narrow and localized rather than using this work as a pretext for broader server cleanup [Task 3]

## Reusable knowledge

- This repo already had a project-local `.worktrees/` directory that was ignored, so it was the right place for isolated implementation branches like `.worktrees/ai-route-hardening` [Task 1]
- The focused smoke test for API-boundary work here is `npm test -- src/server.api.test.ts`; it was the main baseline and final verification command across the rollout [Task 1][Task 4]
- `lib/requestSchemas.js` owns the shared boundary contract for the AI routes and exports `chatRequestSchema`, `evaluateRequestSchema`, `improveStructureRequestSchema`, and `parseRequestBody` [Task 2]
- Keep the schema shallow and non-mutating: reject whitespace-only values without changing original strings, and keep `images` shallow so malformed image entries do not reject the whole chat request before server integration [Task 2]
- `server.js` should call `parseRequestBody(...)` at the top of `/api/chat`, `/api/evaluate`, and `/api/improve-structure`, and the limiter middleware should remain route-specific even when thresholds are shared [Task 3]
- `app.set("trust proxy", 1)` was needed for consistent IP-based throttling and limiter tests in this implementation path [Task 3]

## Failures and how to do differently

- Symptom: a new worktree shows module-resolution failures like `Cannot find module ... node_modules/compression/node_modules/debug/src/index.js`. Cause: `npm install` and `npm test` were run concurrently, leaving a partially populated `node_modules` tree. Fix: serialize install and test work in the worktree and rerun the focused API suite [Task 1]
- Symptom: dependency verification is brittle or unclear. Cause: using top-level expectations instead of a named test that proves runtime importability. Fix: put dependency checks in a focused Vitest test and verify the runtime import path too [Task 1]
- Symptom: boundary validation mutates content or over-rejects requests. Cause: using `z.string().trim()` or over-modeling `images`. Fix: preserve original strings, reject whitespace-only values without rewriting them, and keep `images` shallow at the route boundary [Task 2]
- Symptom: route-level red tests fail for the wrong reasons. Cause: they accidentally depend on unrelated upstream behavior instead of the intended boundary condition. Fix: keep direct in-process schema/helper tests alongside route tests so the intended contract is exercised explicitly [Task 2]
- Symptom: the rate limiter technically works but violates the stated requirement. Cause: reusing one limiter instance across multiple routes. Fix: keep separate middleware objects for `/api/chat`, `/api/evaluate`, and `/api/improve-structure` even if the thresholds match [Task 3]
- Symptom: parsed request cleanup leaks back into the downstream payload. Cause: rebuilding the chat upstream body from a cleaned parsed object in a way that reintroduces boundary-only fields. Fix: preserve the cleaned downstream payload shape after `parseRequestBody(...)` [Task 3]
- Symptom: the rollout looks complete because focused tests pass. Cause: the captured session ended before branch-finish and closeout were verified. Fix: treat this memory as implementation guidance plus focused verification, not as evidence of final branch completion [Task 4]

# Task Group: ScaryJubilantParallelprocessing HHVC content architecture / persistence split
scope: covers the HHVC content-model refactor in the React/Express app, especially separation between canonical concepts, IA placement, artifacts, references, workflow state, and build queue, plus the remaining Neon/Postgres follow-up boundary
applies_to: cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing; reuse_rule=safe for the same app or closely related HHVC content-system work, but treat table names, routes, and migration details as checkout-specific until the DB path is verified

## Task 1: Refactor HHVC content model and file-backed persistence; Postgres/Neon follow-up remains, partial

### rollout_summary_files

- rollout_summaries/2026-05-05T03-53-19-XgId-hhvc_content_model_separation_file_backed_refactor_postgres.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\04\rollout-2026-05-04T20-53-19-019df644-d463-7ab2-8fbd-ce972f85656d.jsonl, updated_at=2026-05-05T04:14:45+00:00, thread_id=019df644-d463-7ab2-8fbd-ce972f85656d, partial; file-backed normalization landed, DB path still pending)

### keywords

- PageConcept, IANode, PageArtifact, ArtifactVersion, ArtifactVariant, ReferenceExample, BuildQueueItem, lib/persistence.js, src/utils/contentModel.ts, lib/contentModel.js, /api/page-concepts, /api/ia-nodes, /api/page-artifacts, /api/artifact-variants, /api/reference-examples, /api/build-queue, planned_pages, page_versions, NeonDB, Postgres, duplicate canonical concepts, placeholder canonical titles

## User preferences

- when the user framed this as a "product-architecture problem, not just a content cleanup exercise" -> default to separating concept, record, content type, IA placement, workflow state, version history, references, and build queue instead of patching overloaded objects [Task 1]
- when the user selected `Ideal Map` as "Reference Only" -> keep benchmark/reference IA separate from the working canonical IA and drafts [Task 1]
- when the user selected `Generate` as "Anchor by Default" -> start generation from canonical intent when possible and label experiments instead of letting the workflow drift freeform [Task 1]
- when the user selected `pages to build` as an "Execution Queue" -> keep backlog state operational and separate from canonical site structure [Task 1]
- when the rollout ended, the user explicitly asked: "update the postgres path so that neondb will work" -> treat file-backed completion as insufficient if the live DB path remains on the legacy model [Task 1]

## Reusable knowledge

- The pre-refactor bleed pattern was concrete: `PageDraft` mixed content, workflow, review, version hints, and skeleton/import flags; `PlannedPage` acted as both architecture and backlog; `IdealSiteMap` grouped working pages by heuristics instead of a distinct IA model [Task 1]
- The normalized content vocabulary now lives in `src/types.ts`: `PageConcept`, `IANode`, `PageArtifact`, `ArtifactVersion`, `ArtifactVariant`, `ReferenceExample`, and `BuildQueueItem` [Task 1]
- Shared normalization helpers were added in both TS and JS forms: `src/utils/contentModel.ts` and `lib/contentModel.js`; use those as the naming and validation source of truth before touching routes or persistence again [Task 1]
- `lib/persistence.js` already migrates the file-backed store by deriving canonical concepts from legacy `planned_pages`, IA nodes from planned-page parent links, artifacts from legacy `pages`, artifact versions from legacy `page_versions`, and build queue items from legacy `todos` [Task 1]
- `server.js` already exposes the normalized API contract through `/api/page-concepts`, `/api/ia-nodes`, `/api/page-artifacts`, `/api/artifact-variants`, `/api/reference-examples`, and `/api/build-queue`; align the DB path to this contract instead of inventing a second response shape [Task 1]
- The UI intent after the refactor is explicit: Site Plan is canonical concepts, Ideal Map is benchmark-only, Library manages artifacts by role, and build queue items are operational work rather than IA [Task 1]
- Targeted verification that passed in this rollout was `npm test -- src/components/IdealSiteMap.test.tsx src/server.api.test.ts`; that is the quickest regression check for the normalized file-backed path and the exposed API surface [Task 1]

## Failures and how to do differently

- Symptom: a refactor appears complete because file-backed tests pass, but Neon/Postgres still behaves like the legacy model. Cause: only `lib/persistence.js` was normalized while the SQL schema and CRUD methods stayed old. Fix: mirror the same conceptual split in live DB tables and queries for `page_concepts`, `ia_nodes`, `page_artifacts`, `artifact_versions`, `artifact_variants`, `reference_examples`, and `build_queue_items` before calling the refactor done [Task 1]
- Symptom: canonical architecture drifts back into overloaded records. Cause: queue state, IA placement, references, and artifacts get stored on the same object for convenience. Fix: keep the user's product-architecture split visible and reject shortcuts that recombine those concerns [Task 1]
- Symptom: verification noise makes the refactor look broken when the changed path is actually fine. Cause: `npx tsc --noEmit` still fails on unrelated pre-existing errors in `src/services/pageParser.test.ts` (`Cannot find name 'utils'`). Fix: treat that as separate repo debt unless the task intentionally edits that test file, and add DB-mode coverage or a Neon/Postgres smoke test for the real remaining gap [Task 1]

# Task Group: ScaryJubilantParallelprocessing AI generation reliability / Karl-first remediation pipeline
scope: covers Karl-compliant page generation quality work in the React/Express app, including first-pass local standards, deterministic validation, bounded retries, failing-grade remediation, and visible progress states
applies_to: cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing; reuse_rule=safe for the same app or closely related generation-pipeline work, but treat file paths, tests, and endpoint contracts as checkout-specific

## Task 1: Add richer local Karl standards for first-pass generation, completed

### rollout_summary_files

- rollout_summaries/2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl, updated_at=2026-05-03T22:57:06+00:00, thread_id=019defe9-e370-79d2-9579-b4052cada13a, success; local-first Karl standards)

### keywords

- Karl MCP, src/karlStandards.ts, KARL_PROMPT_SECTION, buildGenerationUserPrompt, VALID KARL PAGE TYPES, VALID KARL COMPONENTS, TRANSACTION REQUIRED SECTIONS

## Task 2: Add deterministic validation and cap automatic retries at two, completed

### rollout_summary_files

- rollout_summaries/2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl, updated_at=2026-05-03T22:57:06+00:00, thread_id=019defe9-e370-79d2-9579-b4052cada13a, success; hard-rule validation plus bounded retry loop)

### keywords

- src/generationValidation.ts, GenerationValidationResult, validateGeneratedPage, invalid page type, placeholder leakage, MAX_GENERATION_RETRIES = 2, buildRetryPrompt, usePageGeneration.ts

## Task 3: Add server-side Karl remediation endpoint and safe helper stub, completed

### rollout_summary_files

- rollout_summaries/2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl, updated_at=2026-05-03T22:57:06+00:00, thread_id=019defe9-e370-79d2-9579-b4052cada13a, success; server-only Karl escalation path)

### keywords

- /api/karl-remediate, server.js, lib/karlMcp.js, fetchKarlGuidance, consulted: false, guidance: [], src/server.api.test.ts

## Task 4: Use Karl remediation only after failing evaluation and feed guidance into rewrite, completed

### rollout_summary_files

- rollout_summaries/2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl, updated_at=2026-05-03T22:57:06+00:00, thread_id=019defe9-e370-79d2-9579-b4052cada13a, success; hybrid local-first, remote-escalation rewrite flow)

### keywords

- evaluateQualityGate, review_required, fetchKarlRemediation, improveStructure(raw, preferences, evaluationFeedback?), failing-grade path, evaluationFeedback, guidance merge

## Task 5: Normalize progress labels and verify regression coverage, completed

### rollout_summary_files

- rollout_summaries/2026-05-03T22-16-15-J95E-ai_generation_quality_reliability_karl_first_mcp_escalation.md (cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing, rollout_path=C:\Users\david\.codex\sessions\2026\05\03\rollout-2026-05-03T15-16-16-019defe9-e370-79d2-9579-b4052cada13a.jsonl, updated_at=2026-05-03T22:57:06+00:00, thread_id=019defe9-e370-79d2-9579-b4052cada13a, success; progress-state contract and broader Vitest coverage)

### keywords

- Consulting Karl..., Generating draft, Validating against Karl rules, Running Karl evaluation, Applying final quality corrections, src/hooks/usePageGeneration.test.ts, esbuild spawn EPERM

## User preferences

- when asked whether to consult Karl MCP on every generation, the user chose: "only if the page receives a failing grade" -> default to a local-first flow and reserve live Karl consultation for failing-grade escalation paths [Task 1][Task 4]
- when clarifying first-pass behavior, the user wanted "the intial content following memory karl standards" -> initial generation should be guided by stored Karl standards instead of waiting for remote remediation [Task 1]
- when setting retry budget, the user explicitly said "2 retries." -> cap automatic self-correction loops at two unless the user changes that budget [Task 2]
- when discussing the failing-grade path, the user wanted the app to "automatically revise the page after Karl guidance is fetched" -> use remediation output to drive a rewrite, not just a passive warning surface [Task 4]
- when discussing UX during remediation, the user wanted "there can be a progres bar consulting Karl" -> expose a visible in-flight state while server-side Karl guidance is being fetched [Task 5]
- when quality goals conflict, the rollout summary records that the user preferred compliance with Karl MCP guidelines over tone polish -> bias toward reliability and standards adherence before stylistic refinement [Task 1][Task 4]

## Reusable knowledge

- `src/karlStandards.ts` is the local source of truth for valid Karl page types, valid components, transaction-required section labels, and placeholder patterns; `src/constants.ts` injects that bundle through `KARL_PROMPT_SECTION` into `buildGenerationUserPrompt` so first-pass generation follows local Karl standards [Task 1]
- The prompt contract is guarded by `src/utils.test.ts`, which asserts the generation prompt includes `VALID KARL PAGE TYPES`, `VALID KARL COMPONENTS`, and `TRANSACTION REQUIRED SECTIONS`; check that test first if prompt regressions are suspected [Task 1]
- `src/generationValidation.ts` keeps hard structural rules local and explicit: invalid page types, placeholder leakage, and invalid component names are rejected before further model evaluation; the typed result lives in `GenerationValidationResult` in `src/types.ts` [Task 2]
- `src/hooks/usePageGeneration.ts` now runs a bounded loop of parse -> validate -> retry, with `MAX_GENERATION_RETRIES = 2`; invalid drafts are converted into a narrow retry prompt via `buildRetryPrompt(...)` rather than silently accepted [Task 2]
- Live Karl escalation is intentionally server-side: `server.js` exposes `POST /api/karl-remediate`, and `lib/karlMcp.js` currently returns a safe non-throwing stub `{ consulted: false, guidance: [], error: ... }` until real MCP integration exists [Task 3]
- The failing-grade path is a hybrid local-first, remote-escalation flow: when `evaluateQualityGate(...)` returns `review_required`, `usePageGeneration.ts` calls `fetchKarlRemediation(...)`, then passes the returned guidance into `improveStructure(raw, preferences, evaluationFeedback?)` for the correction pass [Task 4]
- `fetchKarlRemediation(...)` was designed to degrade safely on failed fetches so remediation outages do not crash the generation hook; that matches the rollout's reliability-first preference [Task 4]
- The normalized progress labels form part of the UI contract: `Generating draft`, `Validating against Karl rules`, `Retrying generation (x/2)`, `Running Karl evaluation`, `Consulting Karl...`, and `Applying final quality corrections`; `src/services/chatStream.ts` was updated so old wording does not overwrite them [Task 5]
- Verification coverage for this task family lives mainly in `src/generationValidation.test.ts`, `src/server.api.test.ts`, `src/hooks/usePageGeneration.test.ts`, `src/services/pageParser.test.ts`, `src/services/chatStream.test.ts`, and `src/utils.test.ts` [Task 2][Task 3][Task 5]

## Failures and how to do differently

- Symptom: generation quality fixes drift into subjective grading or tone polish too early. Cause: relying on another model pass before rejecting obvious structural failures. Fix: keep hard rules in `src/generationValidation.ts` and reject invalid page types, placeholders, and invalid components locally before model evaluation [Task 2]
- Symptom: bad first drafts reach the user even when the generator could self-correct. Cause: no bounded retry loop after parse/validate failures. Fix: keep the retry loop inside `usePageGeneration.ts` and honor the explicit `2 retries.` cap [Task 2]
- Symptom: live Karl integration adds unnecessary latency or complexity to every generation. Cause: consulting MCP on all runs instead of only on failing grades. Fix: keep the default flow local-first and call `/api/karl-remediate` only after `review_required` [Task 1][Task 4]
- Symptom: remediation failures break page generation. Cause: throwing from the remediation fetch or using a brittle endpoint contract. Fix: keep `/api/karl-remediate` and `fetchKarlRemediation(...)` non-throwing and small, then fall back gracefully if Karl guidance is unavailable [Task 3][Task 4]
- Symptom: progress UI becomes misleading during Karl consultation. Cause: streaming status text overwrites the more precise remediation state. Fix: preserve the normalized labels and assert the visible `Consulting Karl...` state in the hook regression test [Task 5]
- Symptom: targeted or broader Vitest runs fail with `esbuild` spawn `EPERM` even when the code is correct. Cause: this environment can block Vite/esbuild process spawning on the first pass. Fix: rerun the affected Vitest command with escalation if the first run dies on `spawn EPERM` [Task 2][Task 5]

# Task