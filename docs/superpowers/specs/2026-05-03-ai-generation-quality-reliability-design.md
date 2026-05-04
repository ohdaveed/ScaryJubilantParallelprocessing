# AI Generation Quality And Reliability Design

**Date:** 2026-05-03

**Status:** Drafted for review

## Goal

Improve AI output quality and reliability by making the initial generation pass much stricter, Karl-guideline-driven, and self-correcting, so the normal user path produces an acceptable page without manual regenerate, while preserving a targeted live Karl MCP escalation path for failing drafts.

## Problem

The current generation pipeline is resilient but too tolerant of weak first drafts:

- `/api/chat` produces a draft
- frontend parses and repairs malformed output
- `/api/improve-structure` restructures the result
- `/api/evaluate` grades the page
- recent logic may do one evaluation-guided rewrite pass

This works as a recovery pipeline, but it means structural correctness and Karl compliance are often discovered late. The user goal is different: the first visible draft should already be strong enough that regenerate is rarely needed.

The app also currently relies on local Karl prompt memory and citations rather than a live Karl MCP integration. That is acceptable for normal generation if the local Karl memory is made richer and more structured, but it is not sufficient as the only corrective source when a page fails evaluation.

## User Requirements

- Prioritize output quality and reliability over speed and token efficiency
- Enforce Karl MCP guidance as the top content-structure authority
- Strengthen initial generation rather than depending on post-generation cleanup
- Do not fail immediately on a bad draft; automatically reattempt up to 2 times
- Prefer factual and structural compliance over tone polish when those conflict
- Use stored Karl standards during first-pass generation
- Consult live Karl MCP only after a failing evaluation
- Automatically revise the page after Karl MCP guidance is fetched
- Show visible progress while consulting Karl

## Non-Goals

- Replacing Anthropic with a different model provider
- Building a fully agentic multi-service workflow engine
- Infinite retry loops
- Human-in-the-loop approval during normal page generation
- Major UI redesign unrelated to generation quality

## Recommended Approach

Use a hybrid Karl-first generation loop:

- rich local Karl standards bundle for first-pass generation
- deterministic local validation for hard structural rules
- capped automatic retries for invalid drafts
- live Karl MCP consultation only after a failing evaluation
- automatic corrective rewrite using fetched Karl guidance

The model should still generate a full page in one user action, but the system should treat the first attempt as provisional until it passes strict structural checks. If it fails deterministic validation, the system should automatically re-prompt the model with a compact machine-generated failure report and request a corrected full output. This may happen up to 2 times before the draft is accepted or surfaced as degraded.

If the resulting draft is structurally valid but still receives a failing Karl evaluation, the server should consult live Karl MCP, fetch relevant guidance, and run one targeted corrective rewrite before a final re-evaluation.

## Architecture

### 1. Rich Local Karl Standards Bundle

The app should move beyond the current lightweight Karl citation injection and maintain a richer local Karl standards bundle used during normal generation.

This bundle should be optimized for model obedience and deterministic validation, not for citation display.

Contents should include:

- valid Karl page types
- valid Karl component inventory
- page-type-specific required section rules
- Transaction vs Information decision rules
- CTA and Related-page conventions
- compact HHVC-specific Karl adaptations
- prohibited placeholder patterns and fictional structures

The existing `lib/karlCitations.js` can remain for source memory and citation support, but it should no longer be treated as the main first-pass quality system.

### 2. Karl-First Prompt Contract

The initial generation prompt should be tightened so that Karl-valid page types, Karl-valid components, and HHVC structural rules are stated as non-negotiable contract requirements, not as advisory guidance.

Changes:

- elevate Karl rules above general writing style guidance
- explicitly state that invalid page types and fictional components are unacceptable
- explicitly require the model to return exact structured output only
- explicitly require the model to preserve required HHVC fields and system relationships
- instruct the model to internally verify compliance before returning

This does not replace deterministic validation. It improves first-attempt quality and reduces preventable mistakes.

