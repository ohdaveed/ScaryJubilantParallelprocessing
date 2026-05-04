# ARCHITECTURE.md — System Design & Data Flow

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  src/                                                       │
│  ├─ App.tsx (routing, main layout)                         │
│  ├─ hooks/ (usePagesData, usePageGeneration, etc.)        │
│  ├─ components/ (UI atoms, preview, design tool)          │
│  └─ services/ (chatStream, pageParser)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (REST)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Express API)                          │
│  server.js                                                  │
│  ├─ POST /api/chat (→ Anthropic, cache)                   │
│  ├─ POST /api/evaluate (Karl check)                       │
│  ├─ POST /api/improve-structure (refinement)              │
│  ├─ POST /api/karl-remediate (MCP guidance retrieval)     │
│  ├─ CRUD /api/pages (PageDraft)                           │
│  ├─ CRUD /api/todos (TodoItem queue)                      │
│  ├─ CRUD /api/planned-pages (from DB)                     │
│  └─ CRUD /api/preferences (user preferences)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQL / File I/O
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                         │
│  lib/persistence.js                                         │
│                                                             │
│  ┌─────────────────────┐      ┌──────────────────────┐    │
│  │  PostgreSQL (Neon)  │      │  File-Based JSON DB  │    │
│  │  (primary)          │  ←→  │  .local/hhvc-...json │    │
│  │  DATABASE_URL       │      │  (fallback)          │    │
│  └─────────────────────┘      └──────────────────────┘    │
│                                                             │
│  Tables:                                                    │
│  - pages (PageDraft records)                               │
│  - todos (TodoItem queue)                                  │
│  - planned_pages (HHVC IA reference)                       │
│  - page_versions (version history snapshots)               │
│  - user_preferences (UI state)                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                          │
│                                                             │
│  ├─ Anthropic Claude API (v1, 2023-06-01)                 │
│  │  ├─ claude-sonnet-4-6 (complex tasks)                  │
│  │  └─ claude-haiku-4-5 (fast eval)                       │
│  │  └─ Prompt caching (system prompts)                    │
│  │                                                         │
│  ├─ Karl Citations Service (SF.gov standards)             │
│  │  └─ Enriches system prompt with content rules          │
│  │                                                         │
│  └─ Google Drive (legacy; backend only)                   │
│     └─ Legacy service-account key config                  │
│                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Page Generation Lifecycle

### 1. User Initiates Generation (Frontend)

```
User clicks "Generate Page"
    ↓
App.tsx → usePageGeneration hook
    ↓
Constructs request payload:
  - userType, userGoal, pageType, context, images, etc.
    ↓
POST /api/chat → server.js
```

### 2. Backend Processing (server.js `/api/chat`)

```
Receive request
    ↓
[Validate] isObject + messages + model
    ↓
[Optional] Attach Drive context (if driveContext provided)
    ↓
[Optional] Attach images (up to 3, max 4MB each, PNG/JPEG/WebP)
    ↓
[Inject] withKarlCitations() → enhance system prompt
    ↓
Create cache_control header: { type: "ephemeral" }
    ↓
POST https://api.anthropic.com/v1/messages
  (timeout: 60s, retry up to 1 time on failure)
    ↓
Stream response back to client (ReadableStream)
```

### 3. Frontend Streams & Parses (React + chatStream service)

```
Receive streaming response
    ↓
chatStream.ts iterates over chunks
    ↓
pageParser.ts parses structured fields:
  - name, userType, userGoal, primaryPurpose, pageType
  - recommendedComponents, systemRelationships
  - duplicationRisks, enforcementCheck, pageDraft
  - integrationNotes
    ↓
Store in PageDraft state via usePagesData hook
    ↓
Update UI in real-time (StreamRenderer component)
```

### 4. User Evaluation (POST /api/evaluate)

```
User clicks "Evaluate Against Karl"
    ↓
POST /api/evaluate with PageDraft
    ↓
server.js:
  - Send to Anthropic (claude-haiku-4-5 for speed)
  - System prompt: Karl content standards rules
  - Payload: page name, purpose, draft, components, etc.
    ↓
Parse response into KarlEvaluation:
  - score (0–100)
  - grade (A–F)
  - summary, passed[], warnings[], failed[]
    ↓
Return to frontend & display in KarlEvalPanel
```

### 5. Improvement Loop (POST /api/improve-structure)

```
User clicks "Improve Structure"
    ↓
POST /api/improve-structure with page + feedback
    ↓
server.js sends to Anthropic with refinement prompt
    ↓
AI returns improved PageDraft fields
    ↓
Frontend replaces draft, re-evaluates if needed
```

### 6. Persistence (CRUD /api/pages)

```
Save Page:
  POST /api/pages { id, data, versionNotes?, versionTrigger? }
    ↓
  server.js → lib/persistence.js
    ↓
  If PostgreSQL available:
    INSERT INTO pages (...)
    INSERT INTO page_versions (...)
      ↓
  Else (file mode):
    Read .local/hhvc-local-db.json
    Append to pages array
    Write back to disk
    
List Pages:
  GET /api/pages
    ↓
  SELECT * FROM pages
  (or file mode equivalent)
```

