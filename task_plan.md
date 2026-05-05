# Task Plan: Typography & Spacing System Redesign

**Goal:** Modernize the HHVC SF.gov Content Design Tool studio shell with new fonts (DM Serif Display, Plus Jakarta Sans, JetBrains Mono), a named type scale, and a 4px-grid spacing system. No color or layout changes.

**Spec:** `docs/superpowers/specs/2026-05-04-typography-spacing-redesign.md`

---

## Phases

### Phase 1: Install Fontsource packages
**Status:** pending  
Install `@fontsource/dm-serif-display`, `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono`.

### Phase 2: Wire font imports in main.tsx
**Status:** pending  
Import specific font weight CSS files. Remove any Google Fonts link from index.html.

### Phase 3: Add tokens to index.css
**Status:** pending  
- Replace `--font-sans: "Rubik"` with `"Plus Jakarta Sans"`
- Add `--text-*` scale tokens (7 sizes)
- Add `--leading-*` tokens (3 line heights)
- Add `--space-*` tokens (7 spacing values)
- Keep `--font-size-micro-label` as alias for `--text-xs`

### Phase 4: Update SfGovContentDesignTool.css
**Status:** pending  
- Replace `--font-display`, `--font-body`, `--font-mono` token values
- Replace all ad-hoc `font-size` values with `var(--text-*)` tokens
- Normalize `.panel-section` padding to `var(--space-5) var(--space-4)`
- Normalize `.field` margin-bottom to `var(--space-3)`
- Update topbar padding to `var(--space-2) var(--space-6)`

### Phase 5: Update ui.css
**Status:** pending  
Replace ad-hoc `font-size` values with `var(--text-*)` tokens.

### Phase 6: Audit and update App.css
**Status:** pending  
Audit for any ad-hoc font-size or padding values; normalize with tokens.

### Phase 7: Verify and commit
**Status:** pending  
Run dev server, visually verify, commit changes.

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

## Decisions
- Font-size values outside the scale (9px, 8px SVG text) left as literals with comments
- `--font-size-micro-label` kept as alias (backward compat)
- Topbar min-height stays 66px (touch target)