### 3. Deterministic Validation Layer

After parsing structured output, the app should run local rule-based validation before the draft is considered usable.

Validation categories:

- schema validity
- required fields present
- Karl-valid page type
- Karl-valid component inventory
- page-type-specific section requirements
- obvious HHVC mandatory rules
- required CTA patterns for transaction pages
- parent / system relationship rules where applicable
- no placeholder or incomplete content leakage

This validator should be implemented as deterministic code, not another model call. That gives stable behavior and makes retry reasons precise.

### 4. Automatic Retry Loop

If deterministic validation fails, the frontend generation orchestration should automatically reattempt generation up to 2 times.

Retry strategy:

- do not restart from the original user prompt alone
- send the prior generated output plus a compact failure report
- require the model to return a full corrected output, not a patch
- keep the original topic, user type, page type, and notes fixed

Failure reports should be narrow and machine-readable in spirit, for example:

- `Invalid page type: Guidance page. Must be one of: Transaction, Information, Step by step, ...`
- `Missing required Transaction section: What to do`
- `Invalid component detected: What happens next`
- `Placeholder text found in page draft`

This keeps retries corrective rather than generative drift.

### 5. Evaluation As Secondary Gate

Karl evaluation should remain in the pipeline, but its role should shift.

New role:

- deterministic validation catches hard structural failures first
- Karl evaluation judges higher-order quality once the structure is already valid
- failing evaluation can trigger live Karl MCP consultation
- evaluation-guided rewrite stays available as a final repair path, but should become uncommon

This reduces wasted evaluator calls on obviously invalid drafts and makes evaluator feedback more meaningful.

### 6. Live Karl MCP Escalation

Live Karl MCP should not be queried on every generation. It should be used as a targeted escalation path only after a failing evaluation.

Flow:

1. structurally valid page receives failing Karl evaluation
2. server derives the failure topic areas from evaluator output
3. server queries Karl MCP for the relevant help-center guidance
4. server injects that Karl guidance into a corrective rewrite prompt
5. model rewrites the full page
6. page is re-evaluated

This design keeps the normal path fast and stable while still allowing the app to pull fresh Karl guidance when the local bundle is not enough.

The Karl MCP integration should live on the server side. The frontend should only receive progress state and final results, not direct MCP access.

### 7. UI Reliability States

The user should see a clearer generation lifecycle so retries do not feel random or broken.

Recommended progress labels:

- `Generating draft`
- `Validating against Karl rules`
- `Retrying generation (1/2)`
- `Retrying generation (2/2)`
- `Running Karl evaluation`
- `Consulting Karl...`
- `Applying final quality corrections`

If all retries fail, the error should summarize why, using the final validation failures rather than a generic “generation failed” message.

## Data Flow

### Proposed Generation Flow

1. User submits generation request
2. `/api/chat` produces structured draft attempt
3. frontend parses result
4. local validator checks schema + local Karl bundle + HHVC structural rules
5. if validator passes:
   run Karl evaluation
6. if validator fails and retry count < 2:
   build failure report and re-prompt model
7. repeat parse + validate
8. once validation passes:
   run Karl evaluation
9. if evaluation passes quality gate:
   save and show page
10. if evaluation fails quality gate:
   server consults live Karl MCP
11. use fetched Karl guidance to run one targeted corrective rewrite
12. re-evaluate corrected page
13. if corrected page passes:
   save and show page
14. if corrected page still fails:
   save as `review_required` or surface a controlled degraded state, depending on implementation choice

## Component Changes

### Frontend

`src/hooks/usePageGeneration.ts`

- own the automatic retry loop
- track attempt count and validation failure summaries
- separate “hard validation failure” from “quality gate failure”
- only surface a page after validation succeeds

`src/services/pageParser.ts`

- continue schema parsing responsibility
- may expose richer parse error output if needed for retry reports

`src/constants.ts`

- strengthen generation prompt contract
- make Karl-first rules explicit and concise
- consume richer local Karl standards content

