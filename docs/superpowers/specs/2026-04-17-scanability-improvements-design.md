# Scanability Improvements — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Generated `pageDraft` content currently produces dense prose paragraphs that are hard to scan. This spec covers two combined improvements:

- **Part B:** Add explicit scanability rules and rewrite few-shot exemplars in `constants.ts` so every new generation defaults to lists, shorter sections, and more Callouts.
- **Part C:** Add an automatic post-generation reformatting pass (second Claude call) that enforces scanability rules on the generated `pageDraft` before returning it to the client.

---

## Part B — Prompt & Exemplar Changes

### New `SCANABILITY_RULES` Constant

A new exported constant added to `src/constants.ts` and injected into both `buildGenerationUserPrompt` and `buildRefineUserPrompt`:

```
SCANABILITY RULES — apply to every pageDraft:

1. Paragraphs: Never write more than 2 sentences in a row. After 2 sentences,
   either end the paragraph or switch to a list.

2. Lists — required when:
   - 3 or more items exist in a sequence (use bulleted list)
   - Steps are ordered (use numbered list)
   - You list things a user must do, check, bring, or know

3. Section bodies: Each Section body must contain at most one short paragraph.
   Move any second idea into its own Section.

4. Callouts: Use a Callout whenever a single fact is more important than the
   surrounding text. Do not bury key facts in paragraphs.

5. No walls of text: Any Section body longer than 4 lines of prose fails this
   check. Break it up.

6. Reading level: All pageDraft content must read at a 5th–6th grade level.
   Use short words. Avoid jargon. If a simpler word exists, use it.
```

### `PROMPT_SELF_CHECK_RULES` Addition

A 6th self-check item is added:

```
6) Does any Section body have more than 2 prose sentences without a list?
   If yes, reformat before returning.
```

### Exemplar Rewrites

All four `FEW_SHOT_EXEMPLARS` (`Transaction`, `Information`, `Step by step`, `Topic`) get their `pageDraft` strings rewritten to model the target format:

| What changes | Before | After |
|---|---|---|
| Section bodies | 2–4 sentence paragraphs | 1-sentence intro + bulleted list |
| Step sequences | Prose description | Numbered list items |
| "Things to know" content | Paragraph | Bulleted list |
| Callouts | One per page | One per key fact, more frequent |
| Tenant responsibilities | Single Callout paragraph | Bulleted list inside Callout |

---

## Part C — Automatic Post-Generation Scanability Pass

### Where It Runs

Server-side, chained immediately after the main generation call in the existing generation endpoint. The reformatted `pageDraft` replaces the original in the JSON object before the response is returned to the client.

### Second Claude Call

- **Model:** `claude-haiku-4-5-20251001` — formatting-only task, no reasoning required; keeps added latency to ~1–2 seconds
- **Input:** The `pageDraft` string extracted from the first call's JSON response
- **Output:** A reformatted `pageDraft` string only — no JSON wrapper, no commentary

### Reformatting Prompt

```
You are a content formatter. Reformat the pageDraft below for scanability.

Rules:
- Do NOT change any facts, names, phone numbers, links, or content
- Do NOT add or remove sections, callouts, or components
- Break prose paragraphs into bulleted or numbered lists wherever 3+ items exist
- Keep all sentences to 5th–6th grade reading level
- Max 2 sentences before a list or paragraph break
- Return only the reformatted pageDraft string — no commentary, no JSON wrapper
```

### Error Handling

If the second call fails for any reason (timeout, API error, malformed output), the server returns the original unformatted `pageDraft` and logs the error. Generation is never blocked by the formatting pass.

### Scope

Applies to new generations only. The 25 existing imported pages are not affected by this change.

---

## Files Changed

| File | Change |
|---|---|
| `src/constants.ts` | Add `SCANABILITY_RULES` constant; update `PROMPT_SELF_CHECK_RULES`; update `buildGenerationUserPrompt`; update `buildRefineUserPrompt`; rewrite all 4 `FEW_SHOT_EXEMPLARS` |
| `server.js` | Chain second Claude call (Haiku) after main generation; replace `pageDraft` with reformatted version before response |

---

## Out of Scope

- Reformatting the 25 existing imported pages (possible future batch operation)
- UI changes
- Changes to the evaluation pipeline
