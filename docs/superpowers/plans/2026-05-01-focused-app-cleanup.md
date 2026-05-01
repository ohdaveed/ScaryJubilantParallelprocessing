# HHVC App Cleanup & Queue-Based Bulk Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Google Drive integration, screenshot upload, suggested pages, and old bulk-generation buttons, then replace bulk generation with a queue-based system where the todo list drives sequential page generation with per-item status tracking.

**Architecture:** Six deletion tasks strip dead code first (Drive, screenshots, suggestions, old bulk buttons), then three build tasks add the new queue system: `TodoItem` gains status fields backed by DB columns, a new `useQueueRunner` hook drives the sequential run loop, and `TodoPanel` is redesigned to show per-item status inline.

**Tech Stack:** React 18, TypeScript, Express, Vitest, supertest, file-backed JSON store + Postgres via `pg`.

**Working directory:** `.worktrees/cleanup-and-queue` (branch `feature/cleanup-and-queue`)
**Run tests with:** `npm test` from that directory.

---

## File Map

| File | Change |
|------|--------|
| `src/App (# Edit conflict...).tsx` | DELETE |
| `src/components/SfGovPreview (# Edit conflict...).tsx` | DELETE |
| `lib/googleDrive.js` | DELETE |
| `hhvc-drive-sa..json` | DELETE |
| `src/hooks/useDriveContext.ts` | DELETE |
| `src/data/hhvc-pages-import.json` | DELETE |
| `src/data/hhvc-pages-import.review.json` | DELETE |
| `src/types.ts` | Remove `DriveFile`, `SuggestedPage`; extend `TodoItem` |
| `src/state/appTypes.ts` | Remove `ScreenshotAsset`, `ChatImagePayload` |
| `src/utils.ts` | Remove `filterEligibleSuggestedPages`, `sampleSuggestedPages`, `driveApi`; add `todosApi.updateQueue` |
| `src/constants.ts` | Remove `SUGGESTED_PAGES` |
| `src/hooks/usePageGeneration.ts` | Remove Drive/screenshot params, bulk functions; change `generate()` return type |
| `src/components/tabs/LibraryTab.tsx` | Remove `bulkSkeletonRunning`, `bulkSkeletonProgress`, `onBulkFirstDraftSkeletons` props + UI |
| `src/components/tabs/MapTab.tsx` | Remove `bulkPlannedRunning`, `bulkPlannedProgress`, `onBulkGenerateUnbuiltPlanned` props + UI |
| `src/App.tsx` | Remove Drive panel, dropzone, bulk button wiring, screenshots state; wire `useQueueRunner`; update `PlanSidebar` add-to-queue |
| `lib/persistence.js` | Add `updateTodoQueue()` to file store + Postgres; add `ALTER TABLE` columns |
| `server.js` | Remove all `/api/drive/*` endpoints; extend `PATCH /api/todos/:id` for queue fields |
| `src/server.file-db.test.ts` | Add test for todo queue status PATCH |
| `src/hooks/useQueueRunner.ts` | CREATE — pure `runQueue()` fn + React hook wrapper |
| `src/hooks/useQueueRunner.test.ts` | CREATE — tests for `runQueue()` |

---

## Task 1: Delete dead files

**Files:**
- Delete: `src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx`
- Delete: `src/components/SfGovPreview (# Edit conflict 2026-04-20 cujqeiC #).tsx`
- Delete: `lib/googleDrive.js`
- Delete: `hhvc-drive-sa..json`
- Delete: `src/data/hhvc-pages-import.json`
- Delete: `src/data/hhvc-pages-import.review.json`

- [ ] **Step 1: Delete the files**

```bash
git rm "src/App (# Edit conflict 2026-04-19 4xnybrC #).tsx"
git rm "src/components/SfGovPreview (# Edit conflict 2026-04-20 cujqeiC #).tsx"
git rm lib/googleDrive.js
git rm "hhvc-drive-sa..json"
git rm src/data/hhvc-pages-import.json
git rm src/data/hhvc-pages-import.review.json
```

- [ ] **Step 2: Run tests to confirm nothing broke**