`lib/karlCitations.js` and related Karl data files

- keep citations and source memory
- may be expanded or complemented by a richer structured Karl standards module
- should distinguish between citation material and first-pass generation rules

`src/utils.ts` or a new validation module

- implement deterministic generation validation
- export typed validation results used by the retry loop

### Backend

`server.js`

- continue handling `/api/chat`, `/api/evaluate`, and `/api/improve-structure`
- add server-side Karl MCP consultation path for failing evaluations
- emit Karl consultation progress back to the frontend-visible generation lifecycle
- no frontend-direct MCP access
- optional later improvement: extract Karl MCP integration into a dedicated server module

`mcp.json` / runtime MCP configuration

- must include the Karl GitBook MCP endpoint
- runtime environment must expose that MCP access to the application integration layer

## Validation Result Shape

Introduce a typed validation result such as:

```ts
type GenerationValidationResult = {
  ok: boolean;
  failures: string[];
  warnings: string[];
};
```

Rules:

- `failures` block acceptance and trigger retry
- `warnings` do not block acceptance but may be useful for logging or evaluation context

This should stay intentionally simple. The retry loop only needs actionable failure strings.

## Error Handling

### When Parse Fails

- attempt structured repair once using the existing repair path
- if repair still fails, count it as a retryable generation failure
- send parse failure reason into the retry report

### When Validation Fails Repeatedly

- stop after 2 automatic retries
- show a summarized failure state
- preserve the best available generated content internally for debugging if useful, but do not present it as successful output

### When Evaluation Fails

- if the evaluator call itself fails, allow save with `review_required`
- if evaluation returns low score after structurally valid output, consult Karl MCP and run at most one targeted corrective rewrite
- do not enter an unbounded evaluation/rewrite loop

### When Karl MCP Is Unavailable

- continue using the richer local Karl bundle
- log Karl MCP unavailability explicitly
- fall back to local evaluation-guided rewrite only
- keep the user-facing progress state honest, e.g. `Karl unavailable, using stored standards`

## Observability

Add lightweight generation diagnostics for each attempt:

- attempt number
- parse status
- validation pass/fail
- top failure reasons
- evaluation score / grade
- whether Karl MCP was consulted
- Karl consultation success/failure
- whether final output required evaluation-guided correction

This should be logged with existing request IDs so bad outputs can be traced later.

## Testing Strategy

### Unit Tests

- validator accepts valid Transaction / Information outputs
- validator rejects invalid page types
- validator rejects invalid component names
- validator rejects missing required sections
- validator rejects placeholder leakage
- retry loop stops after 2 retries
- retry loop succeeds when a later attempt passes validation

### Integration Tests

- generation flow retries on deterministic validation failure
- generation flow does not surface invalid first attempt to user state
- evaluation runs only after validation succeeds
- failing evaluation triggers Karl MCP consultation path
- final page save uses corrected attempt, not the original invalid one

### Regression Coverage

- preserve the recent evaluation-guided improvement behavior
- ensure new validation loop does not break refine flow

## Rollout Plan

### Phase 1

- create richer local Karl standards bundle
- add deterministic validator
- tighten prompt contract
- add retry loop with 2 retries
- add progress labels

### Phase 2

- integrate server-side Karl MCP consultation after failing evaluation
- add automatic Karl-guided corrective rewrite
- improve retry-report quality
- add attempt-level diagnostics
- reduce unnecessary evaluator calls

### Phase 3

- revisit whether `/api/improve-structure` is still needed in the normal path
- consider moving validation shared logic server-side if future clients need it
- decide whether more Karl standards should be synced into the local bundle periodically

## Risks

### Increased Latency

Expected and acceptable. This design intentionally trades speed for first-pass quality and reliability.

### Prompt Overgrowth

If the generation prompt becomes too large, first-attempt quality may degrade instead of improve. The validator and retry report should do most of the enforcement work; the initial prompt should stay strict but compact.

### Rule Duplication

