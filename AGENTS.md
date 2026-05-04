# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HHVC SF.gov Content Design Tool — a React 18 + Express.js application for creating and managing SF.gov web content. See `package.json` scripts for standard commands.

### Node.js

Do not document Node.js v22 as a hard requirement. The dependency tree supports Node `>=20.16.0`, and some packages may also express compatibility as `>=22.3.0` on the Node 22 line. Cursor Cloud may provide Node 22 by default, but that is an environment detail rather than the minimum supported version. The app uses the `--env-file` flag, so ensure a compatible `node` binary is available on the system PATH.

### Environment variables

The server reads `.env` at startup via `--env-file=.env`. Key variables:

- `ANTHROPIC_API_KEY` — required for AI generation/evaluation features; the app starts without it but AI endpoints return 500.
- `DB_FALLBACK_MODE=file` — skips PostgreSQL and uses a local JSON file at `.local/hhvc-local-db.json`. Set this when no Postgres is available.
- `DATABASE_URL` — PostgreSQL connection string (optional; auto-falls back to file mode on connection failure).

### Running the dev servers

`npm run dev` starts both the Express API (port 3001) and Vite dev server (port 5000) in parallel via `scripts/dev.mjs`. The Vite server proxies `/api` requests to the API server.

### Tests

`npm test` runs all Vitest tests. Test files live at `src/**/*.test.ts` and `src/**/*.test.tsx`.

### Build

`npm run build` produces a production bundle in `dist/`.

### TypeScript

npx tsc --noEmit type-checks the src/ directory.

### No ESLint

The project does not configure ESLint; TypeScript is the primary static analysis tool.

### Starting the .env file

Before running `npm run dev`, create a `.env` in the workspace root with at least:

```
ANTHROPIC_API_KEY=<your key>
DB_FALLBACK_MODE=file
```

The `ANTHROPIC_API_KEY` env var is injected automatically in Cloud Agent VMs via secrets. Write it into `.env` so the server picks it up via `--env-file=.env`:

```sh
printf 'ANTHROPIC_API_KEY=%s\nDB_FALLBACK_MODE=file\n' "$ANTHROPIC_API_KEY" > .env
```

### Gotchas

- A lockfile (`package-lock.json`) should be committed to ensure consistent dependency resolution.
- The file `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx` is a merge conflict artifact that causes `tsc` errors; ignore these.
- The server must be restarted after `.env` changes; Vite HMR does not reload the Express backend.
- AI page generation (the core feature) takes ~10-30 seconds per page. The evaluation endpoint uses Claude Haiku and is faster (~5 s).
- When the "Karl citations" service is unreachable (external dependency), the app logs a warning and falls back to base standards. This does not block page generation.


<claude-mem-context>
# Memory Context

# [ScaryJubilantParallelprocessing] recent context, 2026-05-03 4:58pm PDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (18,011t read) | 878,536t work | 98% savings

