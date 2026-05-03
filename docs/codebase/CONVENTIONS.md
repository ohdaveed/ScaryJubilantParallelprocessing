# CONVENTIONS.md — Code Style, Patterns & Practices

## TypeScript & Type Safety

### Philosophy
- **Strict mode:** TypeScript configured with strict checks (implicit any forbidden)
- **No ESLint:** TypeScript is the primary static analysis tool (`tsc --noEmit` used for checking)
- **Module system:** ESM (`import`/`export`) throughout

### Type Definitions

```typescript
// Central types in src/types.ts
export interface PageDraft {
  id: string;
  name: string;
  userType: string;                    // e.g., "General public", "Property owner"
  userGoal: string;
  purpose: string;
  pageType: string;                    // e.g., "Transaction", "Information"
  components: string;                  // Comma-separated or list
  relationships: string;               // System relationships JSON or string
  duplication: string;
  enforcement: string;
  draft: string;                       // Raw HTML/markdown page draft
  integration: string;
  valid: boolean;
  raw: string;                         // Original AI response (unparsed)
  createdAt: string;                   // ISO 8601 timestamp
  karlConnected: boolean;              // Has Karl evaluation been run?
  karlEvaluation?: KarlEvaluation;     // Optional; populated after evaluation
  skeleton?: boolean;
  imported?: boolean;
  currentVersionNumber?: number;       // Ephemeral; set by API list response
  version?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  qualityGate?: { status: "pass" | "review_required"; reasons: string[] };
}

export interface KarlEvaluation {
  score: number;                       // 0–100
  grade: string;                       // "A", "B", "C", "D", "F", or "—"
  summary: string;
  passed: string[];
  warnings: string[];
  failed: string[];
  parseError?: boolean;
  parseFailureReason?: string;
  confidence?: "high" | "medium" | "low";
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  pageId?: string;
  createdAt: string;
  queueIndex?: number;                 // Position in execution queue
}
```

### Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| **React Components** | PascalCase | `SfGovPreview`, `LibraryTab`, `RelPanel` |
| **Custom Hooks** | `use*` prefix, PascalCase | `usePageGeneration`, `usePagesData`, `useQueueRunner` |
| **Services** | camelCase | `chatStream`, `pageParser`, `pagesApi` |
| **Utilities** | camelCase | `clean`, `formatPersistenceError`, `normalizePlannedPage` |
| **Constants** | UPPER_SNAKE_CASE | `KARL_PAGE_TYPES`, `SYSTEM_PROMPT`, `PAGE_VERSION_RETENTION` |
| **Types** | PascalCase | `PageDraft`, `KarlEvaluation`, `TodoItem` |
| **Enums** | PascalCase values | `"pending" \| "approved" \| "rejected"` |
| **Variables** | camelCase | `pages`, `isGenerating`, `requestId` |
| **Database fields** | snake_case | `created_at`, `user_type`, `page_versions` |
| **CSS Classes** | kebab-case, BEM-like | `.app-evaluating`, `.streamRenderer__line--key` |

## React Patterns

### Hooks (Custom)

All state management uses custom React hooks. Example pattern:

```typescript
// src/hooks/usePageGeneration.ts
export function usePageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (userInput: PageGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await pagesApi("POST", "/api/chat", { ...userInput });
      // Handle streaming response
      setOutput(response);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { isGenerating, output, error, generate };
}
```

### Component Structure

```typescript
// React functional components with hooks
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  const { state, setState } = useState(...);
  const { pages } = usePagesData();
  const memoized = useMemo(() => { ... }, [deps]);
  
  useEffect(() => {
    // side effects
  }, [deps]);

  return (
    <div className="component-class">
      {/* JSX */}
    </div>
  );
}
```

### Props Typing

```typescript
interface ComponentProps {
  onView?: () => void;              // Optional callback
  page: PageDraft;                  // Required object
  text: string;                     // Required string
  count?: number;                   // Optional number
  items: TodoItem[];                // Required array
  children?: React.ReactNode;       // React children
}
```

## Backend (Express) Patterns

### Route Structure (server.js)

All routes defined in a single file (`server.js`). Each route follows:

```typescript
app.post("/api/resource", async (req, res) => {
  // 1. Validate input
  if (!isValidRequest(req.body)) {
    return res.status(400).json({ error: "Invalid input" });
  }

  // 2. Log with request ID
  logWithRequest(res, "stage", "Starting request", { extra: "data" });

  // 3. Execute business logic (try-catch)
  try {
    const result = await doSomething(req.body);
    logWithRequest(res, "stage", "Success", { result });
    return res.json(result);
  } catch (error) {
    logWithRequest(res, "stage", "Error", { error: String(error) });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});
```

### Error Handling

```typescript
// Server-wide error format
const getErrorMessage = (error) => formatPersistenceError(error);

// Request logging with tracing
const logWithRequest = (reqOrRes, stage, message, extra = {}) => {
  const requestId = reqOrRes?.locals?.requestId || "no-request-id";
  const payload = { requestId, stage, message, ...extra };
  console.log(JSON.stringify(payload));
};

// Anthropic API error handling
try {
  const response = await postAnthropic(body, timeoutMs, retries);
  // handle response
} catch (error) {
  if (attempt === retries) throw error;
  attempt += 1;
}
```

### Async/Await

