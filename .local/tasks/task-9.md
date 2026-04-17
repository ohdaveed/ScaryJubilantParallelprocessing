---
title: Integrate 3-hub sitemap, skeleton drafts, and Karl CMS fields
---
# Three-Hub Sitemap Integration with Skeleton Drafts

## What & Why
Integrate the HHVC 3-hub sitemap architecture (Tenant Hub, Owner Hub, Community & Teacher Hub) plus Vector Services and a shared Contact Us page into the system prompt, suggested pages, pre-populated planned pages, and UX design standards. Additionally, auto-generate skeleton drafts for every planned page — pre-filled with the correct Karl CMS field structure (Content Title, Service Title, Summary, sections, CTA buttons) — so users can download and review page structure before using the AI agents to generate full content.

## Done looks like
- The system prompt instructs the AI to organize all HHVC content under three hubs plus Contact Us, using the exact Karl CMS content types and naming conventions.
- "Campaign Page" is added as a new Karl content type (used for the Community Hub's mosquito education page).
- Each hub's pages include the correct Karl CMS fields: Content Title (internal CMS name), Service Title (public H1), Summary (short blurb under H1), and CTA Button (for Transaction pages).
- SUGGESTED_PAGES is replaced with entries matching the full sitemap, with correct page types and user types.
- The System Map "Plan" mode auto-seeds the planned_pages table with the 3-hub hierarchy on first load when no planned pages exist.
- When planned pages are seeded, skeleton drafts are also auto-created for each one — using the Karl CMS field structure from the architecture reference. Skeletons include Content Title, Service Title, Summary, section headings (What to know / What to do), CTA button labels, and placeholder body text like "[Content to be generated]".
- Each skeleton draft is saved to the database as a PageDraft with a "skeleton" flag, visible in the Library and selectable in the Builder.
- Users can download individual skeleton drafts as .txt files, or use a "Download all skeletons" button to get a zip/bundle of all drafts.
- Users can click "Generate with AI" on any skeleton to have the AI agents fill in the real content, replacing the skeleton placeholders while preserving the structure.
- Design standards are in the system prompt: strict 5th-grade reading level, Hick's Law (home page shows only three hub links), Law of Common Region (contact info in a footer section on every page), Service Page type for action-oriented tasks, Smart Inspection Form reference, and vocabulary rules ("Trash" not "Sanitation", "Bugs/Pests" not "Vectors").
- The structure improvement agent also enforces the 3-hub organization, Karl CMS field conventions, and UX law guidance.

## Karl CMS Architecture Reference

### Hub 1: Community Hub (Campaign Page)
- Content Title: HHVC - Community - Mosquito Education
- Service Title: Learn how to stop mosquitoes
- Summary: Join a workshop to learn how to keep your school and home safe from bugs.
- Primary Goal: Awareness and education for teachers and students.

### Hub 2: Tenant Hub (Transaction + Information Pages)
- Main Page (Transaction): Content Title "HHVC - Tenant - Report a Problem" / Service Title "Get help with pests, mold, and trash" / Summary "If your landlord won't fix a health problem, we can help." / CTA "Start a report"
- Sub-pages (Information): Content Title "HHVC - Tenant - [Topic]" / Service Title "[Simple Topic Name]" / Summary "Easy steps to follow if you have [Topic] in your home."
  - Pests and Bugs (Rats, roaches, and bed bugs)
  - Mold and Water (Leaks and damp walls)
  - Trash and Messes (Garbage, sewage, and waste)
  - Plants and Weeds (Overgrown yards and tall grass)

### Hub 3: Owner Hub (Transaction + Information Pages)
- Main Page (Transaction): Content Title "HHVC - Owner - Pay Building Fee" / Service Title "Pay your annual building fee" / Summary "Owners of buildings with 3 or more apartments must pay this fee every year." / CTA "Pay my fee online"
- Sub-pages (Information):
  - Fee Deadlines: Service Title "How much is my fee?" / Summary "See the costs and deadlines for building owners."
  - Fixing a Violation: What to do after an inspection
  - Owner Rules: Requirements for buildings with 3+ units

### Hub 4: Vector Services (Transaction Pages)
- Dead Bird Report (Transaction): Content Title "HHVC - Vector - Dead Bird Report" / Service Title "Report a dead bird" / Summary "Tell us if you find a dead bird so we can check if it is sick." / CTA "Report bird location"

### Shared: Contact Us (Information Page)
- Section 1: Call 311 (to report problems and ask for inspections)
- Section 2: Visit our Office (49 South Van Ness, Suite 600, for payments and bills)

### Global Writing Constraints
- Content Title: Internal name for CMS organization (not shown to public).
- Service Title: Public H1 header shown to users.
- Summary: Short blurb displayed under the header.
- Body Content: Use Step-by-Step blocks for processes and Fact Items for contact info.
- Vocabulary: Use "Trash" not "Sanitation", "Bugs" or "Pests" not "Vectors".

## Out of scope
- Generating AI content for all pages automatically — users choose which skeletons to fill with AI.
- Changing the visual layout of the System Map diagram.
- Implementing the Smart Inspection Form itself (only referenced in prompts).

## Tasks
1. **Add Campaign Page content type** — Add "Campaign Page" to PAGE_TYPES, TYPE_META (styling), SECTION_STYLES, and the Karl component library in the system prompt. Campaign Pages are for awareness/education content (workshops, outreach).

2. **Update SYSTEM_PROMPT with 3-hub architecture and Karl CMS fields** — Add a section defining the three hubs plus Vector Services and Contact Us, with exact Content Title / Service Title / Summary / CTA Button values for each page. Add Karl CMS field conventions (Content Title = internal, Service Title = public H1, Summary = blurb, Body = Step-by-Step blocks + Fact Items). Add UX design standards (Hick's Law, Law of Common Region, Smart Inspection Form reference). Add vocabulary rules ("Trash" not "Sanitation", "Bugs/Pests" not "Vectors").

3. **Replace SUGGESTED_PAGES** — Replace the current suggested pages array with entries matching the full 3-hub + Vector + Contact Us sitemap, using the correct Karl content types and user types.

4. **Create skeleton draft templates** — Build a data structure (in constants.ts or a new file) mapping each planned page to its skeleton draft content: Content Title, Service Title, Summary, section headings (What to know / What to do), CTA buttons, tenant responsibility callouts, and "[Content to be generated]" placeholders for body text. Each skeleton follows the exact PAGE DRAFT output format so it can be parsed by the existing parsePage utility.

5. **Auto-seed planned pages and skeleton drafts** — When the System Map Plan mode loads and planned_pages is empty, auto-create the full hierarchy via the API. Then auto-generate and save a skeleton PageDraft for each planned page (linked via builtPageId), marked with a "skeleton: true" flag so the UI can distinguish them from AI-generated pages.

6. **Skeleton UI and download** — In the Library and Builder views, show skeleton drafts with a visual indicator (e.g., dashed border or "Skeleton" badge). Add a "Generate with AI" button on skeleton pages that sends the skeleton structure to the AI agent for content generation (replacing the skeleton while keeping the structure). Add individual download (.txt) for any page draft. Add a "Download all skeletons" button that bundles all skeleton drafts into a single download.

7. **Update structure improvement prompt** — Add the 3-hub organizational check, Karl CMS field conventions, vocabulary rules, and UX law enforcement to the improve-structure endpoint in server.js.

## Relevant files
- `src/constants.ts`
- `src/App.tsx:261-366,475-585,975-990`
- `server.js:342-395`
- `src/types.ts:81-89`
- `src/utils.ts`
- `src/components/ui.tsx`