```bash
npm test
```
Expected: 42 tests passing.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete dead conflict files, Drive credentials, and one-time import data"
```

---

## Task 2: Remove Google Drive — server layer

**Files:**
- Modify: `server.js` — remove all `/api/drive/*` endpoints and `googleDrive` imports
- Modify: `package.json` — remove `googleapis`

- [ ] **Step 1: Remove Drive imports and endpoints from server.js**

At the top of `server.js`, remove the import block:
```js
import {
  getDrive,
  listFilesInFolder,
  getFileMetadata,
  exportGoogleFile,
  downloadFileMedia,
  httpStatusFromDriveError
} from "./lib/googleDrive.js";
```

Also remove `const DRIVE_FOLDER_ID = "1SrKB78oWGHhILjQxS7R-ZqCXkzuAlvKi";`.

Then find and delete the three Drive route handlers. They match these patterns — delete each full `app.get`/`app.post` block:

```js
app.get("/api/drive/files", async (req, res) => { ... });
app.get("/api/drive/files/:fileId", async (req, res) => { ... });
```

(Search for `/api/drive` to find both blocks; delete from the `app.get` line through the closing `});`.)

- [ ] **Step 2: Remove googleapis from package.json**

In `package.json`, delete the line:
```json
"googleapis": "^169.0.0",
```

- [ ] **Step 3: Run npm install to clean lockfile**

```bash
npm install
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 42 tests passing.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove Google Drive server endpoints and googleapis dependency"
```

---

## Task 3: Remove Google Drive — frontend layer

**Files:**
- Delete: `src/hooks/useDriveContext.ts`
- Modify: `src/types.ts` — remove `DriveFile` interface
- Modify: `src/utils.ts` — remove `driveApi`
- Modify: `src/hooks/usePageGeneration.ts` — remove Drive params and Drive context from prompt
- Modify: `src/App.tsx` — remove Drive panel, Drive state, Drive props to `usePageGeneration`

- [ ] **Step 1: Delete useDriveContext.ts**

```bash
git rm src/hooks/useDriveContext.ts
```

- [ ] **Step 2: Remove DriveFile from src/types.ts**

Delete this interface:
```ts
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}
```

- [ ] **Step 3: Remove driveApi from src/utils.ts**

Find the `driveApi` export (near line 586) and delete it entirely:
```ts
export const driveApi = {
  list: async (): Promise<import("./types").DriveFile[]> => { ... },
  getFileContent: async (fileId: string): Promise<string> => { ... }
};
```

- [ ] **Step 4: Remove Drive params from usePageGeneration.ts**

Remove these from the `UsePageGenerationParams` type:
```ts
screenshots: ScreenshotAsset[];         // also removed in Task 4 — skip for now
selectedDriveIds: Set<string>;
driveContents: Record<string, string>;
driveFiles: DriveFile[];
```

Remove from the destructured params block:
```ts
screenshots,
selectedDriveIds,
driveContents,
driveFiles,
```

Remove the `DriveFile` import from the import line at the top.

Remove the `driveContext` construction block (lines ~189-198):
```ts
const driveContext = selectedDriveIds.size > 0
  ? [...selectedDriveIds]
      .filter((id) => driveContents[id])
      .map((id) => { ... })
      .join("\n\n")
  : undefined;
```

Change the `streamModelText` call to remove `driveContext`:
```ts
// Before:
const streamResult = await streamModelText({ msg, mode: "generate", driveContext, images: ... });
// After:
const streamResult = await streamModelText({ msg, mode: "generate" });
```

Remove `driveContents`, `driveFiles`, `selectedDriveIds` from the `useCallback` dependency array.

- [ ] **Step 5: Remove Drive state and panel from App.tsx**

Remove the `useDriveContext` import and destructuring:
```ts
// Delete this import:
import { useDriveContext } from "./hooks/useDriveContext";

// Delete this destructuring block:
const {
  driveFiles,
  driveLoading,
  driveError,
  driveOpen,
  setDriveOpen,
  selectedDriveIds,
  setSelectedDriveIds,
  driveContents,
  driveLoadingIds,
  toggleDriveFile,
  clearSelectedDriveFiles
} = useDriveContext();
```

Remove these props from the `usePageGeneration` call:
```ts
screenshots,           // also Task 4
selectedDriveIds,
driveContents,
driveFiles,
```

Remove these props from the `<SfGovContentDesignTool>` render:
```ts
generateLabel={
  loading ? ... : `Generate page${selectedDriveIds.size > 0 || ...}`
}
```
Simplify `generateLabel` to:
```ts
generateLabel={
  loading
    ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…")
    : `Generate page${screenshots.length > 0 ? ` (${screenshots.length} image${screenshots.length !== 1 ? "s" : ""})` : ""}`
}
```
(Note: screenshots reference stays until Task 4.)

Delete the entire "Reference documents" `<Card>` block from the generate sidebar. It starts with:
```tsx
<Card className="app-card-pad--14-16-mb">
  <button
    type="button"
    onClick={() => setDriveOpen(o => !o)}
    className="app-drive-toggle"
  >
```
and ends with the closing `</Card>` of that block.

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: 42 tests passing.

- [ ] **Step 7: Commit**

```bash
git commit -m "chore: remove Google Drive frontend integration"
```

---

## Task 4: Remove screenshot upload

**Files:**
- Modify: `src/state/appTypes.ts` — remove `ScreenshotAsset`, `ChatImagePayload`
- Modify: `src/hooks/usePageGeneration.ts` — remove screenshot params, image passing
- Modify: `src/App.tsx` — remove dropzone UI, screenshot state, screenshot-related callbacks

- [ ] **Step 1: Remove types from appTypes.ts**

Delete `ScreenshotAsset` and `ChatImagePayload` from `src/state/appTypes.ts`:
```ts
// Delete these two types:
export type ScreenshotAsset = {
  name: string;
  base64: string;
  mimeType: string;
};

export type ChatImagePayload = {
  base64: string;
  mimeType: string;
};
```

The file will only contain `ImportResult` and `GenerationInputSnapshot`.

- [ ] **Step 2: Remove screenshot params from usePageGeneration.ts**

Remove `ScreenshotAsset` and `ChatImagePayload` imports from the import line:
```ts
import { ChatImagePayload, GenerationInputSnapshot, ScreenshotAsset } from "../state/appTypes";
// Becomes:
import { GenerationInputSnapshot } from "../state/appTypes";
```

Remove from `UsePageGenerationParams`:
```ts
screenshots: ScreenshotAsset[];
setScreenshots: Dispatch<SetStateAction<ScreenshotAsset[]>>;
```

Remove from the destructured params:
```ts
screenshots,
setScreenshots,
```

In the `streamModelText` wrapper type, remove the `images` parameter:
```ts
// In the streamModelText useCallback, change the inner call:
// Before:
return streamModelTextService({ msg, mode, driveContext, images, ... });
// After (driveContext already removed in Task 3):
return streamModelTextService({ msg, mode, systemPrompt: SYSTEM_PROMPT, ... });
```

In `generate()`, remove:
```ts
images: screenshots.length > 0 ? screenshots.map((s) => ({ base64: s.base64, mimeType: s.mimeType })) : undefined
```
from the `streamModelText` call args.

Also remove:
```ts
if (!ov.quiet) {
  ...
  setScreenshots([]);
}
```
and remove `setScreenshots` from the `useCallback` dependency array.

- [ ] **Step 3: Remove screenshot state and dropzone from App.tsx**

Remove state:
```ts
const [screenshots, setScreenshots] = useState<ScreenshotAsset[]>([]);
const [dropzoneDepth, setDropzoneDepth] = useState(0);
```

Remove `ScreenshotAsset` import from `../state/appTypes`.

Remove `handleImageFiles` and `browseForImages` callback functions.

Remove `screenshots` and `setScreenshots` from the `usePageGeneration` call.

Delete the entire screenshot dropzone `<div className="app-field-mb8">` block from the generate sidebar (starts with `<p className="app-shot-label">Screenshots` and contains the dropzone and `app-shot-grid` section).

Remove the `MAX_SCREENSHOTS`, `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_SIZE` constants.

Update `generateLabel` (already simplified in Task 3 to reference screenshots) to remove screenshot reference:
```ts
generateLabel={
  loading
    ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…")
    : "Generate page"
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 42 tests passing.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove screenshot upload feature"
```

---

## Task 5: Remove suggested pages

**Files:**
- Modify: `src/constants.ts` — remove `SUGGESTED_PAGES`
- Modify: `src/utils.ts` — remove `filterEligibleSuggestedPages`, `sampleSuggestedPages`
- Modify: `src/types.ts` — remove `SuggestedPage`
- Modify: `src/App.tsx` — simplify `TodoPanel` to plain queue

- [ ] **Step 1: Remove SUGGESTED_PAGES from constants.ts**

Search for `export const SUGGESTED_PAGES` and delete the entire array (it spans many lines listing topic/userType/pageType objects). Also remove the `SuggestedPage` import at the top of constants.ts if it imports from `./types`.

- [ ] **Step 2: Remove helpers from utils.ts**

Delete `filterEligibleSuggestedPages` (lines ~229-241) and `sampleSuggestedPages` (lines ~243-266).

Also delete the `suggestionKey` helper at the top of utils.ts if it is only used by those two functions:
```ts
const suggestionKey = (value?: string): string => clean(value).toLowerCase();
```

- [ ] **Step 3: Remove SuggestedPage from types.ts**

Delete:
```ts
export interface SuggestedPage {
  topic: string;
  userType: string;
  pageType: string;
}
```

- [ ] **Step 4: Simplify TodoPanel in App.tsx**

In the `TodoPanel` function, remove:
- `visibleSuggested` state
- `suggestedKey` useMemo
- The `useEffect` that calls `setVisibleSuggested`
- `suggested` useMemo (calls `filterEligibleSuggestedPages`)
- `addSug` callback
- `refreshSuggestions` callback

Remove these imports from App.tsx:
```ts
import { ..., filterEligibleSuggestedPages, sampleSuggestedPages } from "./utils";
import { ..., SuggestedPage } from "./types";
import { SUGGESTED_PAGES, ... } from "./constants";
```

Remove the `SuggestedPage` type from the `TodoPanel` props type (if it was typed there).

In the JSX, delete the entire suggestions section:
```tsx
{suggested.length > 0 && (
  <>
    <Divider variant="suggested" />
    <div className="app-sug-head">...</div>
    {visibleSuggested.map((s, i) => (...))}
  </>
)}
```

Change the add button at the bottom of `TodoPanel` from its conditional logic back to a plain add button:
```tsx
// Before (complex conditional):
<button
  type="button"
  onClick={() => suggested.length === 1 ? undefined : suggested.length > 0 ? refreshSuggestions : () => setAdding(true)}
  ...
>
  {suggested.length > 0 ? "Refresh choices" : "+ Add page"}
</button>

// After (simple):
<button type="button" className="app-todo-dash" onClick={() => setAdding(true)}>
  + Add page
</button>
```

Remove `pages` from `TodoPanel` props since it was only used for suggestions. Update the `TodoPanel` props type and the call site in App.tsx accordingly.

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: 42 tests passing. Also check that `npm run build` compiles cleanly:
```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git commit -m "chore: remove suggested pages feature"
```

---

## Task 6: Remove old bulk generation

**Files:**
- Modify: `src/hooks/usePageGeneration.ts` — remove `bulkFirstDraftSkeletons`, `bulkGenerateUnbuiltPlanned`, bulk state; change `generate()` return type to `Promise<PageDraft | null>`
- Modify: `src/components/tabs/LibraryTab.tsx` — remove three bulk props
- Modify: `src/components/tabs/MapTab.tsx` — remove three bulk props
- Modify: `src/App.tsx` — remove bulk wiring

- [ ] **Step 1: Change generate() return type in usePageGeneration.ts**

Change the function signature and final return values:

```ts
// Function now returns Promise<PageDraft | null>
export function usePageGeneration(params: UsePageGenerationParams) {
  ...
  const generate = useCallback(async (ov: GenerateOverrides = {}): Promise<PageDraft | null> => {
    ...
    // On success, change:
    //   return true;  →  return page;
    // On failure, change:
    //   return false; →  return null;
    ...
    setLoading(false);
    return page;   // was: return true
  }, [...]);

  // regenerate calls void generate — no change needed there.
```

Find the two `return false` and one `return true` in the function:
- In the `catch` block at the bottom: `return false;` → `return null;`
- At the top guard when topic is empty: `return false;` → `return null;`  
- At the bottom after success: `return true;` → `return page;`

(The variable `page` is in scope at the bottom `return`; it was declared as `let page: PageDraft` earlier in the try block.)

- [ ] **Step 2: Remove bulk functions and state from usePageGeneration.ts**

Delete these state declarations:
```ts
const [bulkSkeletonRunning, setBulkSkeletonRunning] = useState(false);
const [bulkSkeletonProgress, setBulkSkeletonProgress] = useState<...>(null);
const [bulkPlannedRunning, setBulkPlannedRunning] = useState(false);
const [bulkPlannedProgress, setBulkPlannedProgress] = useState<...>(null);
```

Delete `const bulkRunLock = useRef(false);`

Delete the entire `bulkFirstDraftSkeletons` useCallback.

Delete the entire `bulkGenerateUnbuiltPlanned` useCallback.

Remove all four bulk items from the return object:
```ts
// Delete from return:
bulkFirstDraftSkeletons,
bulkSkeletonRunning,
bulkSkeletonProgress,
bulkGenerateUnbuiltPlanned,
bulkPlannedRunning,
bulkPlannedProgress
```

Also remove `plannedPages` from `UsePageGenerationParams` and its destructure — it was only used by `bulkGenerateUnbuiltPlanned`.

- [ ] **Step 3: Remove bulk props from LibraryTab.tsx**

Remove from `LibraryTabProps` type:
```ts
bulkSkeletonRunning: boolean;
bulkSkeletonProgress: { current: number; total: number; name: string } | null;
onBulkFirstDraftSkeletons: () => Promise<unknown>;
```

Remove from the destructure inside `LibraryTab`.

Delete the bulk button UI block:
```tsx
<Btn
  onClick={() => void onBulkFirstDraftSkeletons()}
  ...
>
  {bulkSkeletonRunning ? "Bulk AI drafts running…" : "AI first draft: all skeletons"}
</Btn>
{bulkSkeletonRunning && bulkSkeletonProgress && (
  <span ...>{bulkSkeletonProgress.current}/{bulkSkeletonProgress.total}...</span>
)}
```

- [ ] **Step 4: Remove bulk props from MapTab.tsx**

Remove from `MapTabProps` type:
```ts
bulkPlannedRunning: boolean;
bulkPlannedProgress: { current: number; total: number; name: string } | null;
onBulkGenerateUnbuiltPlanned: () => void;
```

Remove from the destructure inside `MapTab`.

Delete the bulk button UI block:
```tsx
<Btn onClick={onBulkGenerateUnbuiltPlanned} ...>
  {bulkPlannedRunning ? "Bulk generate running…" : `AI draft: all unbuilt planned (${unbuiltPlannedCount})`}
</Btn>
{bulkPlannedRunning && bulkPlannedProgress && (...)}
```

- [ ] **Step 5: Remove bulk wiring from App.tsx**

Remove these from the `usePageGeneration` destructure:
```ts
bulkFirstDraftSkeletons,
bulkSkeletonRunning,
bulkSkeletonProgress,
bulkGenerateUnbuiltPlanned,
bulkPlannedRunning,
bulkPlannedProgress
```

Remove `plannedPages` from the `usePageGeneration` call params.

Remove `unbuiltPlannedCount` useMemo (it was passed to MapTab for the bulk button label — check if MapTab still needs it; if not, delete the memo and the prop).

Remove these props from the `<LibraryTab>` render:
```tsx
bulkSkeletonRunning={bulkSkeletonRunning}
bulkSkeletonProgress={bulkSkeletonProgress}
onBulkFirstDraftSkeletons={bulkFirstDraftSkeletons}
```

Remove these props from the `<MapTab>` render via `MapTab`:
```tsx
bulkPlannedRunning={bulkPlannedRunning}
bulkPlannedProgress={bulkPlannedProgress}
onBulkGenerateUnbuiltPlanned={() => void bulkGenerateUnbuiltPlanned()}
```

Update `generateFromPlanned` in App.tsx — it currently calls `void generate(...)` which is fine since we ignore the return value.

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: 42 tests passing.

- [ ] **Step 7: Commit**

```bash
git commit -m "refactor: remove old bulk generation; generate() now returns PageDraft | null"
```

---

## Task 7: Add queue fields — types, persistence, API

**Files:**
- Modify: `src/types.ts` — extend `TodoItem`
- Modify: `src/utils.ts` — add `todosApi.updateQueue`
- Modify: `lib/persistence.js` — add `updateTodoQueue()` to file store and Postgres; add migration columns
- Modify: `server.js` — extend `PATCH /api/todos/:id` to handle queue fields
- Modify: `src/server.file-db.test.ts` — add test for queue status PATCH

- [ ] **Step 1: Write the failing test in server.file-db.test.ts**

Add this test near the other todo tests:

```ts
it("updates todo queue status via PATCH", async () => {
  // create a todo
  const createRes = await request(app)
    .post("/api/todos")
    .send({ topic: "Queue test page", userType: "General public" });
  expect(createRes.status).toBe(200);
  const id = createRes.body.id;

  // patch with queue fields
  const patchRes = await request(app)
    .patch(`/api/todos/${id}`)
    .send({ status: "failed", errorMessage: "Model timeout" });
  expect(patchRes.status).toBe(200);
  expect(patchRes.body.status).toBe("failed");
  expect(patchRes.body.errorMessage).toBe("Model timeout");

  // list and verify
  const listRes = await request(app).get("/api/todos");
  expect(listRes.status).toBe(200);
  const todo = listRes.body.todos.find((t: { id: number }) => t.id === id);
  expect(todo.status).toBe("failed");
  expect(todo.errorMessage).toBe("Model timeout");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --reporter=verbose src/server.file-db.test.ts
```
Expected: FAIL — `patchRes.body.status` is undefined.

- [ ] **Step 3: Extend TodoItem in src/types.ts**

```ts
export type TodoStatus = "pending" | "generating" | "done" | "failed";

export interface TodoItem {
  id: number;
  topic: string;
  userType: string;
  done: boolean;
  status: TodoStatus;
  errorMessage: string | null;
  builtPageId: string | null;
  karlGrade: string | null;
}
```

- [ ] **Step 4: Update mapTodo in lib/persistence.js**

```js
const mapTodo = (row) => ({
  id: row.id,
  topic: row.topic,
  userType: row.user_type,
  done: row.done,
  status: row.status || "pending",
  errorMessage: row.error_message || null,
  builtPageId: row.built_page_id || null,
  karlGrade: row.karl_grade || null
});
```

- [ ] **Step 5: Add updateTodoQueue to file store in lib/persistence.js**

Inside `createFileStore`, after the existing `updateTodo` method, add:

```js
async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
  const row = state.todos.find((entry) => String(entry.id) === String(id));
  if (!row) return null;
  if (status !== undefined) row.status = status;
  if (errorMessage !== undefined) row.error_message = errorMessage;
  if (builtPageId !== undefined) row.built_page_id = builtPageId;
  if (karlGrade !== undefined) row.karl_grade = karlGrade;
  await persist();
  return mapTodo(row);
},
```

- [ ] **Step 6: Add updateTodoQueue to Postgres store in lib/persistence.js**

Inside `createPostgresStore`, after `updateTodo`, add:

```js
async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
  const result = await pool.query(
    `UPDATE todos
     SET status = COALESCE($1, status),
         error_message = COALESCE($2, error_message),
         built_page_id = COALESCE($3, built_page_id),
         karl_grade = COALESCE($4, karl_grade)
     WHERE id = $5 RETURNING *`,
    [status ?? null, errorMessage ?? null, builtPageId ?? null, karlGrade ?? null, id]
  );
  return result.rows[0] ? mapTodo(result.rows[0]) : null;
},
```

- [ ] **Step 7: Add Postgres migration columns in lib/persistence.js**

In `initPostgres`, after the existing `CREATE TABLE IF NOT EXISTS todos` block, add four `ALTER TABLE` statements:

```js
await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`);
await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS error_message TEXT`);
await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS built_page_id TEXT`);
await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS karl_grade TEXT`);
```

- [ ] **Step 8: Extend PATCH /api/todos/:id in server.js**

Replace the current handler:
```js
app.patch("/api/todos/:id", async (req, res) => {
  const { done } = req.body;
  try {
    const todo = await db.updateTodo(req.params.id, done);
    res.json(todo);
  } catch (err) {
    console.error("PATCH /api/todos error:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) });
  }
});
```

With:
```js
app.patch("/api/todos/:id", async (req, res) => {
  const { done, status, errorMessage, builtPageId, karlGrade } = req.body;
  try {
    let todo;
    if (done !== undefined) {
      todo = await db.updateTodo(req.params.id, done);
    } else {
      todo = await db.updateTodoQueue(req.params.id, { status, errorMessage, builtPageId, karlGrade });
    }
    if (!todo) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    console.error("PATCH /api/todos error:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) });
  }
});
```

- [ ] **Step 9: Add todosApi.updateQueue to src/utils.ts**

In `todosApi`, after `toggle`, add:

```ts
updateQueue: async (id: number, fields: {
  status: import("./types").TodoStatus;
  errorMessage?: string | null;
  builtPageId?: string | null;
  karlGrade?: string | null;
}): Promise<void> => {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields)
  });
  if (!res.ok) throw new Error(`Failed to update todo queue status: ${res.status}`);
},
```

- [ ] **Step 10: Run tests**

```bash
npm test
```
Expected: 43 tests passing (42 original + 1 new).

- [ ] **Step 11: Commit**

```bash
git commit -m "feat: add TodoItem queue status fields, persistence, and PATCH endpoint"
```

---

## Task 8: Build useQueueRunner hook

**Files:**
- Create: `src/hooks/useQueueRunner.ts`
- Create: `src/hooks/useQueueRunner.test.ts`

- [ ] **Step 1: Write the failing tests in useQueueRunner.test.ts**

```ts
import { describe, it, expect, vi } from "vitest";
import { runQueue } from "./useQueueRunner";
import type { TodoItem } from "../types";

const makeTodo = (id: number, status: TodoItem["status"] = "pending"): TodoItem => ({
  id,
  topic: `Page ${id}`,
  userType: "General public",
  done: false,
  status,
  errorMessage: null,
  builtPageId: null,
  karlGrade: null
});

describe("runQueue", () => {
  it("processes pending todos sequentially and returns stats", async () => {
    const todos = [makeTodo(1), makeTodo(2)];
    const mockPage = { id: "page_1", name: "Page 1", karlEvaluation: { grade: "A" } } as any;
    const generate = vi.fn().mockResolvedValue(mockPage);
    const updates: Array<{ id: number; fields: object }> = [];
    const onUpdate = (id: number, fields: object) => { updates.push({ id, fields }); };

    const result = await runQueue(todos, generate, onUpdate, () => false);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenNthCalledWith(1, "Page 1", "General public");
    expect(generate).toHaveBeenNthCalledWith(2, "Page 2", "General public");
    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0 });

    // first update for todo 1 should set status=generating
    expect(updates[0]).toEqual({ id: 1, fields: { status: "generating" } });
    // second update for todo 1 should set status=done with grade
    expect(updates[1]).toEqual({ id: 1, fields: { status: "done", builtPageId: "page_1", karlGrade: "A" } });
  });

  it("marks todo as failed when generate returns null", async () => {
    const todos = [makeTodo(1)];
    const generate = vi.fn().mockResolvedValue(null);
    const updates: Array<{ id: number; fields: object }> = [];
    const onUpdate = (id: number, fields: object) => { updates.push({ id, fields }); };

    const result = await runQueue(todos, generate, onUpdate, () => false);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    expect(updates[1]).toMatchObject({ id: 1, fields: { status: "failed" } });
  });

  it("stops after current item when shouldStop returns true", async () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3)];
    let callCount = 0;
    const generate = vi.fn().mockResolvedValue({ id: "p", name: "P", karlEvaluation: null } as any);
    const onUpdate = vi.fn();
    // stop after first item completes
    const shouldStop = () => { callCount++; return callCount > 2; };

    const result = await runQueue(todos, generate, onUpdate, shouldStop);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.attempted).toBe(1);
  });

  it("skips todos that are not pending", async () => {
    const todos = [makeTodo(1, "done"), makeTodo(2, "pending")];
    const generate = vi.fn().mockResolvedValue({ id: "p2", name: "P2", karlEvaluation: { grade: "B" } } as any);
    const onUpdate = vi.fn();

    await runQueue(todos, generate, onUpdate, () => false);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith("Page 2", "General public");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose src/hooks/useQueueRunner.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create src/hooks/useQueueRunner.ts**

```ts
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { PageDraft, TodoItem, TodoStatus } from "../types";
import { todosApi } from "../utils";

type QueueUpdate = {
  status: TodoStatus;
  errorMessage?: string | null;
  builtPageId?: string | null;
  karlGrade?: string | null;
};

/**
 * Pure function — testable without React.
 * Iterates pending todos sequentially, calling generate() for each.
 * Calls onUpdate(id, fields) to report status transitions.
 * Stops early when shouldStop() returns true (checked before each item).
 */
