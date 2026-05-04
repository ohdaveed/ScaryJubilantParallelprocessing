# Generate Workspace Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `Generate` workspace shell into an editorial civic workbench using SF Design System colors, while preserving existing application behavior.

**Architecture:** Keep the existing `SfGovContentDesignTool` component as the shell boundary and concentrate the redesign in its scoped CSS. Make only small JSX changes where new semantic wrappers or note surfaces are needed to support the editorial workbench treatment, then verify with existing component tests plus targeted screenshot checks.

**Tech Stack:** React 18, TypeScript, scoped CSS in `SfGovContentDesignTool.css`, Vitest, Playwright CLI screenshots

---

## File Structure

- `src/components/SfGovContentDesignTool.tsx`
  Purpose: shell markup, semantic wrappers, preview chrome, authoring rail structure.

- `src/components/SfGovContentDesignTool.css`
  Purpose: scoped design tokens, top bar styling, authoring rail treatment, preview workbench layout, responsive rules.

- `src/components/SfGovContentDesignTool.test.tsx`
  Purpose: render-level regression checks for the shell structure and any new semantic wrappers/classes used by the redesign.

## Task 1: Add Shell Semantics For The Editorial Workbench

**Files:**
- Modify: `src/components/SfGovContentDesignTool.tsx`
- Modify: `src/components/SfGovContentDesignTool.test.tsx`
- Test: `src/components/SfGovContentDesignTool.test.tsx`

- [ ] **Step 1: Write the failing shell-structure test**

Add a new test in `src/components/SfGovContentDesignTool.test.tsx` that locks the new semantic hooks needed by the redesign.

