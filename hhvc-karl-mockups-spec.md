# HHVC Karl mockups — design specification

This document implements the **OUTPUT FORMAT** from [hhvc-karl-mockup-brief.md](hhvc-karl-mockup-brief.md). The brief remains the normative source for editorial rules and the full page inventory (IDs 1–47).

Companion artifacts:

- [.superdesign/design_iterations/hhvc_mockup_theme.css](.superdesign/design_iterations/hhvc_mockup_theme.css)
- [.superdesign/design_iterations/hhvc_workspaces_index_1.html](.superdesign/design_iterations/hhvc_workspaces_index_1.html) (links to all screens)
- Per-screen HTML: `hhvc_topic_workspace_1.html`, `hhvc_transaction_workspace_1.html`, `hhvc_information_workspace_1.html`, `hhvc_step_by_step_workspace_1.html`, `hhvc_campaign_workspace_1.html`, `hhvc_resource_collection_workspace_1.html`, `hhvc_library_review_1.html`, `hhvc_karl_handoff_1.html`
- [src/mockups/README.md](src/mockups/README.md) for React mapping; **Campaign** is included in Generate page-type chips in [src/App.tsx](src/App.tsx) (`STUDIO_PAGE_TYPE_CHIPS`).

---

# Visual direction

**Audience:** HHVC staff preparing Karl-ready public content.

**Tone:** Serious internal civic admin tool—not a startup landing page or generic AI demo. Restrained, content-first, panel-based.

**Layout:** Default **left–authoring / center–public preview / right–QA** for types that support it (Transaction is deepest). Other types may emphasize two columns but reuse the same chrome (top bar, verification chips, muted surfaces).

**Surfaces:** Neutral backgrounds (`#f4f5f7`–`#ffffff` tiers), subdued 1px borders (`#d1d5db`–`#e5e7eb`), **one accent** for primary actions (e.g. deep teal or SF-adjacent slate `#0f766e` / `#1e3a5f`—pick one system-wide).

**Typography:** Strong hierarchy: page title 18–22px semibold, section labels 11–12px uppercase tracking, body 14–15px. System UI stack is acceptable for a civic admin tool (legibility over novelty).

**Status:** Verification and review states use **high-contrast chips** (background + border + text), not low-contrast pills. Campaign **preview** may use a slightly richer hero band; **tool chrome** stays identical to other types.

**Motion:** Minimal—optional 150ms focus rings only; no decorative animation.

**Accessibility:** Focus-visible outlines, semantic headings, `aria-label` on icon-only controls in coded prototypes.

---

# Topic workspace

1. **Screen title:** Topic workspace — hub authoring  
2. **Goal:** Let staff build **routing hubs** that organize users toward transactions, prevention, or program pages without impersonating a single task.  
3. **Layout:** Left: metadata + hub fields. Center: Topic-style preview (grouped cards, featured links). Right: QA for hub logic and overlap.  
4. **Exact modules:** Hub title; short summary; audience notes; featured child pages (ordered list + pin); grouped navigation blocks (2–4 groups); related topics/resources; internal tags; parent hub (breadcrumb).  
5. **Recommended UI labels:** “Hub title”, “Summary”, “Primary audience”, “Featured pages”, “Navigation groups”, “Related topics”, “Internal notes”.  
6. **Example HHVC content (inventory):**  
   - **ID 1** — *Get help with pests and housing problems* — Topic — Approved for mockup use.  
   - **ID 2** — *Report a pest or housing problem* — Topic — Approved for mockup use.  
   - **ID 16** — *Fix a housing or pest problem* — Topic — Approved for mockup use.  
   - **ID 25** — *Prevent pests and keep your home healthy* — Topic — Approved for mockup use.  
7. **Karl mapping notes:** Topic maps to Karl **Topic** type: title, introduction/summary, **child links / topic listings**, related content blocks. Avoid embedding full transaction forms.  
8. **Why it works:** Matches Karl/SF.gov pattern where Topic **routes** rather than completes a task; QA can enforce distinct child labels and no duplicate cards (brief §Topic).

---

# Transaction workspace