export async function runQueue(
  todos: TodoItem[],
  generate: (topic: string, userType: string) => Promise<PageDraft | null>,
  onUpdate: (id: number, fields: QueueUpdate) => void,
  shouldStop: () => boolean
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const pending = todos.filter((t) => t.status === "pending");
  let succeeded = 0;
  let failed = 0;

  for (const todo of pending) {
    if (shouldStop()) break;

    onUpdate(todo.id, { status: "generating" });

    try {
      const page = await generate(todo.topic, todo.userType);
      if (page) {
        onUpdate(todo.id, {
          status: "done",
          builtPageId: page.id,
          karlGrade: page.karlEvaluation?.grade ?? null
        });
        succeeded++;
      } else {
        onUpdate(todo.id, { status: "failed", errorMessage: "Generation returned no result" });
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      onUpdate(todo.id, { status: "failed", errorMessage: msg });
      failed++;
    }
  }

  return { attempted: succeeded + failed, succeeded, failed };
}

type UseQueueRunnerParams = {
  todos: TodoItem[];
  setTodos: Dispatch<SetStateAction<TodoItem[]>>;
  generate: (topic: string, userType: string) => Promise<PageDraft | null>;
};

export function useQueueRunner({ todos, setTodos, generate }: UseQueueRunnerParams) {
  const [running, setRunning] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const stopRef = useRef(false);

  const applyUpdate = useCallback((id: number, fields: QueueUpdate) => {
    setCurrentItemId(fields.status === "generating" ? id : null);
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: fields.status,
              errorMessage: fields.errorMessage ?? t.errorMessage,
              builtPageId: fields.builtPageId ?? t.builtPageId,
              karlGrade: fields.karlGrade ?? t.karlGrade,
              done: fields.status === "done" ? true : t.done
            }
          : t
      )
    );
    todosApi.updateQueue(id, fields).catch(() => {});
  }, [setTodos]);

  const start = useCallback(async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    await runQueue(todos, generate, applyUpdate, () => stopRef.current);
    setRunning(false);
    setCurrentItemId(null);
  }, [running, todos, generate, applyUpdate]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  return { running, currentItemId, start, stop };
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 47 tests passing (43 + 4 new).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add useQueueRunner hook with runQueue pure function"
```

---

## Task 9: Redesign TodoPanel with queue status UI

**Files:**
- Modify: `src/App.tsx` — `TodoPanel` function and its call site

- [ ] **Step 1: Update TodoPanel props type**

Add `useQueueRunner` return values to props:

```tsx
function TodoPanel({
  onGenerate,
  queueRunning,
  queueCurrentItemId,
  onStartQueue,
  onStopQueue
}: {
  onGenerate: (topic: string, userType: string) => void;
  queueRunning: boolean;
  queueCurrentItemId: number | null;
  onStartQueue: () => void;
  onStopQueue: () => void;
}) {
```

Remove `pages` from props (was only used for suggestions, now removed).

- [ ] **Step 2: Replace TodoPanel state and render**

Replace the entire `TodoPanel` body with:

```tsx
const [todos, setTodos] = useState<TodoItem[]>([]);
const [newTopic, setNewTopic] = useState("");
const [newUT, setNewUT] = useState(USER_TYPES[0]);
const [adding, setAdding] = useState(false);
const [loadingTodos, setLoadingTodos] = useState(true);

useEffect(() => {
  todosApi.list()
    .then(setTodos)
    .catch(() => setTodos([]))
    .finally(() => setLoadingTodos(false));
}, []);

const addTodo = async () => {
  if (!newTopic.trim()) return;
  try {
    const created = await todosApi.create(newTopic.trim(), newUT);
    setTodos(prev => [...prev, created]);
    setNewTopic("");
    setAdding(false);
  } catch {}
};

const toggle = async (id: number, currentDone: boolean) => {
  setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !currentDone } : t));
  try { await todosApi.toggle(id, !currentDone); } catch {}
};