Karl rules currently exist in prompts and evaluator instructions. Adding deterministic validation introduces a third enforcement layer. This is acceptable only if the deterministic validator is kept focused on hard structural rules, not subjective style judgment.

### MCP Availability Risk

Live Karl MCP may be intermittently unavailable or not exposed in some runtimes. The design therefore depends on a strong local Karl standards bundle and treats MCP as escalation, not as the only source of truth.

## Success Criteria

- fewer malformed or structurally invalid drafts shown to users
- fewer manual regenerates needed
- fewer pages requiring evaluation-driven repair after initial generation
- better recovery quality when failing pages require live Karl guidance
- more consistent Karl-valid page types and component sets
- clearer failure explanations when generation still does fail

## Decision Summary

- prioritize quality and reliability over speed
- use a richer local Karl standards bundle during initial generation
- auto-correct internally instead of surfacing bad drafts
- allow up to 2 automatic retries
- prioritize compliance and structure over polish
- consult live Karl MCP only after a failing evaluation
- automatically rewrite the page after Karl MCP guidance is fetched

---

## Plan design review (gstack /plan-design-review, 2026-05-04)

**Plan:** `docs/superpowers/plans/2026-05-03-ai-generation-quality-reliability.md`  
**DESIGN.md:** Present at repo root — UI changes must align with global tokens (`index.css`, `ui.css`) and studio chrome (`SfGovContentDesignTool.css`) where generation UI lives.

### Scope classifier

**App UI** (orchestration + status). No new marketing surfaces. UI work is **progress messaging, error surfacing, and optional degraded outcome** inside existing Generate workspace.

### Step 0 — Design completeness

| Metric | Score | What a 10 would include |
|--------|-------|-------------------------|
| Initial rating | **6/10** | Every lifecycle phase mapped to a visible surface, component, and accessibility behavior |
| Target after amendments below | **8/10** | Interaction table + placement + a11y locked; remaining 2 points need implementation QA |

### Pass 1 — Information architecture

**Finding:** Progress labels are listed in prose but **not anchored to UI regions** (stream panel vs footer status vs modal).

**Add to implementation:**

1. **Primary progress:** Map each label to `progressLabel` / footer strip already used in Generate flow — single source of truth so the user never sees two conflicting statuses.
2. **Secondary context:** Keep stream (`StreamRenderer`) for model output; prepend or pin a one-line **phase chip** when phase changes (e.g. `Validating…`) so retries do not look like a frozen stream.

**ASCII flow (user eye path):**

```
[ Tabs ]     [ Settings | Export ]
------------------------------------
| Rail config |  [ phase chip: Validating against Karl rules ]
|             |  [ stream continues OR skeleton if suppressed ]
------------------------------------
[ Footer: Connected · single-line status mirrors progressLabel ]
```

### Pass 2 — Interaction state coverage

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Deterministic validation | Show phase + optional indeterminate indicator on CTA row | N/A | Summarize **validation.failures** in banner; offer **Copy details** for support | Silent transition to evaluation | **Warnings only:** pass but log warnings in eval panel |
| Retry loop | Replace generic spinner copy with **`Retrying generation (n/2)`** exactly | N/A | After max retries: **blocking banner** with numbered failure reasons (not toast-only) | N/A | Degraded: show draft only if product chooses “best effort” — **specify in Task 3** |
| Karl MCP escalation | **`Consulting Karl…`** must match Task 6 labels | N/A | **`Karl unavailable, using stored standards`** (honest fallback string from spec) | Transition to **Applying final quality corrections** | Evaluation fails twice: surface **`review_required`** with explicit next step |
| Evaluation gate | **`Running Karl evaluation`** | N/A | Evaluator HTTP failure: existing `review_required` path | Grade + success panel | Low grade but saved: badge state per existing `SuccessState` |

### Pass 3 — User journey / emotional arc

