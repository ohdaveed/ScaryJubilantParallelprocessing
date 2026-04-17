# Constrain Designs to Real Karl CMS

## What & Why
The tool currently generates page designs using fictional page types ("Guidance page", "Issue page", "Enforcement page", "Support page") and fictional components ("Action-first title", "Primary CTA block", "Responsibilities section", "What happens next") that do not exist in Karl, SF.gov's actual CMS. This means every design produced is not publishable as-is — editors would need to re-map everything manually. The tool must be updated so that every generated draft only uses real Karl content types and real Karl components, making outputs directly actionable.

From the Karl documentation, the real content types available are:
- Services: **Transaction**, **Information**, **Step by step**, **Location**
- Outreach: **News**, **Event**, **Campaign**
- Department Support: **About**, **Resource Collection**, **Meeting**, **Profile**, **Data story**, **Reports**, **Agency**
- Sitewide: **Topic**

For HHVC, the relevant subset is: Transaction, Information, Step by step, Topic, and Resource Collection.

A key architectural decision: **the HHVC hub page is a Topic page**. In Karl, Topic pages collect content around a common theme across departments. Transaction and Step by step pages tagged with the HHVC Topic will automatically surface under the Services section on that hub. Every generated HHVC page should reference the HHVC Topic hub as its parent in system relationships.

The real Karl components are:
- Reusable: **Address**, **Media** (images, PDFs, documents), **Profile**, **Resource tile**
- Non-reusable: **Title**, **Description**, **Button link**, **Callout**, **Spotlight**, **Text**, **Section**, **Phone number**, **Email**, **Related**
- Transaction-specific sections: **What to know**, **What to do** (hard-coded heading, cannot be renamed; contains Callout, Section, Address, Document, Email, Button link, Phone number, Text)

## Done looks like
- The `PAGE_TYPES` list in the codebase only includes real Karl content types. "Guidance page", "Issue page", "Enforcement page", and "Support page" no longer appear anywhere.
- The component library referenced in the system prompt only lists real Karl components. Fictional components like "Action-first title", "Primary CTA block", "Responsibilities section", "What happens next", "Signs/examples", "When to use this page", "FAQ", and "Checklist" are removed.
- The system prompt's output format for the PAGE DRAFT section reflects real Karl page structure: Title → Description → What to know → What to do (with Sections and Callouts) → Related.
- Suggested pages use only real Karl content types (e.g., "Fix mold in my rental" is a Transaction, "What landlords must fix in my home" becomes an Information page, not a "Guidance page").
- The Karl evaluation prompt checks that only real Karl content types and components appear in the draft, and flags any fictional types or components as failures.
- The visual type-color mapping and section style mapping in the UI are updated to reflect the real Karl types and components.
- Existing saved pages with old fictional page types are displayed with a visual indicator that they use a legacy type.
- The system prompt encodes the HHVC hub as a Topic page as a non-negotiable rule, and every generated page's System Relationships output lists it as the parent. The HHVC Topic hub also appears as an entry in the suggested pages list.

## Out of scope
- Redesigning the UI layout or adding new visual components (covered by a separate task).
- Migrating or deleting previously saved pages from the database.
- Implementing actual Karl API integration or live publishing to SF.gov.

## Tasks
1. **Update page type definitions** — Replace the `PAGE_TYPES` array and `TYPE_META` map in `src/constants.ts` with the real Karl content types relevant to HHVC (Transaction, Information, Step by step, Topic, Resource Collection). Update colors/styles for each real type.

2. **Update the system prompt component library and output format** — In `src/constants.ts`, replace the fictional component library in `SYSTEM_PROMPT` with the real Karl component list. Rewrite the PAGE DRAFT output format to reflect real Karl page structure: Title, Description, What to know, What to do (with Sections/Callouts), and Related. Map old section headings to their Karl equivalents (e.g., "What you can do now" → content within "What to do"; "Report the problem" → a Section inside "What to do"; "Related pages" → "Related").

3. **Update section styles to match Karl components** — In `src/constants.ts`, rewrite `SECTION_STYLES` so that keys match real Karl component/section names (e.g., "what to do", "what to know", "callout", "related", "description"). Remove entries for fictional components.

4. **Update suggested pages to use real Karl types** — In `src/constants.ts`, update every entry in `SUGGESTED_PAGES` to use a valid Karl content type. For example, "Guidance page" entries become "Information", and any "Enforcement page" or "Support page" entries are remapped to "Information" or "Transaction" based on the page's purpose. Add the HHVC hub ("Healthy Housing and Vector Control hub") as a Topic page entry at the top of the suggested pages list.

5. **Encode the HHVC hub in the system prompt** — Add a non-negotiable rule to the `SYSTEM_PROMPT` stating that the HHVC hub is a Topic page, and that every generated HHVC page must list it as its Parent in the System Relationships output. Include a note that tagging a Transaction or Step by step page with the HHVC Topic will cause it to surface automatically on the hub.

6. **Update the Karl evaluation prompt** — In `server.js`, add checks to the `evalPrompt` that flag any use of a non-existent Karl content type or component as a failure. The valid type list and valid component list should be explicitly enumerated in the prompt so the evaluator knows what to enforce.

## Relevant files
- `src/constants.ts`
- `server.js:205-242`
- `src/components/ui.tsx`