const remove = async (id: number) => {
  if (queueRunning) return;
  setTodos(prev => prev.filter(t => t.id !== id));
  try { await todosApi.delete(id); } catch {}
};

const pendingCount = todos.filter(t => t.status === "pending").length;

const statusIcon = (todo: TodoItem) => {
  if (todo.id === queueCurrentItemId) {
    return <span className="app-todo-status app-todo-status--spinning" aria-label="Generating" />;
  }
  if (todo.status === "done") {
    return <span className="app-todo-status app-todo-status--done" aria-label="Done">✓</span>;
  }
  if (todo.status === "failed") {
    return <span className="app-todo-status app-todo-status--failed" aria-label="Failed">✗</span>;
  }
  return <span className="app-todo-status app-todo-status--pending" aria-label="Pending" />;
};

return (
  <Card className="app-card-pad--16-18">
    <div className="app-todo-header">
      <p className="app-up-label app-up-label--flush">Pages to build</p>
      <div className="app-todo-header__actions">
        {pendingCount > 0 && <span className="app-pending-badge">{pendingCount}</span>}
        {!queueRunning ? (
          <Btn
            onClick={onStartQueue}
            variant="primary"
            size="sm"
            disabled={pendingCount === 0}
          >
            Run queue
          </Btn>
        ) : (
          <Btn onClick={onStopQueue} variant="danger" size="sm">Stop</Btn>
        )}
      </div>
    </div>

    {loadingTodos && <p className="app-loading-p">Loading…</p>}

    {!loadingTodos && todos.length === 0 && (
      <div className="app-todo-empty">
        <p className="app-todo-empty__t">No pages queued</p>
        <p className="app-todo-empty__s">Add topics below to build a run queue</p>
      </div>
    )}

    {todos.map(t => (
      <div key={t.id} className={`app-todo-row app-todo-row--${t.status}`}>
        {statusIcon(t)}
        <div className="app-todo-body">
          <p className="app-todo-topic">{t.topic}</p>
          <p className="app-todo-ut">{t.userType}</p>
          {t.status === "done" && t.karlGrade && (
            <span className="app-todo-grade" data-grade={t.karlGrade}>
              Grade {t.karlGrade}
            </span>
          )}
          {t.status === "failed" && t.errorMessage && (
            <p className="app-todo-err">{t.errorMessage}</p>
          )}
        </div>
        <div className="app-todo-actions">
          {t.status === "pending" && (
            <Btn onClick={() => onGenerate(t.topic, t.userType)} variant="primary" size="sm" disabled={queueRunning}>
              Build now
            </Btn>
          )}
          {t.status === "failed" && (
            <Btn
              onClick={async () => {
                try {
                  await todosApi.updateQueue(t.id, { status: "pending", errorMessage: null });
                  setTodos(prev => prev.map(x => x.id === t.id ? { ...x, status: "pending", errorMessage: null } : x));
                } catch {}
              }}
              variant="ghost"
              size="sm"
              disabled={queueRunning}
            >
              Retry
            </Btn>
          )}
          <button
            type="button"
            className="app-ghost-x"
            onClick={() => remove(t.id)}
            disabled={queueRunning && t.id === queueCurrentItemId}
          >
            ✕
          </button>
        </div>
      </div>
    ))}

    {adding ? (
      <div className="app-todo-add-box">
        <input
          className="app-input app-input--sm app-input--mb6"
          placeholder="Page topic…"
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTodo()}
          autoFocus
        />
        <select
          className="app-input app-input--sm app-input--mb8"
          aria-label="Primary user"
          title="Primary user"
          value={newUT}
          onChange={e => setNewUT(e.target.value)}
        >
          {USER_TYPES.map(u => <option key={u}>{u}</option>)}
        </select>
        <div className="app-row-gap-6">
          <Btn onClick={addTodo} variant="primary" size="sm">Add</Btn>
          <Btn onClick={() => { setAdding(false); setNewTopic(""); }} variant="ghost" size="sm">Cancel</Btn>
        </div>
      </div>
    ) : (
      <button type="button" className="app-todo-dash" onClick={() => setAdding(true)}>
        + Add page
      </button>
    )}
  </Card>
);
```

Note: `todos` and `setTodos` are now local to `TodoPanel`. The `useQueueRunner` hook needs access to them. See Task 10 for how to wire this up properly.

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: 47 tests passing.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: redesign TodoPanel with per-item queue status UI"
```

