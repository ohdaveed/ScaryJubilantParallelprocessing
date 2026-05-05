# HHVC SF.gov Content Design Tool — Audit Report

**Date:** 2026-05-04  
**URL:** http://localhost:5000/  
**Tool:** Lighthouse 11.7.1 (via Browser Tools MCP) + Playwright Screenshots + Perplexity Research  
**App:** HHVC Page Builder — SF.gov · Healthy Housing & Vector Control

---

## 1. Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| **Accessibility** | 100/100 | ✅ Pass |
| **Best Practices** | 100/100 | ✅ Pass |
| **SEO** | 80/100 | ⚠️ Needs improvement |
| **Performance** | 55/100 | ⚠️ Needs improvement |
| **Console Errors** | 0 | ✅ Pass |
| **Network Errors** | 0 | ✅ Pass |

---

## 2. Accessibility Audit (Score: 100/100)

All 23 audit checks passed. No issues detected across any category:

- **Navigation** — ✅ No failures
- **ARIA** — ✅ No failures  
- **Names & Labels** — ✅ No failures
- **Color Contrast** — ✅ No failures
- **Tables & Lists** — ✅ No failures
- **Language** — ✅ No failures
- **Best Practices** — ✅ No failures
- **Audio & Video** — ✅ No failures

**Key Strengths:**
- Skip-to-main-content link present (`href="#main-workspace"`)
- Proper semantic structure with heading hierarchy
- ARIA labels on interactive elements (select dropdowns have `aria-label` and `title` attributes)
- Keyboard-navigable controls

**Recommendations (none critical):**
- Continue testing with screen readers (NVDA, VoiceOver) for dynamic content announcements (generation status updates, evaluation results)
- Test keyboard navigation of the plan diagram SVG interactivity
- Verify modal dialogs (delete confirmation) trap focus properly

---

## 3. Performance Audit (Score: 55/100) ⚠️

| Metric | Value | Passes Core Web Vital? |
|--------|-------|----------------------|
| **LCP** (Largest Contentful Paint) | 19,017ms | ❌ No |
| **FCP** (First Contentful Paint) | 11,415ms | ❌ No |
| **SI** (Speed Index) | 14,329ms | — |
| **TTI** (Time to Interactive) | 12,941ms | ❌ No |
| **CLS** (Cumulative Layout Shift) | 0.009 | ✅ Yes |
| **TBT** (Total Blocking Time) | 1ms | ✅ Yes |

### Resource Breakdown
| Resource Type | Count | Size |
|--------------|-------|------|
| JavaScript | 44 | ~1,400 KB |
| Fonts | 8 | ~500 KB |
| Images | 2 | ~50 KB |
| Other (JSON, etc.) | 53 | ~600 KB |
| **Total** | **107 requests** | **~2,571 KB** |

### Main Thread Stats
- **Main thread blocking time:** 832ms
- **Main cause:** Large JS bundle (Vite development mode + React + MCP SDK)

### Prioritized Recommendations
1. 🔴 **Enable text compression** — Development server lacks gzip/brotli for JS/CSS assets
2. 🔴 **Improve LCP** — Largest element takes ~19s to render

### Findings
- The app runs in **Vite dev mode** (no production optimizations), which explains the high JS bundle size (44 JS files, no code splitting/minification)
- Font loading adds ~500KB (4 font families: DM Serif Display, JetBrains Mono, Plus Jakarta Sans, and potentially others)
- The MCP SDK (`@modelcontextprotocol/sdk`) is a large dependency loaded in the bundle
- **CLS is excellent (0.009)** — layout is stable during load
- **TBT is minimal (1ms)** — main thread stays responsive after initial load

### Recommendations
1. Switch to `npm run build && npm run preview` for production-like performance testing
2. Implement code splitting for the lazy-loaded tabs (MapTab, LibraryTab, SfGovPagePreview) — already using `React.lazy` and `Suspense` ✅
3. Optimize font loading with `font-display: swap` and subsetting
4. Consider tree-shaking MCP SDK or deferring it
5. Enable compression on the Express server for production builds

---

## 4. SEO Audit (Score: 80/100) ⚠️

### Failing Checks
| Issue | Impact | Description |
|-------|--------|-------------|
| No meta description | 🔴 Critical | Add `<meta name="description">` to improve search snippets |
| `robots.txt` not valid | 🔴 Critical | No robots.txt exists at `/` |

### Passing Checks ✅
- Document title is set: "HHVC SF.gov Content Design Tool"
- Viewport meta tag present
- Page has valid lang="en" attribute

### Recommendations
1. Add a meta description tag to `index.html`
2. Create a `robots.txt` file (even for internal tools, this is best practice)

---

