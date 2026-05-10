## User Profile

The current memory set centers on recurring work in two closely related checkouts of `ScaryJubilantParallelprocessing`: a React + TypeScript + Vite + Express app with HHVC-specific content architecture, AI generation, and local tooling tasks. The user gives concrete operating constraints that materially change implementation defaults. In content-system work, they push for explicit separation between canonical concepts, IA placement, artifacts, references, workflow state, and queue state, and they do not treat file-backed parity as done while the live Neon/Postgres path still lags. In generation work, they prefer local-first reliability, bounded retries, and visible progress over broad “smart” behavior. In repo/tooling work, they prefer balanced committed setup that matches the current stack, staged cleanup, and exact local URLs or routes when reviewing live app surfaces.

## User preferences

- When a workflow smells like logic bleed, default to the user's framing that this is a "product-architecture problem, not just a content cleanup exercise" and separate concepts, IA, artifacts, references, workflow state, versioning, and queue state instead of patching symptoms.
- In HHVC work, keep `Ideal Map` as "Reference Only" rather than mixing benchmark/reference IA with the working canonical IA or current drafts.
- In HHVC work, honor `Generate` as "Anchor by Default" by starting from canonical intent when possible and labeling experiments instead of letting the workflow drift.
- In HHVC work, treat `pages to build` as an "Execution Queue" and keep backlog state operational rather than conflating it with site architecture.
- If the user says "update the postgres path so that neondb will work", do not stop at file-backed parity; verify the live DB path against the same model split.
- When designing AI generation flows, default to local-first reliability and only add live escalation after a concrete failure condition; in this workflow the user chose "only if the page receives a failing grade".
- For first-pass generation quality, preserve "the intial content following memory karl standards" rather than relying on a remote review loop to clean things up later.
- When retry behavior is negotiable, honor the user's explicit budget; here the standing instruction was "2 retries."
- When external guidance is fetched after a failure, wire it into an automatic corrective pass instead of surfacing it as a passive note; the user wanted the app to "automatically revise the page after Karl guidance is fetched".
- If a backend consultation can take noticeable time, show a visible in-flight state; the user explicitly wanted "there can be a progres bar consulting Karl".
- In this workflow, bias toward compliance with Karl MCP guidelines over tone polish when those goals pull in different directions.
- Prefer server-side access for live guidance systems and expose only progress/results to the frontend when that keeps the client flow simpler and safer.
- When the user chose `Repo .vscode (Recommended)` and `Current only (Recommended)`, default to committed workspace files that track the repo's existing stack, not extra lint/format tooling.
- When the user chose `Balanced`, keep editor setup ready and low-noise rather than heavily opinionated.
- When the user explicitly asks to "commit and push", preserve completed implementation work in git and push it when possible instead of leaving it only in the local checkout.
- When the user asks about worktrees/branches and then cleanup, inspect both branch inventory and worktree metadata before deleting anything.
- When the user has not reviewed `page_artifacts` yet, prefer metadata-first structural review and avoid seeding real content bodies too early.
- When the user says "consult karl mcp before proceeding", check Karl guidance before encoding IA semantics in this repo.
- When the user asks to "show me the site plan page" or start the dev stack, provide the exact local URL and route instead of implying the browser UI is directly visible in terminal output.
- In the AI-route hardening workflow, staged narrowing was acceptable after enough context; the user answered "yes" / "you decide" after concrete package recommendations.
- In narrow backend hardening work, keep enforcement localized to the explicitly named routes instead of broadening scope into general server cleanup.

## General Tips

- Read `phase2_workspace_diff.md` first; in this repo it is the authoritative routing layer for incremental Phase 2 updates.
- Treat `raw_memories.md` as the task inventory and provenance source, then deep-dive the referenced rollout summary when you need stronger wording, validation context, or conflict resolution.
- Distinguish the two checkout families in memory retrieval: `C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing` for the VS Code / canonical-IA rollout and `C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing` for the HHVC architecture, generation, and AI-route hardening rollouts.
- For this memory set, high-value retrieval handles include exact strings such as `product-architecture problem, not just a content cleanup exercise`, `Reference Only`, `Anchor by Default`, `Execution Queue`, `update the postgres path so that neondb will work`, `only if the page receives a failing grade`, `2 retries.`, `Consulting Karl...`, `manual_section`, `.worktrees/ai-route-hardening`, and `git worktree prune --verbose`.
- Separate preference signal from procedural recap. In this repo, the user's explicit steering materially changes the right defaults for architecture, generation, tooling, and live-review tasks.
- Verify the boundary that actually changed. Targeted UI/API tests were enough for the file-backed HHVC refactor and AI-route hardening, while the remaining DB-model gap needs DB-mode coverage or a Neon/Postgres smoke test.
- Watch for repo debt that predates the change under review; `npx tsc --noEmit` failing on `src/services/pageParser.test.ts` (`Cannot find name 'utils'`) was not evidence that the HHVC refactor regressed.
- Watch for environment-specific process failures. In this memory set, concurrent `npm install` + `npm test` produced a misleading `compression` / `debug` failure, and Vitest could also fail on `esbuild` spawn `EPERM` without implicating the changed code path.
- For live app review, read the dev startup logs instead of hardcoding ports; Vite can shift from `5000` to `5001`, and the right answer is the URL shown by the current run.