---

## Task 10: Wire App.tsx — useQueueRunner + PlanSidebar add-to-queue

**Files:**
- Modify: `src/App.tsx` — lift todos state out of TodoPanel, wire `useQueueRunner`, update `PlanSidebar` to add-to-queue

- [ ] **Step 1: Lift todos state to App component**

Because `useQueueRunner` needs to read and update `todos`, lift the state up from `TodoPanel` to the `App` component:

```tsx
// In App():
const [todos, setTodos] = useState<TodoItem[]>([]);
const [todosLoading, setTodosLoading] = useState(true);

useEffect(() => {
  todosApi.list()
    .then(setTodos)
    .catch(() => setTodos([]))
    .finally(() => setTodosLoading(false));
}, []);
```

Pass `todos`, `setTodos`, `todosLoading` into `TodoPanel` as props instead of managing them internally.

Update `TodoPanel` props type to accept:
```ts
todos: TodoItem[];
setTodos: Dispatch<SetStateAction<TodoItem[]>>;
todosLoading: boolean;
```

Remove the `useState`/`useEffect` for todos from inside `TodoPanel`.

- [ ] **Step 2: Create a stable generate adapter for the queue runner**

In `App()`, after `usePageGeneration`, add:

```tsx
const queueGenerate = useCallback(
  (topic: string, userType: string): Promise<PageDraft | null> =>
    generate({ topic, userType, quiet: true }),
  [generate]
);
```