1. **Screen title:** Transaction workspace — task-first authoring  
2. **Goal:** Draft **action** pages (311 report, payment, formal request) with verified routing and task-first public order.  
3. **Layout:** **Left:** structured fields. **Center:** Karl-like public preview (summary → what to know → what to do → CTA). **Right:** QA checklist + verification + handoff readiness.  
4. **Exact modules (left):** Title; audience; service promise (one line); “What to know” (rich text); “What to do” (steps/CTA); 311/routing fields (when verified); warnings / public-record notes; related pages; tags/metadata.  
5. **Exact modules (center):** Live-styled preview: H1, summary, accordions or sections, primary button + action link pattern per HHVC rules.  
6. **Exact modules (right):** Required sections check; plain language; duplicate overlap; factual review status; **never** “Ready for Karl handoff” if body empty or required sections missing.  
7. **Recommended UI labels:** “Service promise”, “What to know”, “What to do”, “Routing (311)”, “Related pages”, “Verification status”, “Handoff readiness”.  
8. **Example HHVC content:**  
   - **ID 10** — *Report garbage or dirty conditions* — Transaction — Approved for mockup use.  
   - **ID 45** — *Pay your healthy housing fee for buildings with 3 or more units* — Transaction — Approved for mockup use (eligibility: 3+ rented units per brief).  
   - **ID 3** — *Report rats or mice* — Transaction — **Needs HHVC verification** (badge; routing language provisional).  
9. **Karl mapping notes:** Transaction → title, summary, service body, **CTAs** (button link, action link), contact/routing fields, related pages. Keep background out of the primary fold (brief §Transaction).  
10. **Why it works:** Aligns with SF.gov “report a health nuisance” style anchors; separates editorial input from resident-facing task order (brief §Transaction).

---

# Information workspace

1. **Screen title:** Information workspace — explainer authoring  
2. **Goal:** Support program, prevention, scope, and fee **explainer** pages without a discrete completion task.  
3. **Layout:** Left: title, summary, section builder, optional FAQ block, related transactions/topics, factual review markers on sensitive statements. Center: Information preview (sections + related links). Right: QA for scope accuracy and cross-links.  
4. **Exact modules:** Title; summary; section list (H2 + body); common questions (optional); related **Transaction** links; related **Topic** links; “sensitive statement” flags (health/enforcement).  
5. **Recommended UI labels:** “Page summary”, “Add section”, “Common questions”, “Related tasks”, “Related hubs”, “Mark for factual review”.  
6. **Example HHVC content:**  
   - **ID 37** — *About the healthy housing program and inspections* — Information — Approved for mockup use.  
   - **ID 22** — *Learn about reinspection fees* — Information — Approved for mockup use (fee concept, not payment flow).  
   - **ID 38** — *Learn what we inspect in homes and buildings* — Information — **Needs HHVC verification**.  
7. **Karl mapping notes:** Information → intro, body sections, sidebar/related links, metadata for navigation.  
8. **Why it works:** Keeps long explanation off Transaction pages and matches Karl **Information** lifecycle (brief §Information).

---

# Step by step workspace

1. **Screen title:** Step by step workspace — sequenced guidance  
2. **Goal:** Ordered stages for inspections, notices, and compliance paths.  
3. **Layout:** Left: summary + numbered stages (each: title, body, prerequisites). Center: preview with **clear numbering** vs supporting notes. Right: QA for sequence integrity and missing prerequisites.  
4. **Exact modules:** Page summary; stages (1..n) with title + body + optional “you will need”; readiness checks; “what happens next” footer.  
5. **Recommended UI labels:** “Stage title”, “Stage detail”, “Readiness check”, “Next step expectation”.  
6. **Example HHVC content:**  
   - **ID 17** — *Get ready for a housing inspection after you report a problem* — Step by step — Approved.  
   - **ID 21** — *What owners need to do after getting a notice of violation* — Step by step — Approved.  
   - **ID 20** — *What tenants need to do after getting a notice of violation* — **Needs HHVC verification**.  
7. **Karl mapping notes:** Step by step → ordered blocks / steps in Karl; avoid duplicating full Information articles in each step.  
8. **Why it works:** Visual distinction between **numbered actions** and notes reduces user confusion (brief §Step by step).

---

# Campaign workspace

