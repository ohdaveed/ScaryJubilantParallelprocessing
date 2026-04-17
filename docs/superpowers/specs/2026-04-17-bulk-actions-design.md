# Bulk Page Download & Delete Feature — Design Spec

**Date:** 2026-04-17  
**Feature:** Bulk actions (download as PNG/PDF, delete) on selected pages  
**Status:** Design approved, ready for implementation

---

## Context

Currently, users can export individual pages as PNG screenshots or text. The new feature enables selecting multiple pages and performing bulk actions: download all selected pages as PNG or PDF (bundled in a ZIP), or delete all selected pages at once. This accelerates workflows for users managing large page catalogs (e.g., batch archiving, exporting for review).

---

## Requirements

### Functional

1. **Selection Mode**
   - "Select" button toggles selection mode on/off
   - When active: checkboxes appear on all page cards
   - When off: checkboxes hidden, selection cleared

2. **Bulk Download**
   - User selects ≥1 page, clicks "Download PNG" or "Download PDF"
   - Individual files generated for each page (using existing PNG rendering or new PDF generation)
   - Files bundled into a single ZIP: `pages-export-{timestamp}.zip`
   - Files named: `{page_title}_{version_or_month}.png` or `.pdf`
   - Version from new `version` field; if empty, use `created_at` month + year (e.g., "April 2026")

3. **Bulk Delete**
   - User selects ≥1 page, clicks "Delete"
   - Confirmation modal appears: "Delete N selected pages? This cannot be undone."
   - On confirm: delete all selected pages via `DELETE /api/pages/:id` for each
   - On complete: refresh page list, clear selection, show success toast

4. **Version Field**
   - Add optional `version` field to page schema
   - User can edit version on individual page before bulk operations
   - Fallback: if `version` is empty, format month from `created_at` as "Month Year"

### Non-Functional

- Downloads should handle partial failures gracefully (e.g., if 1 of 5 pages fails to render, complete ZIP with 4 valid files + warning toast)
- Bulk delete must confirm before destructive action
- Selection state persists until user clicks "Cancel" or navigates away
- Sticky action bar visible only when ≥1 page selected

---

## Architecture

### Data Model

**Pages Table** (new field):
- `version` (TEXT, nullable) — user-provided version string (e.g., "v1", "v2.1", "Q2 2026")
- If null: fallback to `formatMonthYear(created_at)` → "April 2026"

### Frontend Components

**Page List Component (App.tsx):**
- Add `selectedPageIds: Set<string>` state
- Add `isSelectionMode: boolean` state
- Toggle button: "Select" / "Cancel" (top of page list)
- Render checkboxes on each page card (visible only in selection mode)
- Sticky action bar (bottom): shows count + "Download PNG" | "Download PDF" | "Delete" buttons

**Action Bar:**
- Renders conditionally when `selectedPageIds.size > 0`
- Buttons trigger download or delete workflows

**Delete Confirmation Modal:**
- Text: "Delete N selected pages? This cannot be undone."
- Buttons: "Cancel" | "Delete"
- On confirm: trigger bulk delete

### Libraries (New Dependencies)

```json
{
  "jsPDF": "^2.x",
  "html2canvas": "^1.x",
  "jszip": "^3.x"
}
```

- `html2canvas`: Convert HTML to canvas (used by jsPDF)
- `jsPDF`: Generate PDF from canvas
- `jszip`: Create ZIP archive client-side
- Already have: `html-to-image` (PNG), axios (API calls)

### API

**No new endpoints required.** Existing endpoints:
- `GET /api/pages` — fetch all pages (for selection)
- `DELETE /api/pages/:id` — delete single page (called per selected page)
- Optional future: `PATCH /api/pages/:id` — update `version` field (can be added later if UI for editing version is needed)

### Client-Side Workflow

**Download PNG:**
1. For each selected page, render `SfGovPagePreview` to canvas via `html-to-image`
2. Create blob file: `{title}_{version}.png`
3. Add all blobs to ZIP
4. Trigger browser download of ZIP file

**Download PDF:**
1. For each selected page, render `SfGovPagePreview` to canvas via `html2canvas`
2. Create PDF via `jsPDF` from canvas
3. Append PDF to ZIP
4. Trigger browser download of ZIP file

**Delete:**
1. Show confirmation modal with count
2. On confirm: call `DELETE /api/pages/:id` for each selected page ID
3. On all complete: clear selection, refresh page list, show "N pages deleted" toast
4. On error: show toast with failed count, optionally keep selection for retry