```tsx
it("renders editorial shell landmarks for the generate workspace", () => {
  const html = renderToStaticMarkup(
    <SfGovContentDesignTool
      tabs={tabs}
      activeTabId="generate"
      userType="Resident"
      activePageType="Transaction"
      pageGoal="Report pests in your home"
      additionalContext="Tenant-facing guidance"
      previewSlot={<div className="test-preview">Preview body</div>}
      karlEvaluation={{
        grade: "B",
        score: 86,
        checks: [{ id: "clarity", label: "Clear task framing", status: "pass" }]
      }}
    />
  );

  expect(html).toContain("editorial-shell");
  expect(html).toContain("authoring-rail");
  expect(html).toContain("preview-workbench");
  expect(html).toContain("preview-notes");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: FAIL because the new shell hook classes are not present yet.

- [ ] **Step 3: Add minimal semantic wrappers to the component**

Update `src/components/SfGovContentDesignTool.tsx` so the existing shell has stable editorial hook classes without changing behavior.

```tsx
return (
  <div ref={shellRef} id={`${baseId}-shell`} className={rootClass} style={shellStyle}>
    <div className="app editorial-shell">
      <header className="topbar editorial-topbar">
        ...
      </header>

      <div className="main editorial-main" ...>
        {showLeftPanel ? (
          <aside className="left-panel authoring-rail" aria-label="Editor controls">
            ...
          </aside>
        ) : null}

        {showLeftPanel ? <div className={`drag-handle${splitterDragging ? " is-dragging" : ""}`} ... /> : null}

        <section className="right-panel preview-workbench" aria-label="Preview">
          <div className="preview-topbar workbench-chrome">
            ...
          </div>
          <div className="preview-scroll anim-fade-up">
            <div className="preview-sheet-frame">
              {previewSlot}
            </div>
            <aside className="preview-notes" aria-label="Editorial notes" />
          </div>
        </section>
      </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SfGovContentDesignTool.tsx src/components/SfGovContentDesignTool.test.tsx
git commit -m "refactor: add editorial shell hooks to generate workspace"
```

## Task 2: Rebuild The Top Bar And Authoring Rail With SF Palette Discipline

**Files:**
- Modify: `src/components/SfGovContentDesignTool.css`
- Test: `src/components/SfGovContentDesignTool.test.tsx`

- [ ] **Step 1: Write the failing palette/token expectation**

Extend `src/components/SfGovContentDesignTool.test.tsx` with a narrow regression check that ensures the shell still renders the active `Generate` tab and the primary action after the redesign.

```tsx
it("keeps the generate workspace controls visible after shell restyling", () => {
  const html = renderToStaticMarkup(
    <SfGovContentDesignTool
      tabs={tabs}
      activeTabId="generate"
      userType="Resident"
      activePageType="Transaction"
      pageGoal="Report pests in your home"
      additionalContext=""
      previewSlot={<div>Preview body</div>}
    />
  );

  expect(html).toContain(">Generate<");
  expect(html).toContain("Generate page draft");
});
```

- [ ] **Step 2: Run the test to verify it still passes before CSS edits**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS. This confirms the next task is styling-only and behavior remains stable.

- [ ] **Step 3: Replace shell tokens and top bar/rail styling**

Revise `src/components/SfGovContentDesignTool.css` to use SF color guidance and newsroom structure for the top bar and left rail.

Add or replace the scoped tokens near the top of the file:

```css
.sf-cdt {
  --slate-l4: #002b48;
  --slate-l2: #5a7a92;
  --action-blue: #495ed4;
  --paper: #f6f1e7;
  --paper-strong: #fffdf8;
  --ink-soft: #4f473f;
  --line-soft: rgba(0, 43, 72, 0.12);
  --rail-bg: linear-gradient(180deg, #11304b 0%, #002b48 100%);
  --rail-panel: rgba(255, 255, 255, 0.045);
}
```

Reshape the top bar and rail:

```css
.editorial-topbar {
  background: linear-gradient(180deg, #0e2d47 0%, #002b48 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0 22px;
}

.brand-text {
  color: #fff;
  letter-spacing: -0.03em;
}

.brand-sub {
  color: rgba(255, 255, 255, 0.56);
}

.tab.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.authoring-rail {
  background: var(--rail-bg);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 18px 18px 20px;
}

.field-input,
.field-select,
.field-textarea {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.generate-btn {
  background: var(--action-blue);
  box-shadow: 0 14px 24px rgba(73, 94, 212, 0.28);
}
```

- [ ] **Step 4: Run component tests after the CSS pass**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS

- [ ] **Step 5: Capture a desktop screenshot for top-bar and rail verification**

Run:

```bash
npx playwright screenshot --browser=chromium --viewport-size="1280,900" --full-page http://localhost:5000 review-generate-shell-desktop.png
```

Expected: screenshot saved successfully; top bar and left rail now read as a newsroom production desk with SF palette colors.

- [ ] **Step 6: Commit**

```bash
git add src/components/SfGovContentDesignTool.css src/components/SfGovContentDesignTool.test.tsx review-generate-shell-desktop.png
git commit -m "feat: redesign generate shell top bar and authoring rail"
```

## Task 3: Transform The Preview Pane Into An Editorial Workbench

**Files:**
- Modify: `src/components/SfGovContentDesignTool.tsx`
- Modify: `src/components/SfGovContentDesignTool.css`
- Modify: `src/components/SfGovContentDesignTool.test.tsx`
- Test: `src/components/SfGovContentDesignTool.test.tsx`

- [ ] **Step 1: Write the failing preview-workbench test**

Add a test that requires the new proofing surfaces to render.

```tsx
it("renders proofing chrome for the preview workbench", () => {
  const html = renderToStaticMarkup(
    <SfGovContentDesignTool
      tabs={tabs}
      activeTabId="generate"
      userType="Resident"
      activePageType="Transaction"
      pageGoal="Report pests in your home"
      additionalContext=""
      previewSlot={<div className="test-preview">Preview body</div>}
    />
  );

  expect(html).toContain("preview-sheet-frame");
  expect(html).toContain("workbench-chrome");
});
```

- [ ] **Step 2: Run the test to verify it fails if the wrappers are not yet complete**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: FAIL if the exact class names are not yet present.

- [ ] **Step 3: Add the editorial workbench wrappers and note slot**

Update `src/components/SfGovContentDesignTool.tsx` so the preview area can support the document surface and note rail without touching the actual preview renderer.

```tsx
<section className="right-panel preview-workbench" aria-label="Preview">
  <div className="preview-topbar workbench-chrome">
    ...
  </div>
  <div className="preview-scroll anim-fade-up">
    <div className="workbench-surface">
      <div className="preview-sheet-frame">{previewSlot}</div>
      <aside className="preview-notes" aria-label="Editorial notes">
        <div className="preview-note preview-note--status">Karl review surface</div>
      </aside>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Style the preview as a proofing board**

Add the main preview workbench styling to `src/components/SfGovContentDesignTool.css`.

```css
.preview-workbench {
  background: linear-gradient(180deg, #efe7d8 0%, #f6f1e7 100%);
}

.workbench-chrome {
  background: rgba(255, 255, 255, 0.42);
  border-bottom: 1px solid var(--line-soft);
}

.workbench-surface {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 18px;
  padding: 24px;
}

.preview-sheet-frame {
  background: var(--paper-strong);
  border: 1px solid rgba(0, 43, 72, 0.08);
  border-radius: 24px;
  box-shadow: 0 22px 40px rgba(47, 35, 24, 0.08);
  position: relative;
}

.preview-sheet-frame::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 32px;
  width: 1px;
  background: rgba(0, 43, 72, 0.12);
}

.preview-notes {
  display: grid;
  align-content: start;
  gap: 12px;
}

.preview-note {
  background: rgba(255, 253, 248, 0.85);
  border: 1px solid rgba(0, 43, 72, 0.08);
  border-radius: 16px;
  padding: 14px;
}
```

- [ ] **Step 5: Re-run the component test**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS

- [ ] **Step 6: Capture a refreshed desktop screenshot**

Run:

```bash
npx playwright screenshot --browser=chromium --viewport-size="1280,900" --full-page http://localhost:5000 review-generate-workbench-desktop.png
```

Expected: screenshot saved successfully; preview now reads as a document-review workbench with note surfaces.

- [ ] **Step 7: Commit**

```bash
git add src/components/SfGovContentDesignTool.tsx src/components/SfGovContentDesignTool.css src/components/SfGovContentDesignTool.test.tsx review-generate-workbench-desktop.png
git commit -m "feat: redesign generate preview as editorial workbench"
```

## Task 4: Finish Responsive Behavior And Final Verification

**Files:**
- Modify: `src/components/SfGovContentDesignTool.css`
- Test: `src/components/SfGovContentDesignTool.test.tsx`

- [ ] **Step 1: Write the failing responsive regression note**

Add a code comment block in the plan execution branch of `src/components/SfGovContentDesignTool.css` to mark the responsive section that will preserve the editorial identity while stacking the layout.

```css
/* Mobile editorial shell:
   - stack rail before preview
   - keep topbar readable
   - simplify preview chrome before removing page framing */
```

This is not a runtime test; it marks the exact responsive intent before editing.

- [ ] **Step 2: Add the final responsive rules**

Replace the current narrow-screen shell rules with the final stacked workbench layout.

```css
@media (max-width: 760px) {
  .editorial-main {
    flex-direction: column;
  }

  .authoring-rail {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .workbench-surface {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .preview-notes {
    order: -1;
    grid-template-columns: 1fr;
  }

  .preview-sheet-frame {
    border-radius: 18px;
  }

  .preview-sheet-frame::before {
    left: 18px;
  }

  .stream-footer-meta {
    display: none;
  }
}
```

- [ ] **Step 3: Run component tests again**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS

- [ ] **Step 4: Capture mobile and tablet verification screenshots**

Run:

```bash
npx playwright screenshot --browser=chromium --viewport-size="375,812" --full-page http://localhost:5000 review-generate-workbench-mobile.png
npx playwright screenshot --browser=chromium --viewport-size="768,1024" --full-page http://localhost:5000 review-generate-workbench-tablet.png
```

Expected: both screenshots saved successfully; the authoring rail stacks above the editorial preview and the preview retains its document framing cues.

- [ ] **Step 5: Final smoke test of the targeted component test file**

Run:

```bash
npm test -- src/components/SfGovContentDesignTool.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/SfGovContentDesignTool.css review-generate-workbench-mobile.png review-generate-workbench-tablet.png
git commit -m "fix: complete responsive generate workspace redesign"
```

## Self-Review

Spec coverage:
- top bar redesign: Task 2
- left rail hierarchy: Task 2
- preview workbench treatment: Task 3
- SF palette discipline: Task 2
- responsive behavior: Task 4

Placeholder scan:
- No `TODO`, `TBD`, or cross-task “similar to above” instructions remain.

Type consistency:
- All new shell hooks use the same class names across tests, JSX, and CSS:
  `editorial-shell`, `editorial-topbar`, `authoring-rail`, `preview-workbench`, `workbench-chrome`, `preview-sheet-frame`, `preview-notes`.
