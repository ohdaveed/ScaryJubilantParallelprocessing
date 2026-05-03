# INTEGRATIONS.md — External APIs, Services & Dependencies

## Anthropic Claude API

### Purpose
AI-powered content generation, evaluation, and refinement for SF.gov pages.

### Integration Points

#### 1. POST /api/chat (Page Generation)
```
POST https://api.anthropic.com/v1/messages
Headers:
  - Content-Type: application/json
  - x-api-key: $ANTHROPIC_API_KEY
  - anthropic-version: 2023-06-01
  - anthropic-beta: mcp-client-2025-04-04

Request body:
{
  "model": "claude-sonnet-4-x" (or user-specified),
  "max_tokens": <user-specified>,
  "system": [{ 
    "type": "text", 
    "text": <Karl-enhanced system prompt>,
    "cache_control": { "type": "ephemeral" }
  }],
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." },
    // ... conversation history
  ]
}

Response:
  HTTP 200 with streaming body (ReadableStream)
  OR 
  HTTP error (400, 401, 429, 500, etc.)
```

**Models Used:**
- `claude-sonnet-4-x`: Complex page generation (slow, expensive, high quality)
- `claude-haiku-4-x`: Fast evaluation against Karl standards (~5s per page)

**Timeout:** 60 seconds (retries up to 1 time on failure)

**Prompt Caching:**
- System prompt cached as ephemeral (request-scoped cache)
- Reduces latency & token cost on repeated calls

#### 2. POST /api/evaluate (Karl Evaluation)
```
Same endpoint, different request:
  - model: "claude-haiku-4-x" (for speed)
  - max_tokens: 1500
  - system: Karl standards rules
  - messages: page draft + evaluation prompt

Response:
{
  "score": <0-100>,
  "grade": "A" | "B" | "C" | "D" | "F",
  "summary": "...",
  "passed": [...],
  "warnings": [...],
  "failed": [...]
}
```

#### 3. POST /api/improve-structure (Content Refinement)
```
Similar flow; uses refinement prompt to enhance page structure.
```

### Authentication
- **Method:** API key in `x-api-key` header
- **Source:** `process.env.ANTHROPIC_API_KEY`
- **Failure:** 500 error if not configured; app starts but AI endpoints disabled

### Retry Logic
```javascript
const postAnthropic = async (body, timeoutMs = 45000, retries = 1) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await withTimeout(
        () => fetch("https://api.anthropic.com/v1/messages", { ... }),
        timeoutMs
      );
      return response;
    } catch (error) {
      if (attempt === retries) throw error;
      attempt += 1;
    }
  }
};
```

### Error Handling
- Timeouts → Retry once
- Invalid API key → 401 (returned as-is to frontend)
- Rate limit (429) → Retry once, then fail
- Upstream error (500+) → Return 502 to client

### Evidence
- `server.js`: `/api/chat`, `/api/evaluate`, `/api/improve-structure` routes
- `lib/karlCitations.js`: system prompt injection with cache control
- `src/services/chatStream.ts`: frontend streaming response handling

---

## Karl Content Standards (SF.gov)

### Purpose
Ensures all generated pages comply with SF.gov content design rules, component library, and information architecture.

### Integration Method
**Prompt Injection:** System prompt enhanced via `withKarlCitations()` utility.

```javascript
// lib/karlCitations.js
const withKarlCitations = (baseSystemPrompt) => {
  const karlRules = `
    REAL KARL PAGE TYPES: Transaction, Information, Step by step, Location, ...
    REAL KARL COMPONENTS: Address, Media, Profile, Title, Description, ...
    NAMING RULES: Transactions start with "Report..." or "Fix..."
    ...
  `;
  return baseSystemPrompt + '\n\n' + karlRules;
};
```

