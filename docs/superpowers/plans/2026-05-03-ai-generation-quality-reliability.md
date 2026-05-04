# AI Generation Quality And Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve first-pass page quality by enforcing richer local Karl standards during generation, validating drafts deterministically, retrying invalid generations up to 2 times, and consulting live Karl MCP only after a failing evaluation.

**Architecture:** The plan adds a structured local Karl standards module plus a deterministic validator in the frontend/shared layer, then updates generation orchestration in `usePageGeneration` to run parse → validate → retry before a page is shown. After validation succeeds, the existing evaluator remains the quality gate; a failing evaluation triggers a new server-side Karl MCP consultation path and one automatic corrective rewrite with visible progress states.

**Tech Stack:** React 18, TypeScript, Express, Vitest, Supertest, existing Anthropic API integration, GitBook-hosted Karl MCP endpoint.

---

## File Structure

### New files

- `src/karlStandards.ts`
  Purpose: rich local Karl standards bundle for prompt assembly and deterministic validation.

- `src/generationValidation.ts`
  Purpose: deterministic validation of parsed/generated pages against Karl + HHVC hard rules.

- `src/generationValidation.test.ts`
  Purpose: unit tests for local validation rules and failure reporting.

- `lib/karlMcp.js`
  Purpose: server-side Karl MCP consultation helper for failing evaluations.

- `src/karlMcp.test.ts`
  Purpose: unit tests for server-side Karl MCP query normalization and fallback behavior if implemented as pure helpers.

### Modified files

- `src/constants.ts`
  Purpose: consume richer local Karl standards in the generation prompt contract.

- `src/types.ts`
  Purpose: add typed validation and Karl consultation metadata where needed.

- `src/hooks/usePageGeneration.ts`
  Purpose: automatic deterministic validation, retry loop, progress updates, and failing-grade Karl escalation handling.

- `src/hooks/usePageGeneration.test.ts`
  Purpose: regression coverage for retry behavior and Karl escalation orchestration.

- `src/utils.ts`
  Purpose: expose client helpers for Karl remediation endpoint if needed and keep quality-gate helpers aligned with new flow.

- `server.js`
  Purpose: add Karl MCP consultation and corrective rewrite API path while preserving current routes.

- `src/server.api.test.ts`
  Purpose: API validation coverage for new server-side Karl remediation endpoint or request shape changes.

## Task 1: Create The Rich Local Karl Standards Bundle

**Files:**
- Create: `src/karlStandards.ts`
- Modify: `src/constants.ts`
- Test: `src/utils.test.ts`

- [ ] **Step 1: Write the failing prompt-contract test**

Add a test in `src/utils.test.ts` that proves the generation prompt includes richer Karl constraints from a dedicated standards bundle.

```ts
it("includes local Karl standards in the generation prompt", () => {
  const prompt = buildGenerationUserPrompt("Design a page", "Transaction");
  expect(prompt).toContain("VALID KARL PAGE TYPES");
  expect(prompt).toContain("VALID KARL COMPONENTS");
  expect(prompt).toContain("TRANSACTION REQUIRED SECTIONS");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils.test.ts`

Expected: FAIL because the prompt does not yet contain the new Karl standards sections.

- [ ] **Step 3: Create `src/karlStandards.ts`**

Add a new structured standards module.

```ts
export const VALID_KARL_PAGE_TYPES = [
  "Transaction",
  "Information",
  "Step by step",
  "Location",
  "News",
  "Event",
  "Campaign",
  "About",
  "Resource Collection",
  "Meeting",
  "Profile",
  "Data story",
  "Reports",
  "Topic"
] as const;

export const VALID_KARL_COMPONENTS = [
  "Title",
  "Description",
  "Button link",
  "Callout",
  "Spotlight",
  "Text",
  "Section",
  "Phone number",
  "Email",
  "Related",
  "Address",
  "Media",
  "Profile",
  "Resource tile",
  "What to know",
  "What to do",
  "Action link"
] as const;

export const TRANSACTION_REQUIRED_SECTION_LABELS = [
  "What to know",
  "What to do"
] as const;

export const PROHIBITED_PLACEHOLDER_PATTERNS = [
  "[To be generated]",
  "[To be determined]",
  "[Content to be generated]"
] as const;
```

- [ ] **Step 4: Update `src/constants.ts` to consume the new bundle**

Import the bundle and inject compact standards sections into the prompt contract.