## What's in Memory

### C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing

#### 2026-05-07

- Canonical IA inspector / Karl metadata review flow: Site Plan, /plan, CanonicalIaInspector, manual_section, auto_service, services, resources, http://localhost:5000/plan
  - desc: Search this topic first for canonical IA review work in `cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing`, especially when the task involves comparing live `hhvc-working` data to seed expectations, deciding whether to touch metadata before `page_artifacts`, encoding Karl section semantics, or exposing the exact Site Plan URL from a local dev run.
  - learnings: The successful pattern here was to keep the inspector inside the existing `Site Plan` route, use `useProjectModel()` plus `src/utils/canonicalIa.ts` for the live tree, and encode Karl semantics explicitly as `auto_service` vs `manual_section` and `services` vs `resources` after consulting Karl docs.

- VS Code workspace baseline / git worktree hygiene: .vscode/settings.json, .vscode/tasks.json, .vscode/launch.json, scripts/dev.mjs, index.lock, git worktree prune --verbose, origin/feature/ai-route-hardening
  - desc: Search this topic first for repo setup, committed editor baseline, commit/push expectations, or stale worktree cleanup in `cwd=C:\Users\david\projects\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing`, especially when the nested app root, dual-process dev script, or branch preservation rules matter.
  - learnings: The actual app root is the nested repo folder, `npm run dev` is dual-process via `scripts/dev.mjs`, Vite may move from `5000` to `5001`, `index.lock` can be transient, and stale worktree cleanup should confirm branch safety with both `git worktree prune --verbose` and `git branch -vv`.

### C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing

#### 2026-05-05

- HHVC content architecture / persistence split: PageConcept, IANode, PageArtifact, ArtifactVersion, BuildQueueItem, lib/persistence.js, /api/page-concepts, /api/build-queue, NeonDB, Postgres
  - desc: Search this topic first for HHVC content-system refactors in `cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing`, especially when canonical concepts, IA placement, artifacts, references, queue state, and persistence boundaries are getting mixed together or when the file-backed model and Neon/Postgres path are out of sync.
  - learnings: The normalized model already exists in `src/types.ts`, `src/utils/contentModel.ts`, `lib/contentModel.js`, `lib/persistence.js`, and the `/api/page-concepts` / `/api/ia-nodes` / `/api/page-artifacts` / `/api/reference-examples` / `/api/build-queue` routes. The main caveat is still explicit: file-backed normalization landed, but the user ended the rollout with "update the postgres path so that neondb will work".

- AI route validation / route-specific rate limiting: zod, express-rate-limit, lib/requestSchemas.js, parseRequestBody, /api/chat, /api/evaluate, /api/improve-structure, app.set("trust proxy", 1)
  - desc: Search this topic first for backend hardening in `cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing`, especially when request-shape validation and throttling need to be added narrowly to the expensive AI routes using a project-local worktree and focused API tests.
  - learnings: Use the existing `.worktrees/` root, serialize `npm install` and `npm test`, keep the schema shallow and non-mutating, keep limiter middleware route-specific, and verify with `npm test -- src/server.api.test.ts`. The rollout captured a working implementation path but not final branch closeout.

#### 2026-05-03

- AI generation reliability / Karl-first remediation pipeline: Karl MCP, src/karlStandards.ts, src/generationValidation.ts, MAX_GENERATION_RETRIES = 2, /api/karl-remediate, Consulting Karl..., esbuild spawn EPERM
  - desc: Search this topic first for React/Express page-generation work in `cwd=C:\Users\david\Downloads\ScaryJubilantParallelprocessing\ScaryJubilantParallelprocessing` that needs better first-pass quality, deterministic validation, bounded retries, server-side Karl escalation, or failing-grade rewrite behavior.
  - learnings: The preferred shape is a hybrid local-first, remote-escalation flow: enrich the prompt from `src/karlStandards.ts`, reject hard failures locally in `src/generationValidation.ts`, retry internally up to `2 retries.`, call `/api/karl-remediate` only on `review_required`, and keep the visible `Consulting Karl...` state intact while remediation is in flight.

### Older Memory Topics

No older memory topics yet.