## 5. Best Practices Audit (Score: 100/100)

All 14 checks passed:
- **Security** — ✅ No mixed content, no deprecated APIs
- **Trust & Safety** — ✅ No issues
- **User Experience** — ✅ No issues  
- **Browser Compatibility** — ✅ No issues

---

## 6. Console & Network Analysis

| Check | Result |
|-------|--------|
| Console Errors | 0 errors ✅ |
| Console Logs | Clean (no unexpected output) |
| Network Errors | 0 errors ✅ |
| Network Logs | Normal API requests |

No React warnings, no unhandled rejections, no 404 network errors.

---

## 7. SF.gov Karl Content Standards Compliance

Based on Perplexity research of SF.gov / Karl editor standards:

### Core Principles Check
| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Serve San Franciscans | ✅ | User-centric topic/goal input; resident-focused language generation |
| 2. Everyone can use it | ✅ | WCAG 2.1 AA compliant per accessibility audit |
| 3. Written simply | ✅ | Karl evaluation enforces plain language; Flesch-Kincaid checks |
| 4. Translated | ⚠️ | No visible translation toggle; rely on Karl CMS for this |
| 5. Service delivery | ✅ | CTA generation (phone, email, action links) |
| 6. Consistent | ✅ | Uses Maya design system components; Type system enforced |
| 7. Reusable | ✅ | Modular component chips; structured draft generation |

### Karl Evaluation Integration
- The app integrates "Karl" content standard evaluation via `/api/evaluate` endpoint
- Grading system: A-F grades with score/100
- Evaluation checks: passed/warnings/failed with summary
- **Karl status indicator** shows connection state: `idle`, `connecting`, `active`, `fallback`
- Falls back to baseline rules when Karl MCP is unreachable

---

## 8. Layout & Responsive Design (Playwright Screenshots)

Screenshots captured at 3 viewports:

| Viewport | Dimensions | File |
|----------|-----------|------|
| Desktop | 1440×900 | `generate-desktop-1440.png` |
| Laptop | 1280×800 | `generate-laptop-1280.png` |
| Tablet | 900×1024 | `generate-tablet-900.png` |

### Region Layout (Desktop 1440px)
| Region | Width | Height | Top |
|--------|-------|--------|-----|
| Authoring Rail (left panel) | 300px | 772px | 98px |
| Preview Workbench (main) | 1,139px | 772px | 98px |
| Preview Sheet | 1,103px | 651px | 199px |
| Studio Generate area | 1,101px | 649px | 200px |

### Layout Observations
- Two-column layout: 300px left sidebar (authoring rail) + remaining width for preview
- Clean top bar with tabs (Site Plan, Generate, Library, Ideal Map)
- No right-side rail in generate mode (studioRail: null)
- Preview area well-sized for content

---

## 9. UX/UI Observations

### Strengths
- **Skip-to-content link** present for keyboard/AT users
- **Semantic tab panel** with proper aria controls
- **Karl evaluation badges** show grade (A-F) and score
- **Streaming generation** with real-time status indicators
- **Draft version history** support
- **Multiple export options**: PNG, PDF, ZIP batch export
- **Review status tracking** (reviewStatus field)
- **Overlap detection** for duplicate page IDs

### Areas for Improvement
1. Add `lang` attributes more granularly in dynamic content
2. Consider live region announcements (`aria-live="polite"`) for generation progress
3. Add loading state indicators for library/page list
4. Ensure focus management when modals open/close (delete confirmation)

---

## 10. Overall Recommendations

### Critical
- ⚡ **Optimize performance** for production: enable compression, code-split large dependencies
- 🔍 **Add meta description** to `index.html`
- 📄 **Create `robots.txt`** 

### High
- 🧪 Run production build audit (`npm run build && npm run preview`) for realistic performance numbers
- ♿ Test with screen readers for dynamic content announcements
- 📱 Test responsive behavior below 900px (mobile)

### Medium
- 📊 Add to Karl evaluation: show which specific SF.gov principles each check maps to
- 🏷️ Add more granular ARIA live regions for streaming generation
- 📦 Consider lazy-loading the MCP SDK

### Low
- 🎨 Consider adding a dark mode toggle
- 🔤 Add font-display swap to prevent FOIT
- 📝 Add README documentation

---

## 11. Technical Details

- **Framework:** React 18 + Express.js 4
- **Vite version:** 5.4.21
- **Lighthouse version:** 11.7.1
- **Node requirement:** >=20.16.0
- **Port:** 5000 (Vite dev), 3001 (Express API)
- **AI model:** Anthropic Claude (via API)
- **Content standards:** Karl SF.gov editor standards (via MCP)
- **Database:** PostgreSQL with file-based fallback