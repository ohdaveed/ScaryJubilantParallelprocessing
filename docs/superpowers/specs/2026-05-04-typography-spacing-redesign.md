# Typography & Spacing System Redesign

**Date:** 2026-05-04  
**Status:** Approved — ready for implementation  
**Scope:** Studio shell polish — fonts, type scale, spacing tokens. No color or layout changes.

---

## 1. Problem

The studio shell has two issues:

1. **Fonts feel dated.** `Iowan Old Style` (display) and `Segoe UI / Aptos / Trebuchet MS` (UI body) are system fonts with inconsistent rendering across platforms. The global shell uses `Rubik`, creating a mismatch between the two layers.

2. **Panel spacing is inconsistent.** `.panel-section` padding ranges from 14px to 18px with no governing rule. `.field` margin-bottom varies between 12px and 14px. The result is a left rail that feels uneven — some sections tight, others loose.

---

## 2. Goals

- Replace both font stacks with a modern, self-hosted pair that renders consistently across platforms.
- Introduce a named type scale (7 size tokens + 3 line-height tokens) to replace all ad-hoc `font-size` values in the studio CSS.
- Introduce a 4px-grid spacing scale (7 tokens) to normalize panel section and field padding.
- Keep all colors, layout structure, component logic, and animations unchanged.

---

## 3. Font Pair

Installed via Fontsource npm packages (self-hosted, no external CDN dependency).

| Role | Font | Package | Weights imported |
|------|------|---------|-----------------|
| Display serif | DM Serif Display | `@fontsource/dm-serif-display` | 400 |
| UI sans | Plus Jakarta Sans | `@fontsource/plus-jakarta-sans` | 400, 500, 600, 700 |
| Mono | JetBrains Mono | `@fontsource/jetbrains-mono` | 400, 500, 700 |

**Display serif** (`DM Serif Display`) replaces `Iowan Old Style` for the brand title and any editorial display moments. High-contrast strokes, contemporary feel, excellent at 18–24px on dark backgrounds.

**UI sans** (`Plus Jakarta Sans`) replaces `Segoe UI / Aptos / Trebuchet MS` in the studio and `Rubik` in the global shell. Warm geometric, full weight range, excellent legibility at 12–14px.

**Mono** (`JetBrains Mono`) replaces `Consolas / Courier New`. Designed for readability at small sizes; suits the Karl/content-standards technical context.

Font imports go in `src/main.tsx`. Any Google Fonts `<link>` in `index.html` is removed.

---

## 4. Type Scale Tokens

Defined on `:root` in `src/index.css`. Inherited by `.sf-cdt`.

```css
--text-xs:      11px;   /* micro-labels, uppercase section labels, pill badges */
--text-sm:      12px;   /* field labels, secondary metadata, Karl check items */
--text-base:    13px;   /* body text, inputs, buttons sm/md, chip text */
--text-md:      14px;   /* primary body, large buttons, tab labels */
--text-lg:      16px;   /* sub-headings, panel section titles */
--text-xl:      18px;   /* brand subtitle, display moments in preview */
--text-display: 22px;   /* brand title in topbar */

--leading-tight: 1.3;   /* headings, compact labels */
--leading-base:  1.5;   /* body text, inputs */
--leading-loose: 1.7;   /* mono/log output, stream renderer */
```

`--font-size-micro-label` is kept as an alias for `--text-xs` so existing references don't break:

```css
--font-size-micro-label: var(--text-xs);
```

All ad-hoc `font-size` values in `SfGovContentDesignTool.css` and `ui.css` are replaced with the appropriate `var(--text-*)` token. See §6 for the mapping.

---

## 5. Spacing Tokens

Defined on `:root` in `src/index.css`. 4px grid.

```css
--space-1: 4px;    /* tight gaps: icon-to-label, dot-to-text */
--space-2: 8px;    /* chip gap, small row gaps, button padding vertical (sm) */
--space-3: 12px;   /* field margin-bottom, button padding vertical (md) */
--space-4: 16px;   /* panel section padding horizontal, card padding */
--space-5: 20px;   /* panel section padding vertical */
--space-6: 24px;   /* workbench surface padding, topbar padding horizontal */
--space-7: 32px;   /* large section gaps */
```

**Panel section normalization** — the primary fix for the inconsistency problem:

```css
/* Before: varies 14–18px with no rule */
/* After: */
.panel-section {
  padding: var(--space-5) var(--space-4);  /* 20px 16px */
}
```

**Field normalization:**

```css
/* Before: 14px in some places, 12px in others */
/* After: */
.field {
  margin-bottom: var(--space-3);  /* 12px */
}
.field:last-child {
  margin-bottom: 0;
}
```

**Topbar padding** tightens from `10px 22px` to `var(--space-2) var(--space-6)` (8px / 24px) for better horizontal rhythm. `min-height: 66px` is unchanged (touch-target safe).

---

## 6. Font-Size Replacement Map

Key mappings from current ad-hoc values to tokens:

| Current value | Token | Context |
|---|---|---|
| `var(--font-size-micro-label)` / `11px` | `var(--text-xs)` | Section labels, pill badges, micro-labels |
| `12px` | `var(--text-sm)` | Field labels, page names, Karl checks, confirm text |
| `13px` | `var(--text-base)` | Body text, inputs, buttons, chip text |
| `14px` | `var(--text-md)` | Tab labels, primary body |
| `16px` | `var(--text-lg)` | Sub-headings |
| `20px` (grade badge) | `var(--text-xl)` | Grade badge display |
| `21px` (brand-text) | `var(--text-display)` | Brand title |

Values that are intentionally outside the scale (e.g. `9px` for `.page-built` tag, `8px` for SVG text in PlanDiagram) are left as literals with a comment explaining the exception.

---

## 7. Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `@fontsource/dm-serif-display`, `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono` |
| `src/main.tsx` | Import font CSS files (specific weights) |
| `index.html` | Remove Google Fonts `<link>` if present |
| `src/index.css` | Replace `--font-sans: "Rubik"` with `"Plus Jakarta Sans"`; add `--text-*`, `--leading-*`, `--space-*` tokens; keep `--font-size-micro-label` alias |
| `src/components/SfGovContentDesignTool.css` | Replace `--font-display`, `--font-body`, `--font-mono` tokens; replace ad-hoc `font-size` values with `var(--text-*)` tokens; normalize `.panel-section` and `.field` padding with `var(--space-*)` tokens |
| `src/components/ui.css` | Replace ad-hoc `font-size` values with `var(--text-*)` tokens |
| `src/App.css` | Audit and normalize any ad-hoc font-size or padding values |

---

## 8. What Does NOT Change

- All color tokens and color values (navy, slate, paper, action blue, semantic colors)
- All layout structure (rail width 320px, topbar height 66px, flex layout)
- All component logic and JSX
- All animation keyframes and transition values
- All border-radius tokens
- The `--font-size-micro-label` token name (kept as alias)

---

## 9. Testing

After implementation, verify:

1. Brand title renders in DM Serif Display at 22px in the topbar
2. All field labels, tabs, and buttons render in Plus Jakarta Sans
3. Stream renderer and section labels render in JetBrains Mono
4. All `.panel-section` elements have consistent 20px/16px padding
5. No visual regressions in the Library tab, Site Plan tab, or Ideal Map tab
6. Fonts load correctly in offline/dev mode (Fontsource self-hosted)
7. `--font-size-micro-label` references still resolve correctly (alias check)

---

## 10. Out of Scope

- Tailwind CSS migration (separate project if desired)
- Shadcn/UI component adoption (separate project)
- Color system changes
- Responsive/mobile layout improvements
- New features or component additions
