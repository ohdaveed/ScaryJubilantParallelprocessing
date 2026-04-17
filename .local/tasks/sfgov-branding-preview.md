# SF.gov Branding for Page Preview

## What & Why
The generated page preview (DraftRenderer) currently uses a custom card-based layout with colored section headers, small fonts, and tool-like styling that looks nothing like an actual sf.gov page. The user wants the page preview to visually mimic a real sf.gov page so content designers can see exactly how their draft would look when published.

This means adopting the official SF.gov Design System (https://design-system.sf.gov):
- **Typography**: Rubik font (Light 300, Regular 400, Semibold 600), Roboto Mono for code
- **Colors**: Slate L4 `#002B48` for body text/headlines, Slate L2 `#5A7A92` for secondary text, Action blue `#495ED4` for links/buttons, white `#fff` background
- **Layout**: Clean, generous spacing with a max-width content area (~800px), matching sf.gov's actual page proportions
- **Header**: SF.gov logo/wordmark bar at top with nav items (Services, Departments, Jobs, Contact) and search — rendered as a static preview, not functional
- **Footer**: City and County seal, social icons, organized link columns (Our City, Policy, Get Help) — static preview matching sf.gov
- **Page structure**: Page type label (e.g., "TOPIC", "INFORMATION") with colored underline, large bold title, summary text, then content sections with sf.gov-style headings (plain bold Rubik, not colored card headers)
- **Section rendering**: Replace current colored card/icon headers with sf.gov's clean heading style — just bold text with generous spacing. Bullet lists, numbered steps, and tables should match sf.gov's native styling (simple, no colored backgrounds on individual items)
- **Links**: Blue underlined links matching Action blue, arrow-style link lists for related pages

## Done looks like
- When a page draft is generated or viewed, the right-side preview panel renders it wrapped in a realistic sf.gov page shell (header, content, footer)
- The preview uses Rubik font, sf.gov color palette, and sf.gov-proportioned layout
- Section headings look like sf.gov headings (clean bold text), not colored card headers with icons
- Page type badges match sf.gov's small-caps label style with colored underline
- Related page links render as sf.gov-style arrow link rows
- The preview is clearly a "what it will look like on sf.gov" experience
- The builder/tool UI (sidebar, tabs, Karl eval panel) remains unchanged — only the page content preview area gets the sf.gov treatment

## Out of scope
- Making the header/footer links functional (they are purely visual)
- Changing the builder sidebar, tabs, or Karl evaluation panel styling
- Changing the system prompt or AI generation logic
- Adding actual sf.gov assets (City seal images) — use text/SVG approximations

## Tasks
1. Add Google Fonts import for Rubik (300, 400, 600) and Roboto Mono (400) to index.html or index.css
2. Create a new SfGovPageShell wrapper component that renders the sf.gov header bar (logo wordmark, nav items, search) and footer (seal text, link columns) as a static visual frame around the page content
3. Restyle the DraftRenderer to match sf.gov's content page layout — adopt Rubik font, sf.gov color tokens, sf.gov heading styles (plain bold, no colored card wrappers), generous spacing, and ~800px max-width content column
4. Update section rendering: replace colored icon headers with clean sf.gov-style section headings; update bullet lists, step lists, tables, and checklists to match sf.gov's native patterns (simple, minimal chrome)
5. Update the page type badge at the top of the preview to match sf.gov's page type label style (small caps with colored underline bar)
6. Style link lists and related page sections to match sf.gov's arrow-style link rows
7. Ensure the builder tool UI (sidebar, Karl eval, tabs) remains visually separate and unchanged

## Relevant files
- `src/App.tsx:52-185`
- `src/components/ui.tsx`
- `src/index.css`
- `src/utils.ts:20-26`
- `src/constants.ts`
