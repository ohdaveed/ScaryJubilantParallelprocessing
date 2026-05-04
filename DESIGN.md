# DESIGN.md — HHVC SF.gov Content Design Tool

Last reviewed: 2026-05-04 (live UI at `http://localhost:5000`, Browser DevTools MCP).

This document is the **design source of truth** for the React/Vite app in `src/`. It merges **what ships in CSS** with **what renders in the browser** so future changes stay aligned with SF.gov–appropriate civic UI and the product’s two-layer shell.

---

## 1. Product framing

| Attribute | Description |
|-----------|-------------|
| **Audience** | City content designers / HHVC program staff building SF.gov pages |
| **Classifier** | **App UI** (task-focused workspace: generate, library, map, preview) — not a marketing landing page |
| **Jobs-to-be-done** | Configure audience + page type → generate draft → preview “SF.gov-shaped” output → iterate with Karl checks |

**Design intent:** Calm, government-credible surfaces; dense but readable controls; preview area that reads as **paper / browser frame**, not a generic card grid.

---

## 2. Experience modes (two visual systems)

The product deliberately uses **two token sets**:

### A. Global / legacy shell (`:root` in `src/index.css`)

Used when `#root` is the standard centered layout (`max-width: 1100px`, padded). **Typography:** **Rubik** (loaded via `index.html`) as `--font-sans`, weight ~500 on body for clarity at UI sizes.

### B. SF Content Design Studio (`.sf-cdt` in `src/components/SfGovContentDesignTool.css`)

Full-bleed immersive shell when `.app-root-sf-studio` is mounted (`#root` expands to full viewport). **Typography:** **Segoe UI** (`--font-body`) for UI chrome; **Iowan Old Style** (`--font-display`) for editorial/display moments. **Background:** Deep slate gradient (`#05253d` → `#002b48`) with subtle grid overlay and soft blue radial accent — reads as a **studio**, not a generic SaaS purple gradient.

**Rule for contributors:** When editing studio chrome, only use tokens under `.sf-cdt`. When editing shared primitives (`ui.css`), use `:root` variables unless a component is explicitly scoped to the studio.

---

## 3. Color — global tokens (`:root`)

Semantic naming matches **text / background / border** roles (not “blue-500” style).

| Token | Value | Usage |
|-------|--------|--------|
| `--color-text-primary` | `#1A1916` | Body, titles |
| `--color-text-secondary` | `#5F5E5A` | Secondary labels |
| `--color-text-tertiary` | `#8C8B87` | Hints, uppercase micro-labels |
| `--color-text-danger` | `#A32D2D` | Errors |
| `--color-text-warning` | `#633806` | Warnings |
| `--color-text-success` | `#0F6E56` | Success |
| `--color-text-info` | `#0C447C` | Informational |
| `--color-background-primary` | `#FFFFFF` | Cards, inputs |
| `--color-background-secondary` | `#F7F6F2` | Panels, subtle fills |
| `--color-background-warning` | `#FAEEDA` | Warning surfaces |
| `--color-background-success` | `#E1F5EE` | Success surfaces |
| `--color-background-danger` | `#FCEBEB` | Error surfaces |
| `--color-border-primary` | `#1A1916` | Strong outline |
| `--color-border-secondary` | `#C8C7C2` | Inputs, dividers |
| `--color-border-tertiary` | `#E5E4DF` | Cards |
| `--color-border-info` | `#185FA5` | Karl / info emphasis |

**Stream / Karl log accent (inline in `index.css`):** Karl lines use `#185FA5` on `#e6f1fb` — aligns with info blue.

---

## 4. Color — Content Studio tokens (`.sf-cdt`)

| Token | Role |
|-------|------|
| `--slate-l4` … `--slate-l1` | Depth of navy environment |
| `--action-blue`, `--action-blue-strong` | Primary actions, highlights |
| `--paper`, `--paper-strong`, `--paper-shadow` | Preview / document surfaces |
| `--ink`, `--ink-soft` | Text on dark or paper |
| `--line-soft`, `--line-strong` | Dividers on dark UI |
| `--rail-bg`, `--rail-panel*` | Left rail glass panels |
| `--success`, `--warning`, `--danger` | Semantic status |

Rendered palette skews **warm paper + cool slate + blue action** — distinctive and appropriate for a civic preview tool.

---

## 5. Typography

| Context | Stack | Notes |
|---------|--------|--------|
| Global UI | `Rubik` → system stack | Avoids “Inter-only” generic look; keep weights 400–600 |
| Studio chrome | `Segoe UI`, `Aptos`, `Trebuchet MS` | 14px base, 1.6 line-height |
| Studio display | `Iowan Old Style` → Georgia stack | Editorial headings |
| Mono / logs | `SFMono`, Consolas, Menlo | Stream renderer ~12px, 1.75 line-height |

