# AI Route Validation and Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod-backed request validation and targeted `express-rate-limit` protection to the three expensive AI routes without changing normal CRUD API behavior.

**Architecture:** Keep the change at the Express route boundary. Add one small server-only schema/helper module in `lib/`, attach reusable limiter middleware only to `POST /api/chat`, `POST /api/evaluate`, and `POST /api/improve-structure`, and preserve the existing downstream route logic and success payloads.

**Tech Stack:** Express 4, Zod, express-rate-limit, Vitest, Supertest

---

## File Structure

- `package.json`
  - Add runtime dependencies: `zod` and `express-rate-limit`.
- `lib/requestSchemas.js`
  - Define shallow Zod schemas for the three AI route payloads.
  - Export a small validation helper that turns `safeParse` failures into stable `400` JSON responses.
- `server.js`
  - Import the schema helper and limiter middleware.
  - Replace inline manual request-body checks for the three AI routes.
  - Apply route-specific limiters only to those three routes.
- `src/server.api.test.ts`
  - Keep the existing integration-test pattern.
  - Add route-body regression tests and limiter coverage.

### Task 1: Install runtime dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing dependency expectation check**

Add these assertions near the top of `src/server.api.test.ts` so the runtime dependency requirement is explicit before installing:

```ts
import packageJson from "../package.json";

describe("runtime dependency contract", () => {
  it("declares zod and express-rate-limit runtime dependencies", () => {
    expect(packageJson.dependencies.zod).toBeTruthy();
    expect(packageJson.dependencies["express-rate-limit"]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: FAIL with missing dependency assertions because `zod` and `express-rate-limit` are not in `package.json`.

- [ ] **Step 3: Install the minimal dependencies**

Run:

```bash
npm i zod express-rate-limit
```

Expected `package.json` dependency block to gain entries like:

```json
"dependencies": {
  "compression": "^1.8.1",
  "express": "^4.22.1",
  "express-rate-limit": "^8.0.0",
  "pg": "^8.20.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "zod": "^3.0.0"
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: the dependency-contract test passes, and existing server tests still run.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/server.api.test.ts
git commit -m "chore: add server validation dependencies"
```

### Task 2: Add the server-only Zod schema module

**Files:**
- Create: `lib/requestSchemas.js`
- Test: `src/server.api.test.ts`

- [ ] **Step 1: Write the failing invalid-body tests for the target routes**

Extend `src/server.api.test.ts` with stable `400` contract assertions that match the new helper behavior:

```ts
it("rejects invalid /api/chat payloads with a stable error", async () => {
  const res = await request(app).post("/api/chat").send({ foo: "bar" });
  expect(res.status).toBe(400);
  expect(res.body).toEqual(
    expect.objectContaining({
      error: "Invalid request body for /api/chat"
    })
  );
});

it("rejects invalid /api/evaluate payloads with a stable error", async () => {
  const res = await request(app).post("/api/evaluate").send({});
  expect(res.status).toBe(400);
  expect(res.body).toEqual(
    expect.objectContaining({
      error: "Invalid request body for /api/evaluate"
    })
  );
});

it("rejects invalid /api/improve-structure payloads with a stable error", async () => {
  const res = await request(app)
    .post("/api/improve-structure")
    .send({ raw: "", preferences: "bad" });
  expect(res.status).toBe(400);
  expect(res.body).toEqual(
    expect.objectContaining({
      error: "Invalid request body for /api/improve-structure"
    })
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: FAIL because the current routes still return older route-specific messages such as `Missing draft`.

- [ ] **Step 3: Write the minimal schema/helper implementation**

Create `lib/requestSchemas.js` with shallow boundary schemas and one reusable helper:

```js
import { z } from "zod";

const chatImageSchema = z.object({
  base64: z.string(),
  mimeType: z.string()
});

export const chatRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(z.unknown()),
  driveContext: z.string().optional(),
  images: z.array(chatImageSchema).optional()
}).passthrough();

export const evaluateRequestSchema = z.object({
  pageName: z.string().optional(),
  pageType: z.string().optional(),
  draft: z.string().trim().min(1),
  userType: z.string().optional()
});

export const improveStructureRequestSchema = z.object({
  raw: z.string().trim().min(1),
  preferences: z.array(z.string()).optional(),
  evaluationFeedback: z.record(z.unknown()).optional()
});

export function parseRequestBody(schema, req, res, routeName) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: `Invalid request body for ${routeName}` });
    return null;
  }
  return result.data;
}
```

- [ ] **Step 4: Run the focused test to verify the helper is ready to integrate**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: tests still fail because `server.js` is not using the new helper yet, but there are no import or syntax errors from the new module.

- [ ] **Step 5: Commit**

```bash
git add lib/requestSchemas.js src/server.api.test.ts
git commit -m "feat: add AI route request schemas"
```

### Task 3: Replace inline route checks and add route-specific limiters

**Files:**
- Modify: `server.js`
- Test: `src/server.api.test.ts`

- [ ] **Step 1: Write the failing limiter test**

Add a route-level throttling test in `src/server.api.test.ts`. Mock-free validation is enough because the limiter fires before upstream work:

```ts
it("rate limits repeated /api/chat requests", async () => {
  const payload = { model: "claude-test", messages: [] };

  const responses = [];
  for (let i = 0; i < 6; i += 1) {
    responses.push(await request(app).post("/api/chat").send(payload));
  }

  expect(responses.some((res) => res.status === 429)).toBe(true);
  const limited = responses.find((res) => res.status === 429);
  expect(limited?.body).toEqual(
    expect.objectContaining({
      error: expect.stringContaining("Too many requests")
    })
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: FAIL because `/api/chat` is not limited yet.

- [ ] **Step 3: Write the minimal `server.js` integration**

Update the imports near the top of `server.js`:

```js
import { rateLimit } from "express-rate-limit";
import {
  chatRequestSchema,
  evaluateRequestSchema,
  improveStructureRequestSchema,
  parseRequestBody
} from "./lib/requestSchemas.js";
```

Add reusable limiter definitions after `app.use(...)` setup:

```js
const aiLimiter = (limit, windowMs) => rateLimit({
  windowMs,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait and try again." }
});

const chatLimiter = aiLimiter(5, 60 * 1000);
const aiSecondaryLimiter = aiLimiter(10, 60 * 1000);
```

Replace the start of the three routes with schema-backed parsing and limiter middleware:

```js
app.post("/api/chat", chatLimiter, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured. Add it to your `.env` file." });
  }

  const body = parseRequestBody(chatRequestSchema, req, res, "/api/chat");
  if (!body) return;

  const { driveContext, images, ...anthropicBody } = body;
  // existing route logic continues unchanged
});

app.post("/api/evaluate", aiSecondaryLimiter, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = parseRequestBody(evaluateRequestSchema, req, res, "/api/evaluate");
  if (!body) return;

  const { pageName, pageType, draft, userType } = body;
  // existing route logic continues unchanged
});

app.post("/api/improve-structure", aiSecondaryLimiter, async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const body = parseRequestBody(improveStructureRequestSchema, req, res, "/api/improve-structure");
  if (!body) return;

  const { raw, preferences, evaluationFeedback } = body;
  // existing route logic continues unchanged
});
```

- [ ] **Step 4: Run the focused server test suite to verify it passes**

Run:

```bash
npm test -- src/server.api.test.ts
```

Expected: PASS for invalid-body tests, pass for the limiter test, and pass for existing API validation/restore/planned-page tests.

- [ ] **Step 5: Commit**

```bash
git add server.js lib/requestSchemas.js src/server.api.test.ts
git commit -m "feat: validate and rate limit AI routes"
```

### Task 4: Verify no unrelated API behavior regressed

**Files:**
- Modify: `src/server.api.test.ts` if any last-mile isolation fix is required

- [ ] **Step 1: Add one non-AI regression assertion if needed**

If the limiter test causes shared-state interference, isolate it by making the existing CRUD coverage explicit:

```ts
it("still allows non-AI CRUD requests without throttling", async () => {
  const res = await request(app).get("/api/pages");
  expect([200, 500]).toContain(res.status);
  expect(res.status).not.toBe(429);
});
```

- [ ] **Step 2: Run the full test suite relevant to the change**

Run:

```bash
npm test -- src/server.api.test.ts src/server.file-db.test.ts src/utils.test.ts
```

Expected: PASS. If the environment hits the known `esbuild` spawn `EPERM`, rerun the same command once and record that the blocker is environmental rather than functional.

- [ ] **Step 3: Run a production-safety smoke check**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS, ignoring the known conflict artifact called out in `AGENTS.md` if it is the only unrelated failure.

- [ ] **Step 4: Inspect the diff before closing**

Run:

```bash
git diff --stat HEAD~1 HEAD
git diff -- server.js lib/requestSchemas.js src/server.api.test.ts package.json
```

Expected: only the planned server-boundary files and dependency declarations changed.

- [ ] **Step 5: Commit any final stabilization**

```bash
git add server.js lib/requestSchemas.js src/server.api.test.ts package.json package-lock.json
git commit -m "test: verify AI route hardening rollout"
```

## Self-Review

- Spec coverage:
  - Zod boundary validation: Task 2 and Task 3
  - AI-route-only rate limiting: Task 3
  - Stable `400` / preserved `500` / new `429`: Task 2 and Task 3
  - Server-only test coverage: Task 3 and Task 4
- Placeholder scan:
  - No `TBD`, `TODO`, or “implement later” markers remain.
  - Each code-changing step includes concrete code or a concrete command.
- Type consistency:
  - Shared helper names are consistent: `chatRequestSchema`, `evaluateRequestSchema`, `improveStructureRequestSchema`, `parseRequestBody`.
  - Route names in tests and helper messages match the intended `"/api/..."` strings.
