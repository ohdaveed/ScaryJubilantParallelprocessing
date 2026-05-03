# TESTING.md — Test Strategy, Organization & Mocking

## Test Framework & Setup

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | ^3.2.4 | Unit + integration test runner |
| **supertest** | ^7.1.1 | HTTP assertion library (API testing) |
| **[TODO]** | — | No explicit test utilities exported; patterns inline |

### Running Tests

```bash
npm test                 # Run all tests (Vitest default)
npm run test:watch      # Watch mode (rerun on file changes)
```

### Test Discovery
- **Glob pattern:** `src/**/*.test.ts` and `src/**/*.test.tsx`
- **Configuration:** `vitest.config.ts` (minimal; mostly defaults)

---

## Test File Organization

### By Type

#### Unit Tests (Business Logic)

```
src/utils.test.ts                    # Utility functions: clean(), pagesApi(), etc.
src/hooks/useQueueRunner.test.ts     # Queue execution logic
src/karlCitations.test.ts            # Karl standards integration
src/components/IdealSiteMap.test.ts  # Sitemap visualization logic
```

**Scope:** Pure functions, state logic, domain calculations (no DOM/network mocking required).

#### Component Tests (React)

```
src/components/ui.test.tsx           # UI atom components (Badge, Button, Card, etc.)
src/components/SfGovPreview.test.tsx # Page preview renderer
src/components/SfGovContentDesignTool.test.tsx # Main design tool
```

**Scope:** Component rendering, event handling, state updates (mocked children/props).

#### Integration Tests (API)

```
src/server.api.test.ts               # Express routes (supertest)
src/server.file-db.test.ts           # File-based persistence
```

**Scope:** Full HTTP request/response cycle, database operations, actual error responses.

### By Feature

```
[Feature Area]
├── index.ts (or App.tsx)
├── types.ts
├── utils.ts
├── utils.test.ts
├── components/
│   ├── Component.tsx
│   └── Component.test.tsx
└── hooks/
    ├── useHook.ts
    └── useHook.test.ts
```

---

## Test Patterns & Conventions

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clean, normalizePageName } from "../utils";

describe("utils: clean()", () => {
  it("should trim whitespace", () => {
    const result = clean("  hello  ");
    expect(result).toBe("hello");
  });

  it("should remove HTML tags", () => {
    const result = clean("<p>hello</p>");
    expect(result).toBe("hello");
  });

  it("should handle null/undefined gracefully", () => {
    expect(clean(null)).toBe("");
    expect(clean(undefined)).toBe("");
  });
});
```

### Component Test Template

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "./ui";

describe("Badge Component", () => {
  it("should render with type class", () => {
    render(<Badge type="Transaction" />);
    const badge = screen.getByRole("img", { hidden: true });
    expect(badge).toHaveClass("badge--transaction");
  });

  it("should trigger onClick callback", () => {
    const onClick = vitest.fn();
    render(<Badge type="Information" onClick={onClick} />);
    fireEvent.click(screen.getByRole("img", { hidden: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### API Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";

describe("POST /api/pages", () => {
  it("should create a page and return PageDraft", async () => {
    const response = await request(app)
      .post("/api/pages")
      .send({
        name: "Test Page",
        userType: "General public",
        pageType: "Information",
        purpose: "Test"
      })
      .expect(200);

    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Test Page");
  });

  it("should return 400 if required fields missing", async () => {
    const response = await request(app)
      .post("/api/pages")
      .send({ name: "Incomplete" })
      .expect(400);

    expect(response.body).toHaveProperty("error");
  });
});
```

---

## Mocking Strategy

### What We Mock

| Target | Strategy | Reason |
|--------|----------|--------|
| **Anthropic API** | Manual mock (server.js posts real requests) | We want to verify contract; tests may hit real API |
| **Database** | Actual file-based DB (`.local/test-db.json`) | Integration tests verify DB operations |
| **HTTP responses** | supertest intercepts (no network) | Vite proxy not active during tests |
| **React hooks** | Actual hook execution (no wrapper) | Test components with real hooks |
| **DOM** | No DOM library; inline assertions | Minimal UI logic (mostly data binding) |

### [TODO] Mock Patterns Not Yet Implemented

- [ ] Mock Anthropic API for deterministic tests (reduce latency)
- [ ] Mock file I/O for unit tests (currently hits disk)
- [ ] Test fixtures for common PageDraft shapes
- [ ] Mock Google Drive API (legacy; low priority)

---

## Test Coverage

### Current State

```
Files     Functions   Statements   Branches
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[TODO]    [TODO]      [TODO]       [TODO]
```

**Gap:** No coverage report configured. To enable:

```bash
# Add to vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/"]
    }
  }
});
```

### Target Coverage
- **Utilities (utils.ts):** 90%+ (pure functions, deterministic)
- **Hooks:** 70%+ (state logic, async calls)
- **Components:** 60%+ (rendering, event handling)
- **Server routes:** 70%+ (critical paths: /api/chat, /api/evaluate, /api/pages CRUD)
- **Persistence:** 80%+ (file & DB operations)

