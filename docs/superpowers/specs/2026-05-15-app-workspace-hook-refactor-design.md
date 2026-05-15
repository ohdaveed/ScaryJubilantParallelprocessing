# App Workspace Hook Refactor Design

**Date:** 2026-05-15
**Status:** Draft
**Author:** Copilot

## Problem

[`src/App.tsx`](../../../src/App.tsx) is still acting as an orchestration-heavy root component. It already delegates the visual shell to [`SfGovContentDesignTool`](../../../src/components/SfGovContentDesignTool.tsx), but it also owns several unrelated responsibilities:

- route-to-tab synchronization through `useLocation()` and `useNavigate()`
- workspace-side effects such as the database mode check
- derived view state for preview labels, library rows, and footer text
- event handlers for tab changes, generation, page selection, export, and form updates
- hidden screenshot export behavior tied to the selected page

That makes the root component harder to scan than it should be, and it mixes app coordination with UI composition. The result is a file that is more difficult to test and reason about than the surrounding shell components.

## Goal

Extract the non-visual workspace logic from `src/App.tsx` into a dedicated hook so the root component becomes a thin composition layer.

## Recommended Approach

Create a new hook, `useAppWorkspace`, that owns the application state derivations and event handlers currently living in `App.tsx`.

### Responsibilities of `useAppWorkspace`

The hook will:

- read routing state from React Router and derive the active workspace tab
- expose tab-change handlers that keep the URL in sync
- expose generate, browse-library, export, and page-goal handlers
- compute derived preview values such as:
  - preview URL text
  - preview summary line
  - library row data
  - footer/status text
  - stream bar message
- fetch the DB mode on mount and expose it to the caller
- keep the existing workspace context interactions intact through [`useWorkspace`](../../../src/context/WorkspaceContext.tsx)

### Responsibilities of `App.tsx`

`App.tsx` will remain responsible for:

- rendering the top-level shell wrapper
- wiring `SfGovContentDesignTool` props from the hook output
- rendering the lazy-loaded preview pages
- maintaining the hidden screenshot export target and its `ref`

## Design Details

### Hook shape

The hook should return a structured object rather than a long positional tuple.

Suggested return shape:

- `workspaceTab`
- `pageTypeOptions`
- `dbMode`
- `showFileModeBanner`
- `previewUrlSlug`
- `previewSummaryLine`
- `libraryRows`
- `streamFooterMetaFull`
- `streamBarMessage`
- `topicError`
- `handlers`
  - `handleWorkspaceTab`
  - `handleBrowseLibraryClick`
  - `handleExportClick`
  - `handlePageTypeChange`
  - `handlePageGoalChange`
  - `handleGenerateClick`
  - `handleLibraryPageSelect`
  - `handleLibraryPageDelete`

The root component can then destructure only what it needs.

### Side effects

The DB mode fetch stays behavior-identical:

- call `GET /api/system/db-mode` on mount
- default to `unknown` when the request fails
- show the file-mode banner only when the response reports `file`

The route/tab sync remains URL-based:

- `/plan` maps to the plan tab
- `/generate` maps to the generate tab
- `/library` maps to the library tab
- `/ideal` maps to the ideal tab
- unknown paths fall back to `library`

### Screenshot export

The screenshot export implementation should remain where it is today in practical terms:

- `App.tsx` still owns the screenshot `ref`
- the hook may expose an `onExportClick` callback that triggers the export path
- the actual PNG generation stays unchanged

This avoids coupling the hook to DOM ownership while still removing repeated UI coordination from the root component.

## Alternatives Considered

### 1. Keep `App.tsx` intact and only extract pure helper functions

This would be the smallest possible change, but it would leave the root component as a dense block of state, effects, and handlers. It reduces line count slightly without improving the real maintenance problem.

### 2. Split `App.tsx` into a controller component and a presentational wrapper

This would separate concerns more explicitly, but it introduces more files and a slightly larger refactor than necessary for the current goal. It is a good follow-up if the hook extraction still leaves `App.tsx` too busy.

### 3. Extract `useAppWorkspace` now

This is the recommended path. It keeps the refactor focused, preserves behavior, and gives the root component a clear boundary without over-engineering the app shell.

## Non-Goals

This refactor will not:

- change the `SfGovContentDesignTool` shell layout
- change the tab names, page types, or page generation workflow
- alter the hidden screenshot export behavior
- redesign the editor UI
- change routing semantics beyond preserving the current tab-to-URL behavior

## Testing Plan

Validate the refactor with targeted checks:

1. Keep the existing shell rendering tests passing in [`src/components/SfGovContentDesignTool.test.tsx`](../../../src/components/SfGovContentDesignTool.test.tsx).
2. Add or update a focused `App` test if needed to cover the workspace hook behavior indirectly through the rendered shell.
3. Run `npm test` to catch regressions in the existing component and route coverage.
4. Run `npm run dev` to confirm the app still boots and the routing / preview shell render correctly.

## Risks

- The hook could accidentally capture too much responsibility if it starts handling DOM ownership or preview rendering directly.
- Because `App.tsx` currently combines routing, workspace state, and export behavior, a poor extraction could create circular dependencies or make the hook harder to reuse.
- The file-mode banner logic must remain visible in the root component output so it does not get lost during the extraction.

## Acceptance Criteria

The refactor is complete when:

- `src/App.tsx` is reduced to a thin composition layer
- the workspace derivation and handlers live in `useAppWorkspace`
- the visible UI behaves the same as before
- existing tests still pass
- the development server starts cleanly
