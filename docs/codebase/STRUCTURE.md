# STRUCTURE.md — Directory Layout & Entry Points

## Directory Tree

```
project-root/
├── src/                              # React frontend source
│   ├── App.tsx                       # Root component, routing, main layout
│   ├── main.tsx                      # Vite entry point; mounts React to #app
│   ├── types.ts                      # TypeScript interfaces (PageDraft, TodoItem, etc.)
│   ├── constants.ts                  # KARL_PAGE_TYPES, SYSTEM_PROMPT, UI metadata
│   ├── utils.ts                      # Utility functions: clean(), pagesApi, todosApi, etc.
│   ├── {App,index}.css               # Global styles
│   ├── vite-env.d.ts                 # Vite type definitions
│   ├── components/                   # React UI components
│   │   ├── ui.tsx                    # Reusable UI atoms (Badge, Button, Card, etc.)
│   │   ├── ui.css                    # UI component styles
│   │   ├── ui.test.tsx               # UI component tests
│   │   ├── SfGovPreview.tsx          # Page preview renderer
│   │   ├── SfGovPreview.test.tsx     # Preview tests
│   │   ├── IdealSiteMap.tsx          # Sitemap visualization
│   │   ├── IdealSiteMap.test.ts      # Sitemap tests
│   │   ├── SfGovContentDesignTool.tsx # Main design tool component
│   │   ├── SfGovContentDesignTool.css # Design tool styles
│   │   ├── SfGovContentDesignTool.test.tsx # Design tool tests
│   │   ├── sfGovContentDesignTool/   # Sub-feature directory (design tool internals)
│   │   └── tabs/                     # Tab components (LibraryTab, MapTab, etc.)
│   │       ├── LibraryTab.tsx
│   │       └── MapTab.tsx
│   ├── hooks/                        # Custom React hooks
│   │   ├── usePageGeneration.ts      # AI page generation logic
│   │   ├── usePagesData.ts           # Page list & CRUD operations
│   │   ├── usePlanMap.ts             # Planned page mapping/navigation
│   │   ├── useVersionHistory.ts      # Page version history
│   │   ├── useQueueRunner.ts         # Task/todo queue management
│   │   └── useQueueRunner.test.ts    # Queue runner tests
│   ├── services/                     # Stateless API/business logic
│   │   ├── chatStream.ts             # Streaming chat API client
│   │   └── pageParser.ts             # Parse page structure from AI output
│   ├── state/                        # State management utilities (if any)
│   ├── fixtures/                     # Test data & mocks
│   └── karlCitations.test.ts         # Karl citations tests
│
├── lib/                              # Shared JavaScript utilities (backend & shared)
│   ├── persistence.js                # Database abstraction (PostgreSQL + file fallback)
│   └── karlCitations.js              # Karl content standards integration
│
├── scripts/                          # Node.js CLI scripts
│   ├── dev.mjs                       # Dev server launcher (Vite + Express in parallel)
│   └── report-fixture-metrics.mjs    # Generate fixture metrics report
│
├── server.js                         # Express API server (single file, all routes)
│   # Key routes:
│   # - POST /api/chat                     → forward to Anthropic + caching
│   # - POST /api/evaluate                 → evaluate page against Karl standards
│   # - POST /api/improve-structure        → AI-driven content refinement
│   # - GET/POST/PATCH /api/pages          → CRUD for PageDraft
│   # - GET/POST/PATCH /api/todos          → CRUD for TodoItem (queue management)
│   # - CRUD /api/planned-pages            → planned IA pages
│   # - CRUD /api/preferences              → preference storage
│   # - All routes include request ID tracking & error handling
│
├── .env                              # Environment configuration (git-ignored)
├── .env.example (optional)           # Example env vars (may be absent in local clones)
├── .local/                           # Runtime artifacts
│   └── hhvc-local-db.json            # File-based DB fallback (created at runtime)
│
├── dist/                             # Production build output (git-ignored)
│   └── (Vite output: minified JS, CSS, assets)
│
├── node_modules/                     # Dependencies (git-ignored)
├── package.json                      # Project metadata, scripts, dependencies
├── package-lock.json                 # Locked dependency versions
├── tsconfig.json                     # TypeScript config for src/
├── tsconfig.node.json                # TypeScript config for scripts
├── vite.config.ts                    # Vite bundler config
├── vitest.config.ts                  # Vitest test runner config
│
├── docs/                             # Documentation
│   └── codebase/                     # Generated codebase documentation
│       ├── STACK.md                  # Technology stack
│       ├── STRUCTURE.md              # This file
│       ├── ARCHITECTURE.md           # System design & data flow
│       ├── CONVENTIONS.md            # Code style & patterns
│       ├── INTEGRATIONS.md           # External APIs & services
│       ├── TESTING.md                # Test strategy & organization
│       └── CONCERNS.md               # Tech debt, risks, performance
│
└── README files (various)
    ├── AGENTS.md                     # Cursor Cloud development guide
    ├── CLAUDE.md                     # Design system instructions (legacy)
    └── TASKS.md                      # Task tracking & project status
```

## Entry Points