- Always use `async`/`await` over `.then()` chains
- Wrap in `try-catch` for Express routes
- Use `withTimeout()` utility for long-running operations (default 45s)

## Data Parsing & Normalization

### Page Parsing (pageParser.ts)

AI output is unstructured text. Parser extracts structured fields:

```typescript
// Pattern: parse raw text into PageDraft fields
const fields = {
  name: extractField(raw, "PAGE NAME:"),
  userType: extractField(raw, "PRIMARY USER:"),
  userGoal: extractField(raw, "USER GOAL:"),
  pageType: extractField(raw, "PAGE TYPE:"),
  draft: extractField(raw, "PAGE DRAFT|## "),  // Longest trailing content
  // ... more fields
};
```

### Sanitization (utils.ts)

```typescript
// clean(value: unknown): string
// Sanitize page names, descriptions by trimming & escaping HTML
export const clean = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/<[^>]*>/g, "");  // Strip tags
};
```

## Database Conventions

### PostgreSQL Schema

```sql
-- Pages table (persists PageDraft)
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_type TEXT,
  user_goal TEXT,
  purpose TEXT,
  page_type TEXT,
  components TEXT,
  relationships TEXT,
  duplication TEXT,
  enforcement TEXT,
  draft TEXT,
  integration TEXT,
  valid BOOLEAN,
  raw TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  karl_connected BOOLEAN DEFAULT false,
  karl_evaluation JSONB,
  review_status TEXT
);

-- Todos table (task/queue items)
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  page_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  queue_index INT
);

-- Page versions (snapshots for history)
CREATE TABLE page_versions (
  id SERIAL PRIMARY KEY,
  page_id TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### File-Based Fallback

State serialized as JSON with nested arrays:

```json
{
  "meta": { "nextIds": { "todos": 1, "planned_pages": 1, ... } },
  "pages": [ { "id": "...", "name": "...", ... } ],
  "todos": [ { "id": "...", "title": "...", ... } ],
  "planned_pages": [ { "name": "...", "page_type": "...", ... } ],
  "user_preferences": [ ... ],
  "page_versions": [ ... ]
}
```

## Error Codes & Messages

| Code | Message | Cause |
|------|---------|-------|
| 400 | Invalid request body | Malformed JSON or missing required fields |
| 500 | ANTHROPIC_API_KEY is not configured | Environment variable not set |
| 500 | Operation timed out after {ms}ms | Request exceeded timeout window |
| 502 | Upstream returned empty response body | Anthropic API returned invalid response |
| [Database error] | Various | Persistence layer failure |

## Testing Conventions

### Test File Placement

- **Unit tests:** `src/**/*.test.ts` (hooks, utils, services)
- **Component tests:** `src/components/**/*.test.tsx` (UI)
- **Integration tests:** `src/server.api.test.ts` (Express routes via supertest)

### Test Patterns

```typescript
// Vitest + supertest
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server.js";

describe("POST /api/pages", () => {
  it("should create a page", async () => {
    const res = await request(app)
      .post("/api/pages")
      .send({ name: "Test Page", pageType: "Information" })
      .expect(200);
    
    expect(res.body).toHaveProperty("id");
  });
});
```

## CSS Conventions

### Global Styles (src/index.css)

```css
:root {
  --color-primary: #185FA5;
  --color-text-success: #22a94c;
  --color-text-error: #d12828;
}

* {
  box-sizing: border-box;
}
```

### Component Styles

- CSS Modules for scoped styles: `Component.module.css`
- BEM-like naming for complex components: `.component__child--modifier`
- Inline styles avoided; all CSS in `.css` files

## Comment Style

### TypeScript Comments

```typescript
// Single-line comments for brief notes
const value = 5;

/** JSDoc for public functions/types */
export function generatePage(input: PageGenerationRequest): Promise<PageDraft> { ... }

// Inline comments explain *why*, not *what*
if (condition) {
  // This check prevents duplicate processing in file mode
  result = process(data);
}
```

### TODO/FIXME Tracking

- TODOs in production code logged during scan
- Known issues in `CONCERNS.md`
- Test TODOs in `src/**/*.test.ts` (not counted as production debt)

## Import Organization

```typescript
// React & Node core first
import React, { useState, useCallback } from "react";
import { readFile } from "node:fs/promises";

// Third-party libraries
import express from "express";
import { Pool } from "pg";

// Local utilities & types
import { PageDraft } from "./types";
import { clean, pagesApi } from "./utils";
import "./App.css";
```

## Environment Variables

### Reading Env Vars

```javascript
// Backend reads from .env via node --env-file=.env
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Validation
if (!ANTHROPIC_API_KEY) {
  console.log("Warning: ANTHROPIC_API_KEY not configured");
}
```

### Required vs. Optional

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `DATABASE_URL` | No | — | PostgreSQL connection (falls back to file) |
| `DB_FALLBACK_MODE` | No | — | Set to `file` to force file-based DB |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | — | Google Drive API (legacy, backend only) |

## Evidence

- `src/types.ts`: type definitions and naming conventions
- `src/utils.ts`: sanitization & utility patterns
- `server.js`: Express route structure, error handling
- `lib/persistence.js`: database schema & file fallback
- `src/hooks/*.ts`: custom React hook patterns
- `src/**/*.test.ts`: test file organization
- `src/**/*.css`: CSS conventions
- `tsconfig.json`: TypeScript strict mode configuration
- `package.json`: `"type": "module"` (ESM format)