## Component Hierarchy

```
App.tsx (root)
├─ SfGovContentDesignTool
│  ├─ TabNav (routing)
│  ├─ LibraryTab
│  │  └─ PageCard (usePagesData)
│  ├─ MapTab
│  │  └─ IdealSiteMap
│  └─ DesignTab
│     ├─ InputForm (usePageGeneration)
│     ├─ StreamRenderer (real-time output)
│     ├─ SfGovPreview (live page preview)
│     └─ KarlEvalPanel (KarlEvaluation display)
└─ RelPanel (version history, related pages)
```

## State Management

### React Hooks (Custom)

| Hook | Scope | Purpose | State Structure |
|------|-------|---------|-----------------|
| `usePagesData()` | Global | CRUD operations for pages | `{ pages, loading, error, ...apiMethods }` |
| `usePageGeneration()` | Per-tab | Generate page via streaming AI | `{ isGenerating, output, error, generate() }` |
| `usePlanMap()` | Global | Navigate planned pages (IA) | `{ planned, selected, select(), deselect() }` |
| `useVersionHistory()` | Per-page | Version snapshots & rollback | `{ versions, currentVersion, rollback() }` |
| `useQueueRunner()` | Per-tab | Execute todo queue | `{ queue, isRunning, run(), pause() }` |

### Persistence State (Backend)

```typescript
{
  meta: {
    nextIds: {
      todos: number,
      planned_pages: number,
      user_preferences: number,
      page_versions: number
    }
  },
  pages: PageDraft[],
  todos: TodoItem[],
  planned_pages: PlannedPage[],
  user_preferences: UserPreference[],
  page_versions: PageVersion[]
}
```

## Request/Response Patterns

### Streaming Response (`/api/chat`)

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Transfer-Encoding: chunked

<ReadableStream chunks>
PAGE NAME: Generated Page Title
PRIMARY USER: General public
PAGE TYPE: Transaction
...
```

### JSON Response (`/api/evaluate`, `/api/pages`)

```json
{
  "score": 85,
  "grade": "B",
  "summary": "...",
  "passed": [...],
  "warnings": [...],
  "failed": [...]
}
```

### Error Handling

```typescript
// Backend (server.js)
if (!ANTHROPIC_API_KEY) {
  return res.status(500).json({ 
    error: "ANTHROPIC_API_KEY is not configured..." 
  });
}

// Request ID tracking (all endpoints)
res.locals.requestId = randomUUID();
res.setHeader("x-request-id", requestId);
logWithRequest(res, "stage", "message", { extra: "context" });
```

## Karl Content Standards Integration

The **Karl** system is SF.gov's content design framework. Integration occurs via:

1. **System Prompt Injection** (`lib/karlCitations.js`)
   - `withKarlCitations(systemPrompt)` → appends Karl page types, component library, naming rules, structure constraints
   - Called on every `/api/chat` request before sending to Anthropic
   - Cached via `cache_control: { type: "ephemeral" }`

2. **Evaluation** (`/api/evaluate`)
   - Send page draft to Claude Haiku
   - Evaluates against injected Karl rules
   - Returns KarlEvaluation with score, grade, passed/warnings/failed

3. **Fallback Behavior**
   - If Karl service unreachable, logs warning, continues with base rules
   - Does NOT block page generation

## Data Persistence Strategy

### Primary: PostgreSQL (Neon)

- Connection via `pg.Pool` with `DATABASE_URL`
- Automatic connection pooling
- Tables: `pages`, `todos`, `planned_pages`, `page_versions`, `user_preferences`
- SSL required (`sslmode=require`)

### Fallback: File-Based JSON

- File: `.local/hhvc-local-db.json`
- Triggered by:
  - Connection failure (auto-detected)
  - `DB_FALLBACK_MODE=file` env var (manual)
- State structure: nested arrays (pages, todos, etc.)
- Created at runtime if missing
- Version retention: 50 snapshots per page (oldest dropped)

## Error Boundaries & Recovery

| Failure Point | Behavior | Recovery |
|--------------|----------|----------|
| PostgreSQL unavailable | Fall back to file mode automatically | No user action required; file DB used |
| Anthropic API timeout | Retry up to 1 time (60s default for `/api/chat`) | Return 500 if retries fail |
| Missing ANTHROPIC_API_KEY | Return 500 on AI routes | App starts; AI endpoints disabled |
| File I/O error in persistence | Log error; propagate to caller | Caller handles 500 response |
| Cross-page version restore | Explicitly rejected (`404`) | Use matching page/version pair only |
| Planned-page cycle assignment | Explicitly rejected (`400`) | Choose parent outside child ancestry |

## Evidence

- `server.js`: route definitions, Anthropic integration, error handling
- `lib/persistence.js`: PostgreSQL connection, file fallback logic, state schema
- `lib/karlCitations.js`: prompt injection, cache control
- `src/hooks/usePageGeneration.ts`: frontend generation orchestration
- `src/services/chatStream.ts`: streaming response handling
- `src/services/pageParser.ts`: parse structured output
- `vite.config.ts`: dev server proxy configuration (localhost:5000 → localhost:3001)
- `scripts/dev.mjs`: parallel process launcher
