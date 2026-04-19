# HHVC Import Pages — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

Add an "Import HHVC Pages" button to the Library tab that seeds Karl CMS-normalized HHVC page drafts from a bundled JSON file aligned to the finalized HHVC site map. Imported pages are marked with an "Imported" badge and a supervisor review status (pending / approved / rejected). The Map tab automatically includes imported pages in their correct hierarchy. Duplicate names are skipped silently.

---

## Data Shape

Each imported page is a `PageDraft` with two new fields:

```typescript
imported?: boolean;          // true for all imported pages
reviewStatus?: 'pending' | 'approved' | 'rejected';  // default: 'pending'
```

| Field | Value |
|-------|-------|
| `id` | UUID generated at insert time |
| `name` | Page title from the document |
| `draft` | Full Karl CMS normalized content |
| `raw` | Same as `draft` |
| `valid` | `true` |
| `imported` | `true` |
| `reviewStatus` | `'pending'` |
| `pageType` | Inferred from content |
| `userType` | HHVC-aligned user type for the page |
| `skeleton` | `false` |
| `karlEvaluation` | `undefined` (run manually) |
| `inputs.notes` | "Imported from HHVC normalized content" |
| `relationships` | Parent/sibling structure from document |

---

## Source Data

**File:** `src/data/hhvc-pages-import.json`  
Pre-shaped page objects aligned to the finalized HHVC site map (no `id` or `createdAt` — server generates these).

### Page inventory

The bundled JSON now contains the finalized HHVC site map entries, including the main topic, report flows, lifecycle guidance, prevention pages, programs and services, tools and lookup, fees and payments, and resources/help pages.

Duplicate names are skipped case-insensitively. Pages with different names but similar topics may still be imported if they represent distinct HHVC paths.

---

## Database Changes

No schema changes are required for the current implementation. Import metadata is stored on the `PageDraft` JSON payload.

---

## Backend

### New endpoints

**`POST /api/pages/import`**
- Reads `src/data/hhvc-pages-import.json`
- Queries existing page names
- Skips any page whose name matches an existing one case-insensitively
- Inserts all non-duplicates
- Returns `{ inserted: number, skipped: number, skippedPlaceholders: number }`

**`PATCH /api/pages/:id/review`**
- Body: `{ status: 'approved' | 'rejected' | 'pending' }`
- Updates `review_status` for the given page
- Returns the updated page

---

## Frontend

### Library tab

- "Import HHVC Pages" button in the top bar
  - Shows loading state during import
  - On success: import result pill showing imported and skipped counts
  - On error: error state in the import result pill
- Imported page cards show:
  - Grey **"Imported"** badge alongside the valid/invalid badge
  - Review status pill: yellow `pending review`, green `approved`, red `rejected`
  - Dropdown on the card to change review status (no need to open detail view)

### Map tab

- No new Map code required if the Map already queries all pages from the DB
- If Map currently only renders `planned_pages`, merge imported pages into the hierarchy
- Hierarchy positioning is driven by the `relationships` field on each imported page

### Type updates (`src/types.ts`)

```typescript
export interface PageDraft {
  // ... existing fields ...
  imported?: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
}
```

---

## Constraints

- No Karl evaluation run at import time — supervisors trigger it manually if needed
- Import is idempotent: running it twice skips all 25 on the second run
- Review status is independent of `valid` — a page can be valid but still pending review
