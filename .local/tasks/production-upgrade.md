# Production Upgrade: DB, Evaluation & Design

## What & Why
Three interconnected upgrades to make the app production-ready:
1. Replace localStorage with a real PostgreSQL database so pages persist reliably across sessions and devices.
2. After each page is generated, automatically evaluate it against SF.gov / Karl best practices using the Karl MCP server and surface the results in the UI.
3. Improve the overall visual design and production-readiness of the interface.

## Done looks like
- Pages are saved to and loaded from a PostgreSQL database (not localStorage); existing data is migrated on first run.
- After a page is generated, a "Karl evaluation" step runs automatically — querying the Karl MCP for relevant standards, scoring the draft against them, and displaying a clear pass/warn/fail summary with specific notes on the page view.
- The `PageDraft` type and `storage` utility are updated to use the database API; the `hhvc:` localStorage prefix is retired.
- The UI feels polished and production-grade: consistent spacing, clear visual hierarchy, refined typography, loading states, and empty states throughout Builder, Library, and System Map tabs.
- The success state after generation shows the Karl evaluation score alongside the page type badge.

## Out of scope
- User authentication or multi-user support.
- Exporting pages to CMS or SF.gov directly.
- Changes to the AI prompt itself (SYSTEM_PROMPT) or generation logic beyond adding the post-generation evaluation step.

## Tasks
1. **Database layer** — Add a PostgreSQL database, create a `pages` table and a `todos` table, and replace the `storage` utility with a thin REST API (new Express endpoints on `server.js`) so all reads/writes go to the DB. Keep the same `storage` interface shape so callers change minimally.

2. **Karl evaluation step** — After a page is generated and saved, send the finished draft to Claude with the Karl MCP attached and a focused evaluation prompt. Return a structured result (score, passed checks, warnings, failed checks). Store the evaluation result on the `PageDraft` record. Display it clearly in the success state and in the page detail view.

3. **UI production polish** — Refine the overall visual design: improve layout consistency, typography, spacing, and component quality across all tabs. Upgrade empty states, loading skeletons, and error displays. Make the Karl evaluation result visually prominent and readable.

## Relevant files
- `src/constants.ts`
- `src/types.ts`
- `src/utils.ts`
- `src/App.tsx`
- `src/components/ui.tsx`
- `server.js`