### May 2, 2026
18 6:32p 🔵 Google Drive Frontend Code Fully Mapped Across 4 Files
20 6:33p ✅ useDriveContext.ts Deleted and DriveFile Interface Removed from types.ts
21 " ✅ driveApi Removed from utils.ts
22 " ✅ Drive Params Removed from usePageGeneration Hook Type and Imports
23 6:34p ✅ Drive Destructuring Removed from usePageGeneration Hook Body
24 " 🔄 Removed Bulk Generation Feature from MapTab and usePageGeneration
25 7:06p 🔵 Task 6 Was Executed by Dispatched Subagent as Part of Multi-Task Cleanup Plan
26 " 🔵 plannedPages Param Survived Bulk Cleanup — Still Used for Single-Page Plan Linking
27 7:07p 🔵 Cleanup Branch Has Three Sequential Feature Removals
28 " 🔵 Deleted Bulk Generation Used bulkRunLock Mutex and Inline Progress Tracking
30 " 🔵 Persistence Layer Architecture: Dual-Mode File/Postgres with Auto-Fallback
29 7:10p ✅ Task 6 Code Review Approved — generate() Return Points Confirmed at Lines 132, 269, 273
31 7:11p 🟣 Test-First: Todo Queue Status Fields Added to Server Integration Test
32 " 🟣 TodoItem Type Extended with Queue Runner Fields: status, errorMessage, builtPageId, karlGrade
52 7:19p 🟣 useQueueRunner Hook and runQueue Pure Function Implemented
53 " 🔵 Code Review: Stop Test Is Fragile Due to Extra shouldStop() Call
### May 3, 2026
33 10:11a 🔵 ScaryJubilantParallelprocessing Project Structure Identified
34 " 🔵 CLAUDE.md Contains Superdesign Extension Instructions, Not Project-Specific Guidance
35 " 🔵 AGENTS.md Reveals Project Is SF.gov HHVC Tool with Secrets Rules and Karl Writing Standards
S14 claude-md-management:claude-md-improver — CLAUDE.md audited and improved for hhvc-tool (SF.gov HHVC AI page builder); project context block successfully prepended (May 3, 10:11 AM)
36 10:12a 🔵 hhvc-tool src/ Architecture: React Frontend with Karl Citations, File DB, and HHVC Import Pipeline
S15 New session started — design-review or design-consultation skill invoked; awaiting user input on design to review (May 3, 10:15 AM)
S16 Code review skill invoked — awaiting user to specify what to review; server.js identified as the only modified file in working tree (May 3, 10:15 AM)
37 10:16a 🔵 ScaryJubilantParallelprocessing Project Structure Assessed
39 10:17a 🟣 TASKS.md Initialized in ScaryJubilantParallelprocessing Project
38 10:18a 🔵 Productivity Plugin Task Management Skill Specification
S18 productivity:start — First-run initialization of productivity system in ScaryJubilantParallelprocessing project (May 3, 10:18 AM)
40 10:19a 🟣 dashboard.html Deployed to ScaryJubilantParallelprocessing Project Root
S17 productivity:start — Initialize productivity system in ScaryJubilantParallelprocessing project (May 3, 10:19 AM)
S19 productivity:start — Full initialization completed; user confirmed memory lives in Claude Mem, not a local directory (May 3, 10:19 AM)
S20 productivity:update — Status audit of HHVC app; surfaced Tasks 9–10 remaining plus uncommitted server.js changes on main (May 3, 10:20 AM)
41 10:22a 🔵 GitHub Issues Check Returned Empty for ScaryJubilantParallelprocessing
42 10:23a 🔵 Active Project Plan Found in Claude Mem: Cleanup & Queue Implementation
43 " 🔵 Git State: server.js Has Uncommitted Modifications, TASKS.md and dashboard.html Untracked
45 " 🔵 cleanup-and-queue Worktree Far Ahead of Memory File — Most Plan Tasks Already Committed
46 " 🔵 Plan Task Completion Status: Tasks 1–8 Done, Tasks 9–10 Remaining
44 10:24a 🔵 cleanup-and-queue Worktree Confirmed Present
48 " ✅ server.js: Prompt Caching Added and Model Names Corrected (Uncommitted on Main)
51 " ✅ TASKS.md Populated with Three Active Tasks from Audit
47 10:25a 🔵 Task 9 Spec: TodoPanel Redesign Requires Queue Props and Body Replacement
49 10:29a 🟣 Prompt Caching Added to All Anthropic Routes; Model Versions Updated
S21 Code review of server.js — prompt caching + model version update changes reviewed; two minor issues found (May 3, 10:29 AM)
50 10:30a 🔵 /api/evaluate Has Two-Stage JSON Repair Fallback Using Same Cached System Prompt
S22 productivity:update — Complete; TASKS.md populated, no memory gaps identified (May 3, 10:30 AM)
S23 Add API key — user asked to add an API key, location/type unspecified (May 3, 11:53 AM)
54 12:28p 🔴 Stop Test Rewritten to Assert Behavior Instead of Call Count
55 " 🔄 Removed Effectless shouldStop() Call from runQueue Implementation
56 " ✅ Task 8 Fix Committed to feature/cleanup-and-queue
57 12:29p 🔵 HHVC Cleanup Plan Structure: Tasks 9 and 10 Remain
58 3:17p 🔵 Coverage Files Deleted from Working Tree — Root Cause Traced
59 " ✅ Test Infrastructure Upgraded: jsdom + @testing-library Added, Coverage Config Added to vitest
60 3:18p 🔴 coverage/ Added to .gitignore — Stops Vitest Coverage Reports from Being Git-Tracked
61 3:22p 🟣 Karl SF.gov Editor Help Center MCP Added
62 3:40p 🟣 Karl GitBook MCP Added to VS Code mcp.json
63 " ⚖️ Design Spec Revised: Hybrid Karl-First Loop with Live MCP Escalation
64 " 🔵 Karl Evaluation Feedback Loop Confirmed In Source Code
65 3:42p 🔵 AI Generation Quality & Reliability Implementation Plan Loaded
66 " 🔵 src/karlStandards.ts Does Not Exist Yet — Task 1 Not Started
67 3:44p 🔴 Task 1 Step 1 Complete: Failing Test Added to src/utils.test.ts
68 " 🔵 Vitest Blocked by Windows EPERM Error on esbuild Spawn

Access 879k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>