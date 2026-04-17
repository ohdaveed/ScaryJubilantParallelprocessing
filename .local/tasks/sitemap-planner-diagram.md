# Sitemap Planner with Click-to-Generate

## What & Why
Add a planning mode to the System Map tab that lets content designers sketch out their full site architecture as a node diagram *before* generating any content. Each node represents a planned page (with a name, page type, and user type). Clicking a node opens a panel to generate content for that specific page, pre-filling the Builder with the node's details.

This separates the thinking work (what pages do we need?) from the writing work (generate each one), which is the natural content design workflow.

## Done looks like
- The System Map tab has two modes: **Plan** (new) and **Map** (existing, now renamed "View")
- In Plan mode, users can add planned page nodes by specifying a name, page type, and user type
- Planned nodes appear on the interactive diagram; users can also add parent→child relationships between nodes
- Clicking a planned node opens a side panel showing its details and a "Generate content" button
- Clicking "Generate content" navigates to the Builder tab with the topic, page type, and user type pre-filled
- After a page is generated, its node in the Plan diagram updates to show it as "built" (distinct visual treatment)
- Planned pages are persisted to the database so they survive page refresh
- Nodes can be deleted from the plan

## Out of scope
- Drag-to-reposition nodes (static layout only)
- Drawing edges/relationships manually by dragging (relationships inferred from parent field, as today)
- Importing a sitemap from an external source

## Tasks
1. **Database: planned pages table** — Add a `planned_pages` table to the database with fields for `id`, `name`, `page_type`, `user_type`, `parent_id` (nullable, self-referencing), and `created_at`. Add REST endpoints: list, create, update, delete.

2. **Plan mode UI — add/manage nodes** — In the System Map tab, add a Plan/View toggle. In Plan mode, show a sidebar form to add a new planned page (name, page type, user type, optional parent). Render the planned nodes in the SVG diagram using the same TYPE_META color scheme. Show a delete button on each node's side panel when selected.

3. **Click-to-generate flow** — When a planned node is clicked, show a detail panel with its info and a "Generate content" button. Clicking it switches to the Builder tab with the topic, page type, and user type pre-filled and ready to generate. After generation, mark the planned node as built and link it to the generated page (show a "View page" link instead of "Generate content").

## Relevant files
- `src/App.tsx:261-307`
- `src/App.tsx:902-915`
- `server.js`