### Error Handling

- **PDF/PNG generation failure:** Skip that page, add to error list, include in warning toast: "Successfully exported 4 of 5 pages (1 failed). Check console for details."
- **ZIP creation failure:** Show error toast, do not trigger download
- **Delete failure:** Show toast with failed page count, keep selection for retry
- **Network error:** Handled by axios interceptor (existing)

### File Naming

```
{page.name}_{version}.{extension}
```

Examples:
- `SF Housing Authority_v2.png`
- `SF Housing Authority_April 2026.pdf`
- `Parks and Recreation_v1.2.png`

---

## UI/UX Flow

### Selection Mode

```
[Select] [Other buttons...]
  ↓ (user clicks)
[Cancel] [Other buttons...]
+ Checkboxes appear on all page cards
+ "0 selected" → action bar hidden
  
User checks 3 pages
+ Action bar appears at bottom: "3 selected | [Download PNG] [Download PDF] [Delete]"

User clicks [Download PNG]
+ Browser downloads `pages-export-2026-04-17-1024.zip`
+ Toast: "Downloaded 3 pages"

User clicks [Delete]
+ Modal: "Delete 3 selected pages? This cannot be undone."
→ Cancel: modal closes
→ Delete: pages deleted, selection cleared, list refreshed, toast shown
```

### Version Field Display

- On page card: show version (if set) as small badge/label
- Fallback text: "April 2026" (formatted from `created_at`)
- User can optionally edit version in page detail/modal before downloading

---

## Testing

### Manual Test Cases

1. **Selection Mode Toggle**
   - Click "Select" → checkboxes appear, button becomes "Cancel"
   - Click "Cancel" → checkboxes hidden, selection cleared, button reverts to "Select"

2. **Multi-Select & Action Bar**
   - Check 1 page → action bar appears with count
   - Check 2 more → count updates
   - Uncheck 1 → count updates
   - Uncheck all → action bar disappears

3. **Download PNG**
   - Select 3 pages, click "Download PNG"
   - Verify ZIP contains 3 PNG files with correct naming
   - Verify filenames include version (if set) or month (if not)

4. **Download PDF**
   - Select 2 pages, click "Download PDF"
   - Verify ZIP contains 2 PDF files, valid format, correct naming

5. **Delete Confirmation**
   - Select pages, click "Delete"
   - Modal appears with correct page count
   - Click "Cancel" → modal closes, selection unchanged
   - Click "Delete" → pages removed, list refreshed, selection cleared

6. **Partial Failure (Download)**
   - Manually break 1 page's rendering (e.g., mock error)
   - Select 5 pages including broken one
   - Download PNG
   - Verify ZIP contains 4 valid files
   - Toast shows warning: "4 of 5 pages exported successfully"

7. **Partial Failure (Delete)**
   - Simulate API error on 1 delete call
   - Select 3 pages
   - Click Delete
   - Verify 2 pages deleted, 1 failed
   - Toast shows failure count, selection remains for retry

### Automated Tests

- Version formatting: `formatVersionOrMonth(page)` returns correct string
- ZIP creation: verify ZIP structure and file count
- Filename sanitization: ensure no invalid characters in filenames

---

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/types.ts` | Add `version?: string` to PageDraft interface |
| `src/App.tsx` | Add selection mode state, action bar, bulk workflows |
| `src/utils.ts` | Add `formatVersionOrMonth()`, `generateZip()`, `renderPageAsPDF()` |
| `src/components/ui.tsx` | Optional: CheckBox component (if not already present) |
| `package.json` | Add `jsPDF`, `html2canvas`, `jszip` dependencies |
| `lib/persistence.js` | Optional: support `version` field in DB schema migration |

---

## Dependencies to Install

```bash
npm install jsPDF html2canvas jszip
```

---

## Success Criteria

✅ User can select multiple pages via checkboxes  
✅ User can download selected pages as PNG ZIP  
✅ User can download selected pages as PDF ZIP  
✅ Downloaded files are correctly named with version/month  
✅ User can bulk delete with confirmation  
✅ Partial failures handled gracefully (incomplete downloads show warning, deletes show error count)  
✅ Selection state clears after action or manual cancel  
✅ No breaking changes to existing page export/delete functionality  

---

## Timeline & Complexity

- **Scope:** Medium (new UI, new PDF generation, bulk workflows)
- **Risky areas:** PDF generation (new library), ZIP creation, error recovery in batch operations
- **Estimated effort:** 1–2 days (implementation + manual testing)