### What Karl Checks
- **Page naming** — matches required patterns
- **Page type** — valid Karl types only
- **Components** — uses only approved Karl components
- **User language** — 6th-grade reading level, plain language
- **Scope** — HHVC-only content; no DBI overlap
- **CTAs** — correct routing (311, landlord notice, etc.)
- **Jurisdiction safeguards** — avoids overstating enforcement authority

### Fallback Behavior
If Karl service is unreachable or unavailable:
- Log warning
- Continue with base system prompt (no Karl rules)
- Page generation proceeds unaffected

### Configuration
- No explicit configuration needed
- Rules hardcoded in `src/constants.ts` (SYSTEM_PROMPT, KARL_PAGE_TYPES)
- Can be updated by editing `constants.ts` and redeploying

### Evidence
- `lib/karlCitations.js`: `withKarlCitations()` function
- `src/constants.ts`: `KARL_PAGE_TYPES`, `SYSTEM_PROMPT` (includes full Karl guidance)
- `server.js`: `/api/evaluate` route uses Karl evaluation rules

---

## PostgreSQL Database (Neon)

### Purpose
Primary persistent storage for pages, todos, page versions, and user preferences.

### Connection Details
```
Host: Neon endpoint (from DATABASE_URL)
Port: 5432
SSL: Required (sslmode=require)
Auth: Username + password (pooler credentials)
```

