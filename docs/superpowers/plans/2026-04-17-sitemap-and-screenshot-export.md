# Site Map & Screenshot Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the radial SystemMap with a 3-hub hierarchical site map (downloadable as PNG) and replace the SF.gov preview "Export" button with a PNG screenshot download.

**Architecture:** A pure `assignHub()` function drives hub grouping; `IdealSiteMap` renders the outline tree with a download button; `SfGovPagePreview` gains a `forwardRef` so the parent can capture it with `html-to-image`. Both download actions share the same `toPng` utility.

**Tech Stack:** React 18, TypeScript, Vitest, `html-to-image`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/IdealSiteMap.tsx` | Hub assignment logic + outline tree UI + download button |
| Create | `src/components/IdealSiteMap.test.tsx` | Unit tests for `assignHub()` |
| Modify | `src/components/SfGovPreview.tsx` | Wrap `SfGovPagePreview` with `forwardRef` |
| Modify | `src/App.tsx` | Remove old `SystemMap`; import `IdealSiteMap`; add `screenshotRef`; update Export handler |
| Modify | `package.json` | Add `html-to-image` |

---

## Task 1: Install `html-to-image`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install html-to-image
```

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep html-to-image package.json
```

Expected output:
```
"html-to-image": "^1.x.x",
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add html-to-image dependency"
```

---

## Task 2: `assignHub` pure function + tests

**Files:**
- Create: `src/components/IdealSiteMap.tsx` (stub + exported function only)
- Create: `src/components/IdealSiteMap.test.tsx`

- [ ] **Step 1: Create `IdealSiteMap.tsx` with the stub and `assignHub` only**

Create `src/components/IdealSiteMap.tsx`:

```tsx
import { PageDraft } from "../types";

export type Hub = "tenant" | "owner" | "community" | "unplaced";

export function assignHub(page: PageDraft): Hub {
  const userType = (page.userType || "").toLowerCase();
  if (userType.includes("resident") || userType.includes("tenant")) return "tenant";
  if (userType.includes("owner") || userType.includes("landlord")) return "owner";
  if (userType.includes("general public")) return "community";

  const pageType = (page.pageType || "").toLowerCase();
  if (pageType.includes("campaign")) return "community";

  const rel = (page.relationships || "").toLowerCase();
  if (rel.includes("tenant") || rel.includes("renter") || rel.includes("pests, mold")) return "tenant";
  if (rel.includes("owner") || rel.includes("landlord") || rel.includes("building fee")) return "owner";
  if (rel.includes("community") || rel.includes("mosquito") || rel.includes("school")) return "community";

  return "unplaced";
}

// Component implemented in Task 3
export default function IdealSiteMap(_props: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  return null;
}
```

- [ ] **Step 2: Write failing tests**

Create `src/components/IdealSiteMap.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { assignHub } from "./IdealSiteMap";
import type { PageDraft } from "../types";

const base: PageDraft = {
  id: "1", name: "Test", userType: "", userGoal: "", purpose: "",
  pageType: "Transaction", components: "", relationships: "", duplication: "",
  enforcement: "", draft: "", integration: "", valid: true, raw: "",
  createdAt: new Date().toISOString(), karlConnected: false,
  inputs: { topic: "", userType: "", notes: "" },
};