**Scale (typical):** Uppercase labels `10px` / `0.09em` letter-spacing (`ui-label`); field labels `12px`; buttons `12–14px`; cards inherit `13–14px` body.

---

## 6. Spacing, radius, layout

| Concept | Value |
|---------|--------|
| **Page gutter** | `#root`: `24px 20px` vertical/horizontal |
| **Studio** | Full viewport; rail + main split inside `.sf-cdt` |
| **Rhythm** | `4`, `6`, `8`, `10`, `12`, `14`, `16`, `20` px appear consistently in `ui.css` |
| **Radius** | `--border-radius-sm/md/lg` → `4px`, `6px`, `10px` (global); studio `--r-sm` … `--r-xl` → `6–24px` |

---

## 7. Core components (see `src/components/ui.css`)

- **Btn** — Variants: primary (inverse black/white), ghost, danger; sizes sm/md/lg; hover uses opacity + slight lift; disabled ~40% opacity.
- **Badge** — Pill tags; **page-type** variants use distinct pastel fills (Transaction, Information, Topic, etc.).
- **Card** — Light border `0.5px`, interactive cards lift on hover.
- **Field / Label** — Uppercase tertiary labels; hint text smaller.
- **Inputs** — `13px`, subtle border, focus darkens border (global inputs).

---

## 8. Motion

Global (`index.css`): `spin`, `blink`, `fadeUp`, `pulse`. Studio (`SfGovContentDesignTool.css`): `sfcdt-pulse`, `sfcdt-fadeUp`, `sfcdt-slideIn`. Transitions on buttons ~`0.12s` on opacity/transform — short and purposeful.

**Recommendation:** Respect `prefers-reduced-motion` for studio animations if you extend motion (not uniformly enforced today).

---

## 9. Design audit snapshot (2026-05-04)

### Headline scores

| Metric | Grade | Notes |
|--------|--------|--------|
| **Design score** | **B** | Coherent studio identity; clear hierarchy; preview frame reads as “document” |
| **AI-slop score** | **B** | Not a cookie-cutter 3-column marketing layout; dark rail + paper preview is intentional |

### Category highlights

| Category | Grade | Evidence |
|----------|--------|----------|
| Visual hierarchy | B | Left rail → tabs → preview; empty state centers one story |
| Typography | B | Rubik + studio serif/sans split is purposeful |
| Color & contrast | B | High contrast on primary actions; semantic badges |
| Spacing & layout | B | Tokenized rhythm in `ui.css` |
| Interaction states | B− | See gaps below |
| Responsive | B | Studio optimized for desktop workflows |
| Content / microcopy | A− | Utility-first; status strip + footer communicate state |

### Strengths

1. **Trunk test:** Brand (SF / HHVC), task (Generate), and preview context are clear within one screen.
2. **Empty state** is instructive without walls of text — single CTA pair (“Generate draft” / “Browse Library”).
3. **Footer status** (Connected, Karl offline notice, version) supports operator trust.
4. **Page-type pills** encode taxonomy visually — supports scanning.

### Gaps & quick wins

| ID | Impact | Finding | Suggested fix |
|----|--------|---------|----------------|
| F1 | Medium | **Focus rings:** `.ui-btn` uses `outline: none` without a `:focus-visible` replacement | Add `:focus-visible { outline: 2px solid var(--color-border-info); outline-offset: 2px; }` (and studio equivalent on dark buttons) |
| F2 | Polish | **10px uppercase labels** may fall below comfortable reading for some users | Bump to 11px where space allows, or confirm 4.5:1 contrast on `#8C8B87` |
| F3 | Polish | **Emoji** in evaluation stats (✓ ⚠ ✗) — fine for internal tool; swap to SVG icons if exporting screenshots externally | Optional |
| F4 | Medium | **Reduced motion** not wired globally | `@media (prefers-reduced-motion: reduce)` to shorten/disable decorative animation |

### Quick wins (&lt; 30 min each)

1. Add **focus-visible** styles for `.ui-btn` and studio primary buttons.
2. Audit **touch targets** on pill page-type controls at ~375px width (min 44px height where feasible).
3. Document **visited-link** behavior anywhere blue links appear in preview (universal rule for SF.gov content).

---

## 10. Files that own the system

| File | Responsibility |
|------|----------------|
| `src/index.css` | Global tokens, `#root` layout, stream renderer |
| `src/components/ui.css` | Shared primitives (buttons, cards, badges, inputs) |
| `src/components/SfGovContentDesignTool.css` | Full studio shell, rail, preview chrome, dark-theme tokens |
| `src/App.css` | App-specific compositions |

---

## 11. Change discipline

- Prefer **token edits** over one-off hex in components.
- New surfaces: decide **global vs `.sf-cdt`** before adding variables.
- User-visible SF.gov **page copy** remains subject to **Karl / SF.gov editorial** standards (see `AGENTS.md`); this file covers **tool chrome** only.

---

*Generated as part of a design review pass; update this file when tokens or layout paradigms change.*
