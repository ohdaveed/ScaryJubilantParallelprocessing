# Page Versioning Design

**Date:** 2026-04-17  
**Status:** Approved  

## Context

Pages are currently overwritten on every generation or refinement — there is no history, no revert, and no way for the AI to learn from what was tried before. This design adds version tracking so users can restore previous page states and so Claude can use past versions as context when regenerating with notes.

---

## Goals

1. Track up to 10 versions per page, saved automatically on every generation or refinement
2. Let users view version history and restore any past version
3. Inject the 3 most recent versions into the refine prompt when notes are provided — so Claude understands what was tried before and builds on it rather than repeating discarded approaches

---

## Data Model

### New `page_versions` table (Postgres)

```sql
CREATE TABLE page_versions (
  id SERIAL PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  notes TEXT,
  trigger TEXT NOT NULL,  -- 'generate' | 'refine'
  created_at TIMESTAMP DEFAULT NOW()
)
```

### File-based fallback

Add `page_versions: []` collection to `.local/hhvc-local-db.json` alongside the existing `pages` array.

### Retention

Max 10 versions per page. When a new version is saved and the count exceeds 10, the oldest version (lowest `version_number`) is deleted. Version numbers increment monotonically and are never reused.

---

## Persistence Layer (`lib/persistence.js`)

Three new methods added to both the Postgres store and the file store:

| Method | Description |
| ------ | ----------- |
| `saveVersion(pageId, data, notes, trigger)` | Inserts snapshot, enforces 10-version cap |
| `getVersions(pageId)` | Returns all versions newest-first, **metadata only** (no `data` blob) |
| `getVersion(versionId)` | Returns full snapshot — called only on restore or refine |

---

## Version Capture (`server.js`)

Versions are saved server-side after every successful page write. No frontend changes needed for capture.

- **After generation:** `saveVersion(pageId, data, notes, 'generate')` — `notes` comes from request body `inputs.notes`
- **After refinement:** `saveVersion(pageId, data, refineInput, 'refine')` — `refineInput` is the plain-English instruction

---

## Version History Panel (Frontend)

A slide-in side panel triggered by a "History" button on each page card.

**Panel contents (metadata list, loaded on open):**

- Version number + timestamp (e.g. "v4 · Apr 17, 2:34pm")
- Trigger badge: `generated` or `refined`
- Notes that triggered this version (truncated, expandable)
- "Restore this version" button per entry

**Restore flow:**

1. User clicks "Restore this version"
2. Confirmation dialog: "This will replace the current page content. Continue?"
3. `GET /api/pages/:id/versions/:versionId` fetches full snapshot
4. Frontend calls `POST /api/pages` with snapshot data (existing upsert path)
5. A new version is auto-saved — restores are versioned, so they can be undone

**Full snapshot is only fetched on restore — panel list is metadata only.**

### New API Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/pages/:id/versions` | List versions (metadata only) |
| `GET` | `/api/pages/:id/versions/:versionId` | Full snapshot |
| `POST` | `/api/pages/:id/restore/:versionId` | Restore version + auto-save new version |

---

## AI Context Injection (`src/constants.ts`)

**Trigger condition:** `refineInput` is non-empty. If notes are empty, no versions are fetched — zero cost for note-free regenerations.

**What gets injected:** 3 most recent versions (not all 10), to avoid context bloat.

**Data flow:**

1. User types notes + clicks Refine
2. Frontend calls `GET /api/pages/:id/versions?limit=3&includeData=true` — returns metadata + full `data` blobs in one request
3. Versions passed to server with the refine request body
4. Server injects into `buildRefineUserPrompt()` before sending to Claude

**Prompt extension added to `buildRefineUserPrompt()`:**

```text
PREVIOUS VERSIONS (most recent first):
---
v4 notes: "Make the title more action-oriented"
[raw content of v4]
---
v3 notes: "Add a section about appointment scheduling"
[raw content of v3]
---
v2 notes: "Initial generation"
[raw content of v2]
---

Use this history to understand what the user is optimizing toward.
Do not repeat approaches that were discarded. Build on what was kept.
```

---

## Files to Modify

| File | Change |
| ---- | ------ |
| `lib/persistence.js` | Add `saveVersion`, `getVersions`, `getVersion` to both Postgres and file store |
| `server.js` | Call `saveVersion` after page saves; add 3 new version API endpoints |
| `src/constants.ts` | Extend `buildRefineUserPrompt()` to accept and inject version history |
| `src/utils.ts` | Add `versionsApi` client methods (`list`, `get`) |
| `src/App.tsx` | Fetch versions before refine call; add History button + panel component |
| `src/types.ts` | Add `PageVersion` interface |

---

## Verification

1. **Generate a page** — check DB that a row appears in `page_versions` with `trigger = 'generate'`
2. **Refine the page** — check a second row appears with `trigger = 'refine'` and the refine instruction as `notes`
3. **Open History panel** — verify versions list loads, timestamps and notes display correctly
4. **Restore a version** — confirm page content reverts and a new version row is created for the restore
5. **Generate 11 versions** — confirm only 10 rows remain (oldest deleted)
6. **Refine with notes** — inspect the Claude request payload to confirm version history is injected
7. **Refine without notes** — confirm no version fetch occurs (check network tab)
8. **File-mode fallback** — disconnect DB, repeat steps 1–4 using `.local/hhvc-local-db.json`