- [ ] **Step 3: Wire useQueueRunner in App.tsx**

Add import:
```ts
import { useQueueRunner } from "./hooks/useQueueRunner";
```

In `App()`, after `queueGenerate`:
```tsx
const {
  running: queueRunning,
  currentItemId: queueCurrentItemId,
  start: startQueue,
  stop: stopQueue
} = useQueueRunner({ todos, setTodos, generate: queueGenerate });
```

- [ ] **Step 4: Pass queue props to TodoPanel**

Update the `<TodoPanel>` render in the `MapTab` slot:

```tsx
<TodoPanel
  todos={todos}
  setTodos={setTodos}
  todosLoading={todosLoading}
  onGenerate={(t, u) => {
    setTopic(t);
    setUserType(u);
    setPendingPlannedId(null);
    setPendingPageType("");
    setWorkspaceTab("generate");
    void generate({ topic: t, userType: u });
  }}
  queueRunning={queueRunning}
  queueCurrentItemId={queueCurrentItemId}
  onStartQueue={startQueue}
  onStopQueue={stopQueue}
/>
```

- [ ] **Step 5: Update PlanSidebar to add-to-queue instead of direct generate**

In `PlanSidebar`, change the `onGenerate` prop to `onAddToQueue`:

```tsx
// PlanSidebar props type: replace
onGenerate: (p: PlannedPage) => void;
// with:
onAddToQueue: (p: PlannedPage) => void;
```

