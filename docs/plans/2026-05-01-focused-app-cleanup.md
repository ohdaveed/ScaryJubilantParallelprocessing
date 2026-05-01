# HHVC Page Builder — Focused App Cleanup & Queue-Based Bulk Generation

**Date:** 2026-05-01  
**Goal:** Remove unused features to reduce complexity, then improve bulk generation into a proper queue-based workflow that supports the long-term automation goal.

---

## What we're removing

### Google Drive integration
- Delete `lib/googleDrive.js` and `hhvc-drive-sa..json`
- Delete `src/hooks/useDriveContext.ts`
- Remove "Reference documents" panel from Generate sidebar in `App.tsx`
- Remove all `/api/drive/*` endpoints from `server.js`
- Remove `googleapis` from `package.json`
- Remove `driveFiles`, `driveContents`, `selectedDriveIds`, `driveLoadingIds` from `usePageGeneration` params
- Remove Drive context from prompt construction in `server.js`

### Screenshot / image upload
- Remove `ScreenshotAsset` type from `src/state/appTypes.ts`
- Remove `screenshots` state, `handleImageFiles`, `browseForImages`, `dropzoneDepth` from `App.tsx`
- Remove the dropzone UI card from the Generate sidebar
- Remove image parameters from `usePageGeneration` hook signature
- Remove image handling from prompt construction in `server.js`

### Suggested pages
- Remove `SUGGESTED_PAGES` constant from `constants.ts`
- Remove `filterEligibleSuggestedPages` and `sampleSuggestedPages` from `utils.ts`
- Remove `visibleSuggested`, `suggestedKey`, `refreshSuggestions` state/logic from `TodoPanel`
- Remove the suggestions section UI from `TodoPanel`
- Remove `SuggestedPage` type from `types.ts`

### Dead conflict files
- Delete `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx`
- Delete `src/components/SfGovPreview (# Edit conflict 2026-04-20 cujqeiC #).tsx`

### One-time import data
- Delete `src/data/hhvc-pages-import.json`
- Delete `src/data/hhvc-pages-import.review.json`
- Confirm the import button/flow in Library can be removed if these are the only source files

### Existing bulk generation buttons
- Remove "Generate first-draft skeletons" button from `LibraryTab`
- Remove "Bulk generate unbuilt planned pages" button from `MapTab`
- Remove `bulkFirstDraftSkeletons`, `bulkSkeletonRunning`, `bulkSkeletonProgress` from `usePageGeneration`
- Remove `bulkGenerateUnbuiltPlanned`, `bulkPlannedRunning`, `bulkPlannedProgress` from `usePageGeneration`
- Remove props threading of the above through `App.tsx` → `LibraryTab` / `MapTab`

---

## What we're building: queue-based bulk generation

### Data model change
Add a `status` field to `TodoItem`:

```ts
export type TodoStatus = "pending" | "generating" | "done" | "failed";

export interface TodoItem {
  id: number;
  topic: string;
  userType: string;
  done: boolean;           // keep for backwards compat / manual checkbox
  status: TodoStatus;      // new field driving queue behavior
  errorMessage?: string;   // populated on failure
  builtPageId?: string;    // populated on success, links to the generated page
  karlGrade?: string;      // populated on success for inline display
}
```

DB migration: add `status TEXT NOT NULL DEFAULT 'pending'`, `error_message TEXT`, `built_page_id TEXT`, `karl_grade TEXT` to the `todos` table.

### TodoPanel redesign

**Layout (top to bottom):**
1. Header row: "Pages to build" label + pending count badge + "Run queue" button (disabled when no pending items or queue is running)
2. Queue items list — each row shows:
   - Status indicator (dot: grey=pending, spinner=generating, green=done, red=failed)
   - Topic + user type
   - On done: Karl grade chip inline
   - On failed: error message in small text + "Retry" button
   - Remove (✕) button (disabled while item is generating)
3. "Add page" input (always visible at bottom)

**Run queue behavior:**
- Processes pending items sequentially, one at a time
- Each item transitions: `pending → generating → done | failed`
- On failure, error is saved to the item; queue continues to next item
- "Run queue" button becomes "Stop" while running; stop halts after current item completes
- On completion of all items, a summary line shows: "Run complete — X done, Y failed"

**Planned pages → queue:**
- In `PlanSidebar`, clicking "Generate content" on an unbuilt planned page now calls `todosApi.create()` and shows a "Added to queue" confirmation instead of immediately triggering generation
- This replaces `generateFromPlanned` triggering `generate()` directly

### New API endpoints needed
- `PATCH /api/todos/:id` — update status, errorMessage, builtPageId, karlGrade
- Existing `POST /api/todos`, `GET /api/todos`, `DELETE /api/todos/:id`, `PATCH /api/todos/:id/toggle` remain

### usePageGeneration changes
- `bulkGenerateUnbuiltPlanned` and `bulkFirstDraftSkeletons` are removed
- A new `useQueueRunner` hook handles queue execution:
  - Reads pending todos
  - Calls the existing `generate()` function for each item
  - Updates todo status via API after each completes or fails
  - Exposes `running`, `currentItemId`, `start`, `stop`

---

## What stays unchanged

- Generate tab core flow (topic input, user type, notes, Karl evaluation, refine, version history)
- Library tab (search, filter, sort, review status, single-page delete, bulk delete)
- Site Plan tab and Ideal Map tab
- Karl evaluation system
- Version history
- Preferences per page
- SF.gov page preview and export
- `lib/persistence.js` and `lib/karlCitations.js`

---

## Approximate scope

| Area | Change |
|------|--------|
| `App.tsx` | ~150 lines removed (Drive panel, dropzone, bulk buttons, related state/callbacks) |
| `usePageGeneration.ts` | ~100 lines removed (bulk logic, image/drive params) |
| `utils.ts` | ~60 lines removed (suggested pages helpers) |
| `constants.ts` | ~200+ lines removed (SUGGESTED_PAGES array) |
| `server.js` | ~100 lines removed (Drive endpoints, image prompt handling) |
| `lib/googleDrive.js` | Deleted entirely (~103 lines) |
| `useDriveContext.ts` | Deleted entirely (~66 lines) |
| New: `useQueueRunner.ts` | ~80 lines |
| `TodoPanel` redesign | Net ~0 (remove suggestions, add status UI) |
| DB migration | +4 columns on todos table |

**Net reduction: ~600–700 lines of code removed, ~80 added.**