### Connection Pool
```javascript
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `pages` | PageDraft records | id, name, user_type, page_type, draft, created_at, karl_evaluation |
| `todos` | Task/queue items | id, title, status, page_id, queue_index, created_at |
| `planned_pages` | HHVC IA reference | name, page_type, user_type |
| `page_versions` | Version history (snapshots) | id, page_id, snapshot (JSONB), created_at |
| `user_preferences` | UI state (theme, layout) | user_id, key, value |

### Version Retention Policy
- **Max snapshots per page:** 50
- **Eviction:** Oldest snapshots dropped after 50 versions created
- **Retention constant:** `PAGE_VERSION_RETENTION` (lib/persistence.js)

### Timeout & Connection Limits
- **Query timeout:** [TODO] (check server logs for actual value)
- **Pool size:** [ASK USER] — not explicitly configured; uses pg defaults
- **Idle timeout:** [TODO]

### Connection Failure Handling
1. **Automatic fallback:** If connection fails, switch to file-based persistence
2. **Silent degradation:** No user-facing errors; app continues with file DB
3. **Env override:** Set `DB_FALLBACK_MODE=file` to skip DB connection attempt entirely

### Evidence
- `lib/persistence.js`: `pg.Pool` initialization, connection handling, fallback logic
- `AGENTS.md`: `DATABASE_URL` env var documentation
- `.env`: current PostgreSQL connection string (Neon)

---

## File-Based Persistence (JSON)

### Purpose
Fallback storage when PostgreSQL is unavailable or when forced via `DB_FALLBACK_MODE=file`.

### File Location
```
.local/hhvc-local-db.json
```

### Schema
```json
{
  "meta": {
    "nextIds": {
      "todos": 1,
      "planned_pages": 1,
      "user_preferences": 1,
      "page_versions": 1
    }
  },
  "pages": [ { ...PageDraft }, ... ],
  "todos": [ { ...TodoItem }, ... ],
  "planned_pages": [ { ...PlannedPage }, ... ],
  "user_preferences": [ { ...UserPreference }, ... ],
  "page_versions": [ { page_id, snapshot, created_at }, ... ]
}
```

### Behavior
- **Read:** Entire file loaded into memory at startup
- **Write:** Full file rewritten on every mutation (not incremental)
- **Performance:** Acceptable for development; not recommended for production
- **Concurrency:** No locking; last-write-wins (unsafe for multi-process)

### Auto-Detection
```javascript
// Triggered if:
// 1. DATABASE_URL not set
// 2. Database connection fails
// 3. DB_FALLBACK_MODE=file env var set
try {
  await pool.query("SELECT 1");
  // Use PostgreSQL
} catch (e) {
  console.log("Falling back to file-based persistence");
  // Use .local/hhvc-local-db.json
}
```

### Evidence
- `lib/persistence.js`: `createPersistence()`, file I/O logic
- `.local/hhvc-local-db.json`: actual file (generated at runtime)

---

## Google Drive API (Legacy)

### Status
**Deprecated.** Frontend integration removed; backend code remains for backward compatibility.

### Current Usage
- **Backend:** Server still supports uploading to/downloading from Google Drive
- **Frontend:** No UI for Drive operations
- **Configuration:** `GOOGLE_APPLICATION_CREDENTIALS` env var (path or base64 JSON)

### Routes (Disabled for Frontend)
- `POST /api/drive/upload` [Disabled]
- `GET /api/drive/list` [Disabled]

### Deprecation Note
Drive integration was removed because:
- Cluttered frontend UI
- OAuth flow complexity
- File storage now local/database-backed

Future cleanup:
- [ ] Remove unused Drive routes from server.js
- [ ] Remove GOOGLE_APPLICATION_CREDENTIALS from docs

### Evidence
- `server.js`: commented-out or removed Drive routes
- `.env`: `GOOGLE_APPLICATION_CREDENTIALS` config (not actively used)
- `CLAUDE.md`: notes Drive code removed from frontend

---

## External Dependencies (npm)

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.22.1 | HTTP web framework |
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | React DOM rendering |
| `pg` | ^8.20.0 | PostgreSQL client |
| `html-to-image` | ^1.11.13 | Canvas-based image capture |
| `html2canvas` | ^1.4.1 | HTML to canvas (PDF export) |
| `jspdf` | ^2.5.1 | PDF generation |
| `jszip` | ^3.10.1 | ZIP archive handling (Word parsing) |
| `mammoth` | ^1.12.0 | Word (.docx) parser |
| `pdf-parse` | ^2.4.5 | PDF text extraction |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.3 | Type checking |
| `vite` | ^5.4.21 | Build tool & dev server |
| `vitest` | ^3.2.4 | Unit test framework |
| `supertest` | ^7.1.1 | HTTP assertion library (API testing) |
| `@vitejs/plugin-react` | ^4.7.0 | React Fast Refresh for Vite |
| `@types/react` | ^18.3.28 | TypeScript types for React |
| `@types/pg` | ^8.20.0 | TypeScript types for pg |

### Unused/Deprecated
- `@types/supertest` (installed but rarely needed)

### Evidence
- `package.json`: all dependencies listed
- `package-lock.json`: locked versions for reproducibility

---

## No Third-Party Integrations

The following are **NOT** used despite common assumptions:

| Service | Status | Why |
|---------|--------|-----|
| **ESLint** | Not configured | TypeScript is primary static analysis |
| **Prettier** | Not configured | Manual formatting or team preference |
| **GraphQL** | Not used | REST API via Express sufficient |
| **WebSockets** | Not used | HTTP streaming sufficient for AI responses |
| **Redis** | Not used | File/DB fallback handles caching |
| **Authentication** | Not used | No user auth (single-user tool) |
| **Monitoring/APM** | Not configured | Logs to stdout; external aggregation possible |

---

## Environment Variables Summary

### Required for AI Features
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional for Database
```bash
DATABASE_URL=postgresql://...        # If not set, uses file fallback
DB_FALLBACK_MODE=file                # Force file mode (skip DB attempt)
```

### Optional for Google Drive (Legacy)
```bash
GOOGLE_APPLICATION_CREDENTIALS=...   # No longer active in frontend
```

### Server Startup
```bash
node --env-file=.env server.js       # Reads .env at startup only
```

---

## Evidence

- `package.json`: dependency list, scripts
- `server.js`: Anthropic API calls, Express routes
- `lib/persistence.js`: database connection, file I/O
- `AGENTS.md`: environment variable documentation
- `.env`: current configuration (contains secrets)
- `src/services/chatStream.ts`: streaming API client