In the sidebar JSX, replace:
```tsx
<Btn onClick={() => onGenerate(selectedPlanned)} variant="primary" size="md" fullWidth>
  Generate content →
</Btn>
```
with:
```tsx
<Btn onClick={() => onAddToQueue(selectedPlanned)} variant="primary" size="md" fullWidth>
  Add to queue →
</Btn>
```

In App.tsx, pass the new prop to `PlanSidebarComponent`:
```tsx
// In the MapTab render:
onAddToQueue={async (p: PlannedPage) => {
  try {
    const created = await todosApi.create(p.name, p.userType);
    setTodos(prev => [...prev, created]);
    setWorkspaceTab("plan"); // stay on map tab
  } catch {}
}}
```

Also update `MapTab`'s props type to thread `onAddToQueue` through to `PlanSidebarComponent`.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```
Expected: 47 tests passing.

- [ ] **Step 7: Run build to confirm no type errors**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: wire useQueueRunner to App; PlanSidebar adds pages to queue"
```

---

## Self-Review

**Spec coverage:**
- ✅ Delete dead files (Task 1)
- ✅ Remove Drive frontend + backend (Tasks 2–3)
- ✅ Remove screenshots (Task 4)
- ✅ Remove suggested pages (Task 5)
- ✅ Remove old bulk generation (Task 6)
- ✅ TodoItem queue fields + DB migration + PATCH endpoint (Task 7)
- ✅ useQueueRunner with pure runQueue + tests (Task 8)
- ✅ TodoPanel redesign with status UI (Task 9)
- ✅ PlanSidebar "Add to queue" (Task 10)
- ✅ "Run queue" / "Stop" button in TodoPanel header (Task 9)
- ✅ Failed items show Retry button that resets to pending (Task 9)
- ✅ Queue processes only pending items, skips done/failed (Task 8, runQueue filter)

**Placeholder scan:** No TBDs or TODOs found in the plan.

**Type consistency check:**
- `TodoStatus` defined in Task 7, used in Task 8 and 9 ✅
- `runQueue` signature: `(todos: TodoItem[], generate: (topic, userType) => Promise<PageDraft | null>, onUpdate, shouldStop)` — consistent across Task 8 test and implementation ✅
- `useQueueRunner` returns `{ running, currentItemId, start, stop }` — consumed correctly in Tasks 9 and 10 ✅
- `todosApi.updateQueue` defined in Task 7 — called in `useQueueRunner` (Task 8) and in Retry button (Task 9) ✅
- `generate()` returns `Promise<PageDraft | null>` from Task 6 — used in `queueGenerate` adapter in Task 10 ✅