### Known Coverage Gaps

| Module | Gap | Reason |
|--------|-----|--------|
| `server.js` | Anthropic error cases | Hard to mock; may require real API |
| `usePagesData.ts` | Network failures | Timeouts not tested |
| `components/tabs/*` | Navigation edge cases | Complex state flow |
| `pageParser.ts` | Malformed AI output | Requires test fixtures |

---

## Test Data & Fixtures

### Location
```
src/fixtures/
```

### Fixture Categories

**[TODO]** — Structured fixtures not yet organized. Examples inline in test files:

```typescript
const FIXTURE_PAGE_DRAFT: PageDraft = {
  id: "test-123",
  name: "Test Page",
  userType: "General public",
  pageType: "Information",
  purpose: "For testing",
  // ... rest of fields
};

const FIXTURE_KARL_EVALUATION: KarlEvaluation = {
  score: 85,
  grade: "B",
  summary: "Meets standards with minor improvements",
  passed: ["naming", "components"],
  warnings: ["cta-clarity"],
  failed: []
};
```

### Fixture Metrics

To report fixture statistics:

```bash
npm run metrics:fixtures
```

Output: Summary of fixture shape, field cardinality, edge cases.

---

## Common Test Scenarios

### Testing Async API Calls

```typescript
it("should handle async page generation", async () => {
  const hook = renderHook(() => usePageGeneration());

  act(() => {
    hook.result.current.generate({
      userType: "Tenant",
      userGoal: "Report a problem",
      pageType: "Transaction"
    });
  });

  expect(hook.result.current.isGenerating).toBe(true);

  await waitFor(() => {
    expect(hook.result.current.isGenerating).toBe(false);
  });

  expect(hook.result.current.output).toBeTruthy();
});
```

### Testing Error Handling

```typescript
it("should handle API errors gracefully", async () => {
  // Arrange: mock failed API
  vitest.mock("../services/pagesApi", () => ({
    pagesApi: () => Promise.reject(new Error("Network error"))
  }));

  // Act
  const { result } = renderHook(() => usePageGeneration());
  await act(() => result.current.generate({ ... }));

  // Assert
  expect(result.current.error).toContain("Network error");
});
```

### Testing Database Fallback

```typescript
it("should fall back to file DB if PostgreSQL unavailable", async () => {
  // Set DB_FALLBACK_MODE=file env var
  process.env.DB_FALLBACK_MODE = "file";

  const db = await createPersistence();
  const page = await db.pages.create({ name: "Test", ... });

  expect(page).toHaveProperty("id");
  // Verify file was written to .local/hhvc-local-db.json
});
```

---

## Test Execution Flow

### Development Workflow
```
1. npm run dev                # Start dev servers (includes test watcher)
2. Edit code
3. npm run test:watch        # Auto-run affected tests
4. Review output
5. Fix failures
```

### CI/CD Workflow (if configured)
```
1. npm install
2. npm test                  # Run all tests (exit 1 if fail)
3. npm run build             # Verify production build
4. Deploy (if 1-3 pass)
```

### Manual Pre-Deployment
```bash
npm test                     # Full test suite
npm run build                # Production build
npm run preview              # Preview production build
```

---

## Known Testing Challenges

### 1. AI Output Parsing
**Challenge:** AI responses unpredictable; hard to test parser without real API  
**Workaround:** [TODO] Create synthetic test fixtures with various response shapes

### 2. Streaming Responses
**Challenge:** Testing streaming chunks requires special handling  
**Status:** Not currently tested; supertest handles basic HTTP testing

### 3. Database Isolation
**Challenge:** File DB writes to disk; can interfere with parallel tests  
**Workaround:** Use unique DB paths per test or mock file I/O

### 4. React Hook Ordering
**Challenge:** Hooks called in different render orders may cause state inconsistencies  
**Status:** Minimal custom hooks reduce complexity; standard patterns used

---

## Performance Testing

**Status:** Not configured.

### To Enable (Optional)
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    benchmark: {
      include: ["src/**/*.bench.ts"],
      include: ["src/**/*.perf.ts"]
    }
  }
});
```

### Candidate Benchmarks
- Page generation latency (E2E)
- Page parsing performance (large drafts)
- File DB I/O (read/write times)
- Query performance (PostgreSQL)

---

## Debugging Tests

### Verbose Output
```bash
npm test -- --reporter=verbose
```

### Single Test
```bash
npm test -- --grep "should clean HTML tags"
```

### Debug Mode (Node Inspector)
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs
# Then connect DevTools to chrome://inspect
```

---

## Evidence

- `vitest.config.ts`: test configuration
- `src/**/*.test.ts`, `src/**/*.test.tsx`: test files
- `package.json`: test scripts (`npm test`, `npm run test:watch`)
- `src/server.api.test.ts`: supertest example (Express API testing)
- `src/server.file-db.test.ts`: persistence layer testing
- `scripts/report-fixture-metrics.mjs`: fixture reporting script
