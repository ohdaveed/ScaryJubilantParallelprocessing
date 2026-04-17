# Improve Output Page Layout UX

## What & Why
The generated page draft output currently renders all sections as simple bullet lists with minimal visual hierarchy. Based on UX recommendations grounded in Laws of UX (Miller's Law, visual urgency, scannability), the rendered output should be upgraded with smarter section-specific layouts: a side-by-side comparison table for responsibilities, an action block with step-by-step icons for the 311 CTA, checkbox-style preflight lists, grouped mold prevention tips, and callout highlighting for critical thresholds like the "10 square feet" rule.

## Done looks like
- The **Responsibilities** section renders as a two-column table (Landlord vs. Tenant), not two flat lists. Any mention of "10 square feet" is automatically highlighted in a distinct callout/badge.
- The **Report the problem / 311** section renders as a numbered step-by-step list with inline icons (phone icon for "Call 311", camera icon for "Take photos", clock icon for "Wait 72 hours") and a high-contrast action block around the 311 call instruction.
- A **Before you call** checklist (checkbox-style) appears when the section content includes items like "wait 72 hours" or "take photos", giving users a sense of pre-flight tasks.
- The **Prevent mold** (or equivalent prevention) section groups tips under two sub-headings: "Daily habits" and "Equipment and setup", following Miller's Law chunking.
- The **Related pages** section renders links as styled anchor elements rather than plain text.
- The system prompt instructs the LLM to label responsibilities clearly so Landlord vs. Tenant bullets can be parsed into the two-column table.

## Out of scope
- Changing how pages are generated, stored, or evaluated (Karl scoring logic unchanged).
- Adding real hyperlink URLs (links remain styled but do not navigate to external pages yet).
- Modifying the System Map, Todo panel, or any builder-side UI.

## Tasks
1. **Update the system prompt for structured responsibilities output** — Add instructions to the SYSTEM_PROMPT so the LLM labels responsibilities as "Landlord:" and "Tenant:" prefixed bullet groups, enabling the renderer to split them into a two-column table.

2. **Build enhanced section renderers** — In `DraftRenderer`, detect the "Responsibilities" section and render a two-column comparison table (Landlord | Tenant). Detect any line containing "10 square feet" and wrap it in a highlighted callout chip/badge. Add a new `ResponsibilitiesTable` component to `ui.tsx`.

3. **Build the 311 action block and step-by-step CTA** — For the "Report the problem" / "311" section, replace the plain bullet list with a numbered step list where each step has an icon (phone, camera, clock). Wrap the "Call 311" step in a high-contrast action block. Add an `ActionStep` and `ActionBlock` component to `ui.tsx`.

4. **Add checkbox-style preflight checklist** — Detect a "Before you call" or equivalent section and render items as styled checkbox rows (visual only, not interactive form elements) to convey a pre-flight task feel. Add a `ChecklistRow` component to `ui.tsx`.

5. **Group prevention tips into chunked sub-sections** — For sections with "prevent" or "prevention" in the heading, detect and render content under two automatic sub-groups: "Daily habits" and "Equipment and setup", grouping tips using Miller's Law chunking logic based on keyword signals in each tip.

6. **Upgrade the Related pages section** — Render related page names as styled pill links (visually distinct, not plain text) with a right-arrow icon. They should look clickable even if not yet wired to live URLs.

## Relevant files
- `src/App.tsx`
- `src/components/ui.tsx`
- `src/constants.ts:1-102`
