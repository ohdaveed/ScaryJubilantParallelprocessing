# HHVC Import Pages — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

Add an "Import HHVC Pages" button to the Library tab that seeds 25 Karl CMS-normalized HHVC page drafts from a bundled JSON file. Imported pages are marked with an "Imported" badge and a supervisor review status (pending / approved / rejected). The Map tab automatically includes imported pages in their correct hierarchy. Duplicate names are skipped silently.

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
| `userType` | "Resident / tenant" or "Building owner" |
| `skeleton` | `false` |
| `karlEvaluation` | `undefined` (run manually) |
| `inputs.notes` | "Imported from HHVC normalized content" |
| `relationships` | Parent/sibling structure from document |

---

## Source Data

**File:** `src/data/hhvc-pages-import.json`  
25 pre-shaped page objects (no `id` or `createdAt` — server generates these).

### Page inventory

| # | Title | Hub |
|---|-------|-----|
| 1 | I need to report rats in my building | Tenant |
| 2 | I need to fix mold in my rental | Tenant |
| 3 | I need to report mold in my home | Tenant |
| 4 | I need to report bedbugs in my home | Tenant |
| 5 | I need help with housing health and pest problems | Tenant |
| 6 | I need help with pests, mold, or trash | Tenant |
| 7 | I need help with mold and water | Tenant |
| 8 | I need help with trash and messes | Tenant |
| 9 | I need help with plants and weeds | Tenant |
| 10 | I need to pay my annual building fee | Owner |
| 11 | How much is my fee? | Owner |
| 12 | I need to fix a violation after an inspection | Owner |
| 13 | My rules as a building owner (v1) | Owner |
| 14 | I want to learn how to stop mosquitoes | Community |
| 15 | I found a dead bird (stub) | Community |
| 16 | I want to contact HHVC | Shared |
| 17 | I need to contact HHVC about housing, pests, or mosquitoes | Shared |
| 18 | I need to report mold in my home (v2) | Tenant |
| 19 | I need to fix a violation after an inspection (v2) | Owner |
| 20 | I need to report bed bugs | Tenant |
| 21 | I found a dead bird | Community |
| 22 | I need to report rats in my home | Tenant |
| 23 | My rules as a building owner (v2) | Owner |
| 24 | I need to report flies in my home | Tenant |
| 25 | I need to report cockroaches in my home | Tenant |

Near-duplicate pages (e.g. pages 3 & 18 both titled "I need to report mold in my home") are both inserted since their names differ slightly. Truly identical names (case-insensitive) are skipped.

---

## Database Changes

Two new columns on the `pages` table:

```sql
ALTER TABLE pages ADD COLUMN IF NOT EXISTS imported BOOLEAN DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending';
```

---

## Backend

### New endpoints

**`POST /api/pages/import`**
- Reads `src/data/hhvc-pages-import.json`
- Queries existing page names (`SELECT name FROM pages`)
- Skips any page whose name matches an existing one (case-insensitive)
- Inserts all non-duplicates in a single transaction
- Returns `{ inserted: number, skipped: number }`

**`PATCH /api/pages/:id/review`**
- Body: `{ status: 'approved' | 'rejected' | 'pending' }`
- Updates `review_status` for the given page
- Returns the updated page

---

## Frontend

### Library tab

- "Import HHVC Pages" button in the top bar
  - Shows loading state during import
  - On success: toast — "X pages imported (Y skipped as duplicates)"
  - On error: error toast
- Imported page cards show:
  - Grey **"Imported"** badge alongside the valid/invalid badge
  - Review status pill: yellow `pending review`, green `approved`, red `rejected`
  - Dropdown on the card to change review status (no need to open detail view)

### Map tab

- No new Map code required if the Map already queries all pages from the DB
- If Map currently only renders `planned_pages` (the 13 skeletons), add a query for `imported = true` pages and merge into the hierarchy
- Hierarchy positioning driven by the `relationships` field on each imported page (parent/sibling values populated in the JSON bundle)

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