| Entry Point | File | Purpose | Command |
|-----------|------|---------|---------|
| **Vite Dev** | `src/main.tsx` | React app root; renders to `#app` in `index.html` | `npm run dev` (port 5000) |
| **Express API** | `server.js` | HTTP API server; all routes defined inline | `npm run dev` (port 3001) |
| **Build Output** | `dist/index.html` | Production-ready SPA | `npm run build` |
| **Type Check** | `src/` (all .ts/.tsx) | TypeScript compilation target | `tsc --noEmit` |
| **Tests** | `src/**/*.test.{ts,tsx}` | Vitest test discovery | `npm test` |

## Key Files By Purpose

### Frontend Application Structure
- **`src/App.tsx`** — Root React component; routing logic; main layout shell (high-churn; 34 git commits in 90 days)
- **`src/main.tsx`** — Vite entry; mounts React to DOM
- **`src/types.ts`** — Central TypeScript type definitions (PageDraft, TodoItem, KarlEvaluation, etc.)
- **`src/constants.ts`** — UI metadata, PAGE_TYPES, SYSTEM_PROMPT for AI, Karl page type enums (15 commits in 90 days)

### Component Library
- **`src/components/ui.tsx`** — Reusable UI atoms: `Badge`, `Button`, `Card`, `Divider`, `Btn`, `ComponentChips`, `RelPanel`, `KarlStatus`, `KarlEvalPanel`, `ProgressBar` (10 commits)
- **`src/components/SfGovPreview.tsx`** — Live page preview renderer
- **`src/components/SfGovContentDesignTool.tsx`** — Core design tool UI
- **`src/components/tabs/LibraryTab.tsx`** — Asset library UI (6 commits)
- **`src/components/tabs/MapTab.tsx`** — Navigation map UI (5 commits)

### State Management & Hooks
- **`src/hooks/usePageGeneration.ts`** — Orchestrates AI page generation (5 commits)
- **`src/hooks/usePagesData.ts`** — CRUD operations for pages; API calls
- **`src/hooks/usePlanMap.ts`** — Planned page state & navigation
- **`src/hooks/useVersionHistory.ts`** — Version snapshots & rollback
- **`src/hooks/useQueueRunner.ts`** — Task/todo queue execution engine

### Utilities & Services
- **`src/utils.ts`** — Helper functions: `clean()` (sanitize), `pagesApi()` (fetch wrapper), `replacePageDraftInRaw()`, `todosApi()`, `preferencesApi()` (20 commits in 90 days; high-churn area)
- **`src/services/chatStream.ts`** — Streaming chat API client for Claude
- **`src/services/pageParser.ts`** — Parse AI output into structured page fields

### Styling
- **`src/App.css`** — Application-level styles (overrides, layout utilities)
- **`src/index.css`** — Global resets, font definitions, CSS variables (7 commits)
- **`src/components/ui.css`** — Component-scoped styles

### Backend & Persistence
- **`server.js`** — Express HTTP API; all routes, DB queries, Anthropic integration (~34KB, monolithic; 29 commits in 90 days; high-churn area)
- **`lib/persistence.js`** — Database abstraction layer (PostgreSQL + file fallback)
- **`lib/karlCitations.js`** — Karl standards integration & prompt caching setup

### Build Configuration
- **`vite.config.ts`** — Vite bundler settings; dev server proxy config
- **`vitest.config.ts`** — Vitest test runner settings
- **`tsconfig.json`** — TypeScript strict mode, module resolution, lib targets
- **`tsconfig.node.json`** — TypeScript config for build scripts

### Development
- **`scripts/dev.mjs`** — Launches Vite dev server (port 5000) + Express API (port 3001) in parallel
- **`scripts/report-fixture-metrics.mjs`** — Generates test fixture statistics

## Testing Files

- **`src/App.tsx`** — (no dedicated test; integration tested via component tests)
- **`src/components/ui.test.tsx`** — UI component tests
- **`src/components/SfGovPreview.test.tsx`** — Preview component tests
- **`src/components/SfGovContentDesignTool.test.tsx`** — Design tool component tests
- **`src/components/IdealSiteMap.test.ts`** — Sitemap component tests
- **`src/utils.test.ts`** — Utility function tests (7 commits)
- **`src/hooks/useQueueRunner.test.ts`** — Queue runner logic tests
- **`src/karlCitations.test.ts`** — Karl citations integration tests
- **`src/server.api.test.ts`** — Express API integration tests (supertest)
- **`src/server.file-db.test.ts`** — File-based persistence tests

## Imports & Module Resolution

- **Default strategy:** Relative imports (`./`, `../`) for same-directory and adjacent modules
- No TypeScript path aliases configured; imports are relative or from `node_modules`
- **ESM format:** `import`/`export` syntax (configured via `"type": "module"` in package.json)
- **Node.js interop:** CJS modules imported via `createRequire()` (e.g., `pdf-parse`)

## Evidence

- Directory listing: `src/`, `lib/`, `scripts/` directories
- `package.json`: entry point `main.tsx`, scripts
- `vite.config.ts`: dev server config, proxy settings
- `tsconfig.json`: root tsconfig for type checking
- `server.js`: Express server & route definitions
- Git log: high-churn files (App.tsx, server.js, utils.ts)