1. **Screen title:** Campaign workspace — leadership-flexible outreach  
2. **Goal:** Allow richer storytelling and layout where leadership chose **Campaign**; still surface links to authoritative **Transaction** / **Information** pages for real tasks.  
3. **Layout:** Same three columns; **center preview** may include hero image, pull quotes, proof points; left includes campaign sections (feature band, CTA blocks); right QA enforces plain language, factual review, and **related service links**.  
4. **Exact modules:** Hero; outreach sections; optional testimonials/proof; prominent CTAs; “Related services” strip (hard-required).  
5. **Recommended UI labels:** “Campaign headline”, “Supporting story”, “Primary CTA”, “Related service pages”.  
6. **Example HHVC content:**  
   - **ID 40** — *Request a mosquito education workshop for students* — Campaign — **Leadership-directed** (per brief: preserve Campaign choice).  
7. **Karl mapping notes:** Campaign → flexible streamfield-style layout in Karl; map hero, rich text, image, CTA, and **manual related links** to service pages.  
8. **Why it works:** Explains **why Campaign is more flexible** while preventing service actions from disappearing into narrative (brief §Campaign).

---

# Resource Collection workspace

1. **Screen title:** Resource Collection workspace — grouped references  
2. **Goal:** Curate guides, PDFs, tools, and reference links without becoming a hidden transaction page.  
3. **Layout:** Left: collection title, summary, resource groups (label + items). Center: card grid preview. Right: QA warns if critical actions are buried in lists.  
4. **Exact modules:** Collection summary; groups; per-item title, type (PDF/link/guide), short description; filter/label chips.  
5. **Recommended UI labels:** “Resource group”, “Add resource”, “Link label”, “Do not replace transaction”.  
6. **Example HHVC content:**  
   - **ID 46** — *Healthy housing guides and resources* — Resource Collection — Approved for mockup use.  
7. **Karl mapping notes:** Resource Collection → collection intro + child resources / downloads in Karl.  
8. **Why it works:** Matches “grouped references” pattern; QA blocks **service actions** that belong on Transaction (brief §Resource Collection).

---

# Library and duplicate review

1. **Screen title:** Library — editorial control surface  
2. **Goal:** Filter and triage all pages; surface **canonical relationships** and **duplicate overlap** (e.g. same pest: report vs prevent vs program).  
3. **Layout:** Top filter bar; main sortable table; optional detail drawer for overlap analysis.  
4. **Exact modules:** Filters: content type, topic area, status, audience, verification state; search; table columns (title, type, hub, verification, last edited); **duplicate overlap** flag row; bulk actions (export selection, open in workspace).  
5. **Recommended UI labels:** “Content type”, “Topic area”, “Verification”, “Show overlaps only”, “Open in workspace”.  
6. **Example HHVC content:** Mix rows: e.g. ID 3 (Report rats…) vs ID 26 (Prevent rats…) → **Duplicate overlap detected** at topic “rodents” angle.  
7. **Karl mapping notes:** Library is **internal**; exports drive Karl create/update. Rows carry `pageType`, `verificationState`, `karlSlug` (future).  
8. **Why it works:** Turns library from flat list into **editorial control** (brief §Library).

---

# Karl handoff and export review

1. **Screen title:** Karl handoff / export review  
2. **Goal:** **Copy-ready** structured handoff first; PNG/screenshot **secondary**.  
3. **Layout:** Primary column: structured fields in copy-friendly blocks (plain text + optional JSON). Secondary: completeness meter; tertiary: “Export PNG” de-emphasized.  
4. **Exact modules:** Title; summary; metadata (type, audience, hub); body sections serialized; related page URLs/titles; verification flags; required-field checklist; **Copy all** / per-section copy buttons.  
5. **Recommended UI labels:** “Copy for Karl”, “Required fields”, “Verification flags”, “Export PNG (optional)”.  
6. **Example HHVC content:** Hand off **ID 41** (*Report a dead bird for West Nile Virus testing*) with note: verify exact local routing before publication.  
7. **Karl mapping notes:** Field order should mirror Karl entry order for the chosen type to minimize paste errors.  
8. **Why it works:** Reduces contradictory QA vs empty draft (brief §Factual review states); trust in tool (brief line 186).

---

# Component inventory