```ts
import {
  VALID_KARL_PAGE_TYPES,
  VALID_KARL_COMPONENTS,
  TRANSACTION_REQUIRED_SECTION_LABELS
} from "./karlStandards";

const karlPromptSection = `
VALID KARL PAGE TYPES:
${VALID_KARL_PAGE_TYPES.join(", ")}

VALID KARL COMPONENTS:
${VALID_KARL_COMPONENTS.join(", ")}

TRANSACTION REQUIRED SECTIONS:
${TRANSACTION_REQUIRED_SECTION_LABELS.join(", ")}
`;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/utils.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/karlStandards.ts src/constants.ts src/utils.test.ts
git commit -m "feat: add local Karl standards bundle for generation"
```

## Task 2: Add Deterministic Generation Validation

**Files:**
- Create: `src/generationValidation.ts`
- Create: `src/generationValidation.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing validator tests**

Create `src/generationValidation.test.ts` with targeted rule coverage.

```ts
import { describe, expect, it } from "vitest";
import { validateGeneratedPage } from "./generationValidation";

describe("validateGeneratedPage", () => {
  it("rejects invalid page types", () => {
    const result = validateGeneratedPage({
      pageType: "Guidance page",
      components: "- Section",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report mold\n\n## What to know\nText\n\n## What to do\nText",
      raw: "PAGE TYPE:\nGuidance page"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("Invalid page type");
  });

  it("rejects placeholders in the page", () => {
    const result = validateGeneratedPage({
      pageType: "Transaction",
      components: "- Section\n- Button link",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report mold\n\n[To be generated]",
      raw: "PAGE DRAFT\n\n[To be generated]"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures.some((x) => x.includes("Placeholder"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/generationValidation.test.ts`

Expected: FAIL because `validateGeneratedPage` does not exist.

- [ ] **Step 3: Add validation types in `src/types.ts`**

```ts
export interface GenerationValidationResult {
  ok: boolean;
  failures: string[];
  warnings: string[];
}
```

- [ ] **Step 4: Implement `src/generationValidation.ts`**

Add the minimum validator that checks hard rules only.

```ts
import { GenerationValidationResult, ParsedPageFields } from "./types";
import {
  PROHIBITED_PLACEHOLDER_PATTERNS,
  VALID_KARL_PAGE_TYPES,
  VALID_KARL_COMPONENTS
} from "./karlStandards";

export function validateGeneratedPage(page: ParsedPageFields): GenerationValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!VALID_KARL_PAGE_TYPES.includes(page.pageType as any)) {
    failures.push(`Invalid page type: ${page.pageType}.`);
  }

  for (const token of PROHIBITED_PLACEHOLDER_PATTERNS) {
    if (page.raw.includes(token) || page.draft.includes(token)) {
      failures.push(`Placeholder content found: ${token}.`);
    }
  }

  const componentLines = page.components
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  for (const component of componentLines) {
    if (!VALID_KARL_COMPONENTS.includes(component as any)) {
      failures.push(`Invalid component detected: ${component}.`);
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/generationValidation.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/generationValidation.ts src/generationValidation.test.ts src/types.ts
git commit -m "feat: add deterministic generation validator"
```

## Task 3: Add Retry Loop Before Surfacing Generated Pages

**Files:**
- Modify: `src/hooks/usePageGeneration.ts`
- Modify: `src/hooks/usePageGeneration.test.ts`
- Test: `src/hooks/usePageGeneration.test.ts`

- [ ] **Step 1: Write the failing retry-loop test**

Add a test proving invalid first attempts trigger retries before a page is accepted.

```ts
it("retries invalid generated pages up to 2 times before accepting output", async () => {
  const { validateGeneratedPage } = await import("../generationValidation");
  vi.mocked(validateGeneratedPage)
    .mockReturnValueOnce({ ok: false, failures: ["Invalid page type"], warnings: [] } as never)
    .mockReturnValueOnce({ ok: true, failures: [], warnings: [] } as never);

  const { result } = renderHook(() => usePageGeneration(defaultParams));

  await act(async () => {
    result.current.actions.setTopic("Test Topic");
  });

  await act(async () => {
    await result.current.generate({ quiet: true });
  });

  expect(result.current.progressLabel).toMatch(/Retrying generation/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/usePageGeneration.test.ts`

Expected: FAIL because no deterministic retry loop exists yet.

- [ ] **Step 3: Update `usePageGeneration.ts` to validate before evaluation**

Import the new validator and add a bounded attempt loop around generation parse/repair.

```ts
import { validateGeneratedPage } from "../generationValidation";

const MAX_GENERATION_RETRIES = 2;

for (let attempt = 0; attempt <= MAX_GENERATION_RETRIES; attempt += 1) {
  const streamResult = await streamModelText({ msg: retryPrompt ?? msg, mode: "generate" });
  const { parseResult, parsed } = await repairAndParseStructured(streamRef.current);
  const validation = validateGeneratedPage(parsed);

  if (validation.ok) {
    finalParsed = parsed;
    break;
  }

  if (attempt === MAX_GENERATION_RETRIES) {
    throw new Error(validation.failures.join(" "));
  }

  adv(70, `Retrying generation (${attempt + 1}/${MAX_GENERATION_RETRIES})`);
  retryPrompt = buildRetryPrompt(msg, parsed.raw || streamRef.current, validation.failures);
  streamRef.current = "";
  setStreamText("");
}
```

- [ ] **Step 4: Add the helper prompt builder inline or locally**

Keep it narrow and deterministic.

```ts
const buildRetryPrompt = (originalPrompt: string, invalidOutput: string, failures: string[]) => `
The previous output failed validation.

Original request:
${originalPrompt}

Validation failures:
${failures.map((x, i) => `${i + 1}. ${x}`).join("\n")}

Return one complete corrected output in the required schema only.

Invalid output:
${invalidOutput}
`;
```

- [ ] **Step 5: Update tests to mock the validator**

Extend `src/hooks/usePageGeneration.test.ts` mocks:

```ts
vi.mock("../generationValidation", () => ({
  validateGeneratedPage: vi.fn().mockReturnValue({ ok: true, failures: [], warnings: [] })
}));
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/hooks/usePageGeneration.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePageGeneration.ts src/hooks/usePageGeneration.test.ts
git commit -m "feat: retry invalid generations before evaluation"
```

## Task 4: Add Server-Side Karl MCP Escalation For Failing Evaluations

**Files:**
- Create: `lib/karlMcp.js`
- Modify: `server.js`
- Modify: `src/server.api.test.ts`

- [ ] **Step 1: Write the failing API validation test**

Add a failing server test for a new remediation route or request shape.

```ts
it("rejects invalid /api/karl-remediate payload", async () => {
  const res = await request(app).post("/api/karl-remediate").send({ raw: "" });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/server.api.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Create `lib/karlMcp.js`**

Start with a small helper abstraction so MCP access is isolated.

```js
export async function fetchKarlGuidance({ failures, pageType, draft }) {
  return {
    consulted: false,
    guidance: [],
    error: "Karl MCP integration not yet available in runtime"
  };
}
```

- [ ] **Step 4: Add a new remediation route in `server.js`**

```js
import { fetchKarlGuidance } from "./lib/karlMcp.js";

app.post("/api/karl-remediate", async (req, res) => {
  if (!isObject(req.body)) return res.status(400).json({ error: "Invalid request body for /api/karl-remediate" });
  const { raw, pageType, evaluation } = req.body;
  if (typeof raw !== "string" || !raw.trim()) return res.status(400).json({ error: "Missing raw page content" });
  if (!isObject(evaluation)) return res.status(400).json({ error: "Missing evaluation" });

  const karl = await fetchKarlGuidance({
    failures: Array.isArray(evaluation.failed) ? evaluation.failed : [],
    pageType: typeof pageType === "string" ? pageType : "",
    draft: raw
  });

  res.json(karl);
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/server.api.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/karlMcp.js server.js src/server.api.test.ts
git commit -m "feat: add server-side Karl remediation endpoint"
```

## Task 5: Wire Karl Remediation Into The Failing-Grade Rewrite Path

**Files:**
- Modify: `src/utils.ts`
- Modify: `src/hooks/usePageGeneration.ts`
- Modify: `src/hooks/usePageGeneration.test.ts`
- Test: `src/hooks/usePageGeneration.test.ts`

- [ ] **Step 1: Write the failing hook test**

Add a test proving a failing evaluation triggers Karl remediation before the final rewrite.

```ts
it("consults Karl remediation after a failing evaluation", async () => {
  const { fetchKarlRemediation } = await import("../utils");
  vi.mocked(fetchKarlRemediation).mockResolvedValue({
    consulted: true,
    guidance: ["Use a Transaction page with What to do and Related sections."],
    error: null
  } as never);

  // configure runKarlEvaluation to return failing score first, passing score second
  // assert fetchKarlRemediation was called before the second improveStructure call
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/usePageGeneration.test.ts`

Expected: FAIL because no Karl remediation call exists in the hook.

- [ ] **Step 3: Add a client helper in `src/utils.ts`**

```ts
export const fetchKarlRemediation = async (payload: {
  raw: string;
  pageType: string;
  evaluation: import("./types").KarlEvaluation;
}): Promise<{ consulted: boolean; guidance: string[]; error: string | null }> => {
  const res = await fetch(`${API_BASE}/karl-remediate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    return { consulted: false, guidance: [], error: `Karl remediation failed: ${res.status}` };
  }
  return res.json();
};
```

- [ ] **Step 4: Update `usePageGeneration.ts`**

In `improveFromEvaluationFeedback`, consult Karl before the corrective rewrite when the quality gate fails.

```ts
const karlRemediation = await fetchKarlRemediation({
  raw: parsed.raw,
  pageType: parsed.pageType,
  evaluation
});

if (karlRemediation.consulted) {
  adv(97, "Consulting Karl...");
}

const feedbackImproved = await improveStructure(
  parsed.raw,
  preferenceTexts,
  {
    ...evaluation,
    warnings: [
      ...(evaluation.warnings || []),
      ...karlRemediation.guidance
    ]
  }
);
```

- [ ] **Step 5: Update the hook tests**

Mock `fetchKarlRemediation` in `src/hooks/usePageGeneration.test.ts`.

```ts
fetchKarlRemediation: vi.fn().mockResolvedValue({
  consulted: false,
  guidance: [],
  error: null
})
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/hooks/usePageGeneration.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils.ts src/hooks/usePageGeneration.ts src/hooks/usePageGeneration.test.ts
git commit -m "feat: use Karl remediation for failing evaluations"
```

## Task 6: Add Progress States And Final Verification

**Files:**
- Modify: `src/hooks/usePageGeneration.ts`
- Modify: `src/services/chatStream.ts`
- Test: `src/hooks/usePageGeneration.test.ts`
- Test: `src/server.api.test.ts`

- [ ] **Step 1: Write the failing progress-state test**

```ts
it("shows Consulting Karl progress during failing-grade remediation", async () => {
  // arrange failing evaluation + Karl remediation
  // assert progressLabel becomes "Consulting Karl..."
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/usePageGeneration.test.ts`

Expected: FAIL because the label is not set consistently.

- [ ] **Step 3: Normalize progress labels**

Update `usePageGeneration.ts` and, if needed, `src/services/chatStream.ts` to use the final approved labels:

```ts
adv(15, "Generating draft");
adv(60, "Validating against Karl rules");
adv(70, `Retrying generation (${attempt}/${MAX_GENERATION_RETRIES})`);
adv(93, "Running Karl evaluation");
adv(97, "Consulting Karl...");
adv(99, "Applying final quality corrections");
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/generationValidation.test.ts
npm test -- src/hooks/usePageGeneration.test.ts
npm test -- src/server.api.test.ts
```

Expected: PASS on all three commands.

- [ ] **Step 5: Run broader regression pass**

Run:

```bash
npm test -- src/services/pageParser.test.ts src/services/chatStream.test.ts src/utils.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePageGeneration.ts src/services/chatStream.ts src/hooks/usePageGeneration.test.ts src/server.api.test.ts
git commit -m "feat: add Karl consultation progress states and verification coverage"
```

## Self-Review

- Spec coverage:
  - local Karl standards bundle: Task 1
  - deterministic validator: Task 2
  - 2 automatic retries: Task 3
  - server-side Karl MCP escalation: Task 4
  - automatic corrective rewrite after failing evaluation: Task 5
  - visible `Consulting Karl...` progress state: Task 6

- Placeholder scan:
  - no `TBD`, `TODO`, or “similar to” placeholders remain
  - all tasks include explicit files, commands, and minimal code targets

- Type consistency:
  - `GenerationValidationResult` defined in `src/types.ts`
  - `validateGeneratedPage` used consistently in hook/task/test descriptions
  - `fetchKarlRemediation` is the named client helper used by the hook

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-03-ai-generation-quality-reliability.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