describe("assignHub", () => {
  it("assigns tenant for 'Resident / tenant' userType", () => {
    expect(assignHub({ ...base, userType: "Resident / tenant" })).toBe("tenant");
  });

  it("assigns owner for 'Property owner / landlord' userType", () => {
    expect(assignHub({ ...base, userType: "Property owner / landlord" })).toBe("owner");
  });

  it("assigns community for 'General public' userType", () => {
    expect(assignHub({ ...base, userType: "General public" })).toBe("community");
  });

  it("assigns community for Campaign Page type regardless of userType", () => {
    expect(assignHub({ ...base, userType: "", pageType: "Campaign Page" })).toBe("community");
  });

  it("falls back to relationships for tenant", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: pests, mold hub" })).toBe("tenant");
  });

  it("falls back to relationships for owner", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: building fee page" })).toBe("owner");
  });

  it("falls back to relationships for community", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: mosquito education" })).toBe("community");
  });

  it("returns unplaced when no signal matches", () => {
    expect(assignHub({ ...base, userType: "", pageType: "Information", relationships: "" })).toBe("unplaced");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail (or pass — the logic is already implemented)**

```bash
npm test -- IdealSiteMap
```

Expected: All 8 tests pass. If any fail, fix `assignHub` logic before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/components/IdealSiteMap.tsx src/components/IdealSiteMap.test.tsx
git commit -m "feat: add assignHub pure function with tests"
```

---

## Task 3: `IdealSiteMap` component

**Files:**
- Modify: `src/components/IdealSiteMap.tsx` (replace stub default export with full component)

- [ ] **Step 1: Replace the default export with the full component**

Replace the entire contents of `src/components/IdealSiteMap.tsx` with:

```tsx
import React, { useRef } from "react";
import { toPng } from "html-to-image";
import { PageDraft } from "../types";
import { clean } from "../utils";
import { TYPE_META } from "../constants";

export type Hub = "tenant" | "owner" | "community" | "unplaced";

export function assignHub(page: PageDraft): Hub {
  const userType = (page.userType || "").toLowerCase();
  if (userType.includes("resident") || userType.includes("tenant")) return "tenant";
  if (userType.includes("owner") || userType.includes("landlord")) return "owner";
  if (userType.includes("general public")) return "community";

  const pageType = (page.pageType || "").toLowerCase();
  if (pageType.includes("campaign")) return "community";

  const rel = (page.relationships || "").toLowerCase();
  if (rel.includes("tenant") || rel.includes("renter") || rel.includes("pests, mold")) return "tenant";
  if (rel.includes("owner") || rel.includes("landlord") || rel.includes("building fee")) return "owner";
  if (rel.includes("community") || rel.includes("mosquito") || rel.includes("school")) return "community";

  return "unplaced";
}

const HUB_META: Record<Hub, { label: string; color: string; dashed: boolean }> = {
  tenant:    { label: "Tenant Hub",    color: "#185FA5", dashed: false },
  owner:     { label: "Owner Hub",     color: "#0F6E56", dashed: false },
  community: { label: "Community Hub", color: "#854F0B", dashed: false },
  unplaced:  { label: "Unplaced",      color: "#888780", dashed: true  },
};

const REVIEW_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#FAEEDA", color: "#854F0B" },
  approved: { bg: "#E1F5EE", color: "#0F6E56" },
  rejected: { bg: "#FCEBEB", color: "#A32D2D" },
};

export default function IdealSiteMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);

  const grouped: Record<Hub, PageDraft[]> = { tenant: [], owner: [], community: [], unplaced: [] };
  pages.forEach(p => grouped[assignHub(p)].push(p));

  const handleDownload = async () => {
    if (!mapRef.current) return;
    await document.fonts.ready;
    try {
      const dataUrl = await toPng(mapRef.current, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "hhvc-sitemap.png";
      a.click();
    } catch (err) {
      console.error("Site map download failed:", err);
    }
  };

  if (!pages.length) {
    return (
      <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No pages yet</p>
        <p style={{ fontSize: 13, margin: 0 }}>Generate pages in the Builder tab to populate the site map.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={handleDownload}
          style={{
            fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)", background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}
        >
          Download Site Map
        </button>
      </div>

      <div ref={mapRef} style={{ background: "#ffffff", padding: 24, borderRadius: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C8B87", marginBottom: 20, marginTop: 0 }}>
          HHVC Site Map · {pages.length} page{pages.length !== 1 ? "s" : ""}
        </p>

        {(["tenant", "owner", "community", "unplaced"] as Hub[]).map(hub => {
          const hubPages = grouped[hub];
          if (!hubPages.length) return null;
          const meta = HUB_META[hub];
          return (
            <div key={hub} style={{
              marginBottom: 16,
              border: `1px ${meta.dashed ? "dashed" : "solid"} ${meta.color}40`,
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 16px",
                background: `${meta.color}10`,
                borderBottom: `1px ${meta.dashed ? "dashed" : "solid"} ${meta.color}30`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: meta.color, opacity: 0.7 }}>{hubPages.length}</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {hubPages.map(p => {
                  const typeMeta = TYPE_META[clean(p.pageType)] || { dot: "#888" };
                  const review = p.imported && p.reviewStatus ? REVIEW_COLORS[p.reviewStatus] : null;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelect(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 16px", cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F7F6F2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: typeMeta.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#3D3C38", flex: 1, lineHeight: 1.4 }}>{clean(p.name) || "Untitled"}</span>
                      <span style={{ fontSize: 10, color: "#8C8B87", flexShrink: 0 }}>{clean(p.pageType)}</span>
                      {review && (
                        <span style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 4,
                          background: review.bg, color: review.color, flexShrink: 0,
                        }}>
                          {p.reviewStatus}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
npm test -- IdealSiteMap
```

Expected: All 8 tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/IdealSiteMap.tsx
git commit -m "feat: implement IdealSiteMap component with hub grouping and PNG download"
```

---

## Task 4: Wire `IdealSiteMap` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import at top of `App.tsx`**

Find the existing imports block near the top of `src/App.tsx`. Add:

```tsx
import IdealSiteMap from "./components/IdealSiteMap";
```

- [ ] **Step 2: Remove the old `SystemMap` function**

Delete lines 85–131 in `src/App.tsx` — the entire `function SystemMap(...)` block:

```tsx
// DELETE this entire function (lines 85–131):
function SystemMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  // ... all contents ...
}
```

- [ ] **Step 3: Replace the `SystemMap` usage in the "view" mode**

Find (around line 1445 after deletion offset):

```tsx
<SystemMap pages={pages} onSelect={selectById} />
```

Replace with:

```tsx
<IdealSiteMap pages={pages} onSelect={selectById} />
```

- [ ] **Step 4: Start the dev server and verify the map tab renders**

```bash
npm run dev
```

Open `http://localhost:5000`, navigate to System Map → View. Confirm:
- Hub sections appear with correct page assignments
- "Download Site Map" button is visible
- Clicking a page row switches to the Builder tab with that page selected

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace radial SystemMap with IdealSiteMap in System Map tab"
```

---

## Task 5: Add `forwardRef` to `SfGovPagePreview`

**Files:**
- Modify: `src/components/SfGovPreview.tsx`

- [ ] **Step 1: Find the `SfGovPagePreview` component declaration**

In `src/components/SfGovPreview.tsx`, find line 235:

```tsx
export const SfGovPagePreview: React.FC<{ draft: string; pageType?: string; pageTitle?: string }> = ({ draft, pageType, pageTitle }) => {
```

- [ ] **Step 2: Replace with a `forwardRef` version**

Replace that declaration (and its opening `return (`) with:

```tsx
export const SfGovPagePreview = React.forwardRef<HTMLDivElement, { draft: string; pageType?: string; pageTitle?: string }>(
  ({ draft, pageType, pageTitle }, ref) => {
  if (!draft) return <p style={{ color: SF.slate2, fontSize: 14, fontFamily: SF.font }}>No draft content.</p>;
```

Then find the outermost returned `<div>` in `SfGovPagePreview` (currently):

```tsx
  return (
    <div style={{ background: SF.white, fontFamily: SF.font }}>
```

Add the `ref` prop:

```tsx
  return (
    <div ref={ref} style={{ background: SF.white, fontFamily: SF.font }}>
```

Then close the `forwardRef` call at the end of the component. Find the final closing `};` of the component and replace with:

```tsx
  );
}
);
SfGovPagePreview.displayName = "SfGovPagePreview";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SfGovPreview.tsx
git commit -m "feat: add forwardRef to SfGovPagePreview for screenshot capture"
```

---

## Task 6: Export screenshot handler in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `toPng` import**

At the top of `src/App.tsx`, add:

```tsx
import { toPng } from "html-to-image";
```

- [ ] **Step 2: Add `screenshotRef` near the other refs/state in `App.tsx`**

Find the state declarations block (around line 480). Add directly after the last `useRef` or `useState`:

```tsx
const screenshotRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Pass `ref` to `SfGovPagePreview`**

Find the `SfGovPagePreview` usage (around line 1335):

```tsx
<SfGovPagePreview draft={selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
```

Replace with:

```tsx
<SfGovPagePreview ref={screenshotRef} draft={selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
```

- [ ] **Step 4: Add `handleExportScreenshot` function**

Near `handleDownload` (around line 944), add:

```tsx
const handleExportScreenshot = async (pageName: string) => {
  if (!screenshotRef.current) return;
  await document.fonts.ready;
  const filename = (clean(pageName) || "page").toLowerCase().replace(/\s+/g, "-") + ".png";
  try {
    const dataUrl = await toPng(screenshotRef.current, { backgroundColor: "#ffffff" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } catch (err) {
    console.error("Screenshot export failed:", err);
    // Fallback: export raw text
    handleDownload(selected?.draft ?? "", filename.replace(".png", "-draft.txt"));
  }
};
```

- [ ] **Step 5: Update the Export button**

Find (around line 1333):

```tsx
<Btn onClick={() => handleDownload(selected.draft, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + "-draft.txt")} variant="ghost" size="sm">Export</Btn>
```

Replace with:

```tsx
<Btn onClick={() => handleExportScreenshot(selected.name)} variant="ghost" size="sm">Download preview</Btn>
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Open a page in the Builder tab. In the SF.gov preview panel, click "Download preview". Confirm:
- A PNG file downloads named after the page
- The PNG contains the full SF.gov mockup including the header and page content
- No console errors

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace Export text button with PNG screenshot download of SF.gov preview"
```

---

## Self-Review

**Spec coverage:**
- ✅ Install `html-to-image` → Task 1
- ✅ `assignHub()` pure function → Task 2
- ✅ Hub assignment priority order (userType → pageType → relationships → unplaced) → Task 2
- ✅ Indented outline tree layout with type dot, full name, review pill → Task 3
- ✅ Download Site Map button → Task 3
- ✅ `document.fonts.ready` before capture → Tasks 3 & 6
- ✅ Replace old `SystemMap` → Task 4
- ✅ Clicking page row opens Builder → Task 3 (`onSelect`)
- ✅ `forwardRef` on `SfGovPagePreview` → Task 5
- ✅ Export button → "Download preview" PNG → Task 6
- ✅ Error fallback for screenshot → Task 6
- ✅ Filename uses page name → Task 6

**Type consistency:** `assignHub` returns `Hub` type defined in Task 2 and re-exported in Task 3. `screenshotRef` typed as `useRef<HTMLDivElement>` matching the `forwardRef<HTMLDivElement, ...>` in Task 5.

**Placeholder scan:** No TBDs, TODOs, or vague steps found.