| Component | Used in | Purpose |
|-----------|---------|---------|
| `VerificationChip` | All | Single factual-review state from approved list |
| `QAPanel` | All workspaces | Checklist: type fit, sections, plain language, overlap, verification |
| `HubCardGroup` | Topic | Grouped child links with group headers |
| `TransactionFieldStack` | Transaction | Promise, know, do, routing |
| `PublicPreviewFrame` | All | Fake browser chrome + type template |
| `SectionBuilder` | Information | Repeatable H2 + body |
| `StepList` | Step by step | Numbered stages + readiness |
| `ResourceTileGrid` | Resource Collection | Thumbnail/icon, title, type badge |
| `CampaignHero` | Campaign | Optional wide hero in preview only |
| `LibraryFilterBar` | Library | Multi-filter row |
| `DuplicateBanner` | Library | Warning when overlap detected |
| `HandoffBlock` | Handoff | Monospace / structured copy region + copy button |

---

# React structure

**Existing shell:** [SfGovContentDesignTool.tsx](src/components/SfGovContentDesignTool.tsx) exposes `tabs`, `activeTabId`, `previewSlot`, `karlEvaluation`, `libraryPages`, left panel inputs. Today one **Generate** layout serves all types.

**Recommended mapping (future):**

| Spec workspace | Suggested components | Notes |
|----------------|---------------------|--------|
| Topic | `TopicWorkspace.tsx` | Props: `hubFields`, `childPages`, `onChange`, `previewSlot` |
| Transaction | `TransactionWorkspace.tsx` | Full L–C–R; reuses `KarlEvaluationView` |
| Information | `InformationWorkspace.tsx` | `sections[]`, `relatedLinks` |
| Step by step | `StepByStepWorkspace.tsx` | `stages[]` with `readinessChecks[]` |
| Campaign | `CampaignWorkspace.tsx` | `hero`, `sections`, `relatedServiceIds` |
| Resource Collection | `ResourceCollectionWorkspace.tsx` | `groups[]` of `resources[]` |
| Library | Extend [LibraryTab.tsx](src/components/tabs/LibraryTab.tsx) | Add verification + overlap columns |
| Handoff | `KarlHandoffPanel.tsx` | Read-only derived from page model |

**Integration:** `App.tsx` chooses workspace component by `pendingPageType` or a new `workspaceMode` state. `SfGovContentDesignTool` gains optional `workspaceToolbar` slot or renders children instead of fixed left fields.

**Dev mapping doc:** [src/mockups/README.md](src/mockups/README.md).

---

# Design tokens

CSS custom properties (see [hhvc_mockup_theme.css](.superdesign/design_iterations/hhvc_mockup_theme.css)):

| Token | Role |
|-------|------|
| `--hhvc-bg-app` | App background |
| `--hhvc-bg-panel` | Panel surface |
| `--hhvc-bg-elevated` | Cards / preview |
| `--hhvc-border` | Default border |
| `--hhvc-text` | Primary text |
| `--hhvc-text-muted` | Secondary labels |
| `--hhvc-accent` | Primary button / link |
| `--hhvc-radius` | 6–8px |
| `--hhvc-space-*` | 4/8/12/16/24 scale |

**Chip variants (factual review states):**

- Approved for mockup use — neutral green tint  
- Needs HHVC verification — amber  
- Leadership-directed — violet (distinct from error)  
- Policy / Jurisdiction / Health accuracy review required — distinct borders + icons in tooltip  
- Ready for Karl handoff — dark green (only when checks pass)  
- Missing required section — red  
- Duplicate overlap detected — orange outline  

---

# Build order

1. **Design tokens** and chip styles (`hhvc_mockup_theme.css`).  
2. **Shell layout** (top bar + three columns).  
3. **Transaction** screen (richest L–C–R + QA).  
4. **Topic**, **Information**, **Step by step** (reuse shell).  
5. **Resource Collection** + **Campaign** (preview variants).  
6. **Library** (filters + overlap row).  
7. **Karl handoff** (copy blocks + de-emphasized PNG).  
8. **Polish:** focus states, heading order, README for React handoff.

---

## Editorial cross-check

- **Transaction** only for tasks (report, pay, request).  
- **Information** for explainers; **Topic** for hubs; **Step by step** for true sequences; **Resource Collection** for grouped refs; **Campaign** when leadership chooses flexibility.  
- **Needs HHVC verification:** badge visible; no final routing/enforcement/medical claims in “approved” voice.
