# Site Map & Screenshot Export — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Two related features that share a single new dependency (`html-to-image`):

1. **Ideal Site Map** — Replace the existing radial `SystemMap` "View" mode with a hierarchical indented outline organized by the 3-hub HHVC architecture. Includes a "Download Site Map" button that exports the map as a PNG.
2. **Export Screenshot** — Replace the "Export" button inside the SF.gov preview panel (currently downloads raw draft as `.txt`) with a PNG screenshot of the `SfGovPagePreview` component.

---

## Shared Dependency

**Library:** `html-to-image`

- Lightweight (~30KB)
- Modern CSS support (flexbox, custom properties, fonts)
- Returns a PNG data URL from a DOM element ref via `toPng()`
- Font edge case: call `await document.fonts.ready` before capturing to prevent missing web fonts

Install: `npm install html-to-image`

---

## Feature 1 — Ideal Site Map

### Where It Lives

Replaces the existing "View" mode in the System Map tab (`tab === "map"`, `mapMode === "view"`). The current radial SVG diagram (`SystemMap` component in `App.tsx:85`) is removed and replaced with the new `IdealSiteMap` component.

### Hub Assignment Logic

Each page is assigned to a hub using this priority order:

| Priority | Signal | Hub |
|---|---|---|
| 1st | `userType === "Resident / tenant"` | Tenant Hub |
| 1st | `userType === "Property owner / landlord"` | Owner Hub |
| 1st | `userType === "General public"` | Community Hub |
| 2nd | `relationships` parent field contains hub keyword | Matched hub |
| 3rd | `pageType === "Campaign Page"` | Community Hub |
| Fallback | None of the above | Unplaced |

### Layout Structure

```
[ Download Site Map ]                    ← top-right button

┌─ Tenant Hub (N) ───────────────────┐
│  ● Transaction   I need to report rats…    [pending]
│  ● Step by step  I need to fix mold…
│  ● Information   Help with pests and bugs
└────────────────────────────────────┘

┌─ Owner Hub (N) ────────────────────┐
│  ● Transaction   Pay your annual fee
└────────────────────────────────────┘

┌─ Community Hub (N) ────────────────┐
│  ● Campaign Page  Learn how to stop mosquitoes
└────────────────────────────────────┘

┌╌ Unplaced (N) ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  ← dashed border
│  ● Topic   Healthy Housing and Vector Control
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

### Page Row Contents

Each row shows:
- Colored type dot (matches existing `TYPE_META` badge colors)
- Full page name (not truncated)
- Review status pill if `page.imported === true` (`pending` / `approved` / `rejected`)
- Clicking opens the page in the Builder tab (calls existing `selectById`)

### Download

- Button label: "Download Site Map"
- Captures the full sitemap panel via `html-to-image` `toPng()`
- Filename: `hhvc-sitemap.png`
- Awaits `document.fonts.ready` before capture

---

## Feature 2 — Export Screenshot

### What Changes

The "Export" button inside the SF.gov preview panel header (currently at `App.tsx:1333`) changes from:

```
onClick → handleDownload(selected.draft, "...-draft.txt")
```

To:

```
onClick → capture SfGovPagePreview container via html-to-image toPng()
        → download as "<page-name>.png"
```

### Implementation

- Add `forwardRef` to `SfGovPagePreview` in `SfGovPreview.tsx` to expose the container `div` ref
- In `App.tsx`, hold a `screenshotRef` and pass it to `SfGovPagePreview`
- On Export click: `await document.fonts.ready`, then `toPng(screenshotRef.current)`, then trigger download
- Filename: `(clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + ".png"`
- Button label changes from "Export" to "Download preview"

### Error Handling

If `toPng()` throws, log the error and fall back to the existing text download so the user is never left with nothing.

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `html-to-image` dependency |
| `src/App.tsx` | Replace `SystemMap` with `IdealSiteMap`; update Export button handler; add `screenshotRef` |
| `src/components/SfGovPreview.tsx` | Wrap `SfGovPagePreview` with `forwardRef` |
| `src/App.tsx` (inline) | Remove old `SystemMap` function (lines 85–131) |

---

## Out of Scope

- Drag-to-reorder pages within hubs
- Editing hub assignments manually
- Exporting as SVG or PDF
- Changes to the "Plan" mode in the System Map tab
