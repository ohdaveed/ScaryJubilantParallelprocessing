# Design audit — HHVC SF.gov Content Design Tool

**DATE:** 2026-05-04  
**TARGET:** `http://localhost:5000/` (Vite dev)  
**SCOPE:** Quick (`--quick`): Generate (default), Library, Site Plan + mobile viewport (Generate)  
**MCP:** Browser DevTools (`user-chrome-devtools`) — workspace rule  
**BASELINE:** `DESIGN.md` (studio `.sf-cdt` tokens, App UI classifier)

---

## Status

**DONE_WITH_CONCERNS**

- **Evidence:** Full-page PNGs under `.gstack/design-reports/` (see below). Console clean aside from Vite + React DevTools info.
- **Blocker for fix loop:** Working tree was **not clean** (`DESIGN.md`, `docs/superpowers/specs/…` modified). Per `/design-review`, **no atomic fix commits** were made. Re-run after **commit or stash** if you want the full fix → verify → commit loop.

---

## Headline scores

| Metric | Grade | Notes |
|--------|-------|--------|
| **Design score** | **B** | Strong studio shell and hierarchy; touch-target gaps pull it down. |
| **AI slop score** | **A** | No generic 3-column SaaS grid, no decorative blob hero. Slate + paper reads as a **pro tool**, not a template. |

**Per-category (indicative):** hierarchy B · typography B · spacing/layout B · color/contrast A- · interaction C+ · responsive B- · content B · motion (not fully exercised) · performance feel (dev only) N/A

---

## Phase 1 — First impression (Generate, desktop)

I'm looking at a **deep navy studio** with a clear brand anchor: **HHVC Page Builder** + SF.gov program line. My eye goes to **(1)** the preview paper canvas, **(2)** the blue primary rail actions, **(3)** the browser-chrome preview strip. That order matches the product job (draft preview matters).

**One word:** *credible.*

**Page areas:** Header idents site + product · Left rail = inputs · Center = preview · Footer = connection/status. Each reads instantly.

---

## Phase 2 — Inferred design system (rendered)

From `evaluate_script` sampling (~400 nodes):

- **Font families seen:** Rubik, Segoe UI, Consolas (mono stream/logs), Iowan Old Style (display), Arial (fallback). **≤3 intentional families** — aligns with `DESIGN.md` §5; not “Inter-only.”
- **Color diversity:** ~30 sampled fg/bg strings — coherent navy environment + paper + action blue (warm/cool mix is **documented**, not accidental).
- **Heading tags:** No `h1`–`h6` in the scanned Generate shell (empty-state copy is not heading-marked). Flag for **landmark/semantics** (see FINDING-003).
- **`prefers-reduced-motion`:** `false` in this session; studio motion still not uniformly gated (`DESIGN.md` §8 already calls this out).

---

## Phase 3 — Trunk test (Generate + Library)

| Question | Verdict |
|----------|---------|
| What site? | **PASS** — SF + HHVC builder clear in header. |
| What page? | **PASS** — Tab selection (`Generate` / `Library` / `Site Plan`) visible. |
| Major sections? | **PASS** — Rail vs preview vs footer. |
| Options at this level? | **PASS** — Primary actions obvious. |
| Where am I? | **PASS** — Tab + helper line under header. |
| Search? | **PASS on Library** — Search pages field present. |

**Trunk test:** **PASS**

---

## Findings (prioritized)

| ID | Impact | Category | Observation |
|----|--------|----------|-------------|
| **FINDING-001** | **High** (touch / a11y) | Interaction | Many controls **&lt; 44×44px**: top nav tabs ~**81×35**, page-type chips ~**86×24**, square icon buttons **34×34** and **22×22**. WCAG 2.2 target minimum not met on dense surfaces. |
| **FINDING-002** | **Medium** | Interaction | `DESIGN.md` §9 **F1** still applies: ensure **`:focus-visible`** rings on `.ui-btn` / studio primaries — not fully verified without keyboard pass, but risk matches documented gap. |
| **FINDING-003** | **Medium** | Content / a11y | Preview empty state lacks **heading semantics** (`h*`); assistive tech gets long `StaticText` without document outline. |
| **FINDING-004** | **Polish** | Typography | **10px uppercase labels** — `DESIGN.md` **F2** (comfort / contrast) still worth an audit on `#8C8B87`-class tertiary text. |

**Deviation from `DESIGN.md`:** No wholesale token drift observed; primary tension is **implementation detail** (touch targets, focus, semantics), not wrong palette.

---

## Screenshots (evidence)

| Artifact | Path |
|----------|------|
| Generate desktop | `.gstack/design-reports/hhvc-audit-2026-05-04-first-impression.png` |
| Library desktop | `.gstack/design-reports/hhvc-audit-2026-05-04-library.png` |
| Site Plan desktop | `.gstack/design-reports/hhvc-audit-2026-05-04-site-plan.png` |
| Generate mobile (390×844) | `.gstack/design-reports/hhvc-audit-2026-05-04-generate-mobile.png` |

---

## Quick wins (&lt; 30 min each)

1. **Bump vertical padding** on page-type chips and top nav tabs to reach **≥44px** hit area (CSS-only, no layout redesign).
2. **Add one `h2` (visually hidden if needed)** for the preview region title on empty state — cheap a11y win.
3. **Keyboard smoke test** + add `:focus-visible` where missing per F1.

---

## Outside voices

Not run (Codex / subagent parallel block). Optional follow-up: `codex exec` source audit from skill template.

---

## PR-style summary

> Design review (quick): **B / AI slop A**. Main gap is **44px touch targets** on chips and header tabs; semantics/focus per existing `DESIGN.md` gaps. **Fixes not committed** — tree was dirty.

---

## Karl / SF.gov editorial

**N/A for this pass.** Audit covered **tool chrome** and layout only, not new SF.gov-facing page body copy.

---

## Next steps

1. `git stash` or **commit** pending doc edits, then re-invoke `/design-review` for the **fix loop** if you want verified commits per finding.  
2. Optional: add `.gstack/` to `.gitignore` if local audit artifacts should stay out of git.
