# Collapsible Builder sidebar

  ## What & Why
  The Builder tab's left sidebar (form inputs, Drive panel, recent pages list) takes up a fixed 300px column. When viewing or refining a generated page, users want more horizontal space for the page content. Make the sidebar collapsible so users can toggle it open/closed.

  ## Done looks like
  - A small toggle button (chevron or collapse icon) at the top of the left sidebar lets users collapse/expand it
  - When collapsed, the sidebar shrinks to a narrow strip (~40px) showing just the toggle button, and the page preview area expands to fill the full width
  - When expanded, it returns to the current 300px layout
  - Collapse state persists during the session (not across reloads)
  - The form, Drive panel, and Recent Pages sections all hide when collapsed
  - Smooth CSS transition on collapse/expand

  ## Out of scope
  - Persisting collapse state to localStorage or DB
  - Drag-to-resize behavior
  - Collapsing other tabs (Library, System Map)

  ## Tasks
  1. **Add collapse toggle state and button** — Add a boolean state for sidebar visibility and a toggle button rendered at the top of the sidebar column.
  2. **Update grid layout** — Change the Builder tab's CSS grid to use the full width when the sidebar is collapsed, with a smooth transition.
  3. **Hide sidebar content when collapsed** — Conditionally render the form Card, Drive panel Card, and Recent Pages Card based on collapse state.

  ## Relevant files
  - `src/App.tsx:768-870`
  