| Step | User feels | Design support |
|------|------------|----------------|
| Validation retry | “Is this stuck?” | Show **elapsed-safe** copy: retries include attempt index and link to failure summary |
| Karl consultation | “Silent failure?” | **`Consulting Karl…`** must appear **before** long network wait; if timeout, swap to fallback string |
| Exhausted retries | Frustration | **Empathetic headline** + bullet list of failures + **Try again** (re-run generation) secondary |

### Pass 4 — AI slop risk

**9/10** — Plan avoids generic SaaS patterns; copy is utility-first. Watch **emoji** in evaluation stats elsewhere in app (`DESIGN.md` finding); keep new strings text-only.

### Pass 5 — Design system alignment

- Progress and errors use **`--color-text-*`**, **`--color-background-warning`** for retry, **`--color-border-info`** for Karl-related emphasis (`DESIGN.md` §3).
- Studio shell: ensure light-on-dark footer/rail contrast remains **WCAG AA** for new chips.

### Pass 6 — Responsive and accessibility

- **`aria-live="polite"`** on the container that shows phase transitions; **`assertive`** only when generation stops with error.
- **Focus:** After error banner appears, move focus to banner heading or first **Copy details** control (implementation choice — pick one).
- **Touch:** No new controls below **44px** height on retry/error actions.
- **`prefers-reduced-motion`:** Respect for spinners / pulse already noted in `DESIGN.md`; apply to any new retry animation.

### Pass 7 — Unresolved decisions (must pick during implementation)

| Decision | If deferred |
|----------|----------------|
| Suppress stream text during retry vs show failure report inline | Engineer may show duplicate or confusing output |
| Block primary **Generate** until dismissal of fatal validation vs allow refine | Users may click refine on invalid partial |
| **`review_required`** vs hide draft when evaluation fails post-remediation | Inconsistent Library entries |

### NOT in scope (design)

- Full Generate tab layout redesign (explicit non-goal).
- New illustration or empty-state art for retries (use existing empty patterns).

### What already exists (reuse)

- `StreamRenderer`, `EvaluatingState`, `SuccessState`, footer status patterns (`App.tsx` / studio shell).
- Token vocabulary in **`DESIGN.md`** and **`src/components/ui.css`**.

### Recommended TODOS.md additions (optional)

1. **A11y:** `aria-live` + focus management for validation failure banner — tracked under this feature.
2. **Design QA:** After ship, run **`/design-review`** on Generate tab for contrast and focus ring completeness.

### Review scores summary

| Pass | Before | After amendments |
|------|--------|------------------|
| Info architecture | 5 | 8 |
| Interaction states | 5 | 8 |
| Journey | 6 | 8 |
| AI slop | 9 | 9 |
| Design system | 7 | 9 |
| Responsive / a11y | 4 | 8 |
| Unresolved decisions | 3 listed | **Requires PM/engineer answers** |

**Overall design completeness:** **6/10 → 8/10** once unresolved decisions are answered and implementation follows the table above.

**Next:** Run **`/plan-eng-review`** on the same plan for orchestration and test boundaries; run **`/design-review`** after implementation for pixel QA.

---

## Approved mockups (gstack design flow)

| Mockup | Path | Direction | Constraints |
|--------|------|-----------|-------------|
| **HHVC Studio — Generate flow (C-fixed)** | `c:\Users\david\.gstack\projects\ScaryJubilantParallelprocessing\designs\hhvc-studio-flow-20260504\variant-C-fixed.png` | Approve **variant C-fixed** as the visual direction for Generate-tab progress, validation, Karl consultation, and evaluation states described in this spec. Boards: `design-board-final.html`, `design-board-all-four.html` in the same folder. | Reconcile extracted palette/typography in root **`DESIGN.md`** § *Extracted Design Language* with existing **§4–§8** studio tokens; do not ship conflicting one-off hex without a token pass. Vision QA passed on C-fixed after **`evolve`** from C (copy fixes). |

**Related:** `implementation-prompt-variant-A.json` (structured notes from **`prompt --image variant-A.png`**), `design-gallery.html`, `approved.json` in the same session folder.
