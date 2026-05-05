# Routing & Mockup Refactor Design

**Date:** 2026-05-04
**Status:** Draft
**Author:** Superdesign

## Problem

The application has two structural issues:

1. **No URL-based routing** — tab switching uses `useState<WorkspaceTab>` in App.tsx, preventing deep-linking, browser back/forward navigation, and shareable URLs for each workspace view.

2. **App.tsx is 1456 lines** — it holds ALL state variables, all event handlers, and several large inline memoized components (`PlanDiagram` ~100 lines, `PlanSidebar` ~100 lines, `TodoPanel` ~170 lines, `StreamRenderer`, `EvaluatingState`, `SuccessState`). This violates single-responsibility and makes the file difficult to maintain.

## Solution

### 1. React Router Integration

Replace `useState<WorkspaceTab>` with React Router v6:

| Route | Tab | Description |
|-------|-----|-------------|
| `/` | — | Redirect to `/generate` |
| `/generate` | Generate | AI page creation + draft editing |
| `/library` | Library | Browse all pages with version info |
| `/plan` | Plan | Site map showing page connections |
| `/ideal` | Ideal | Reference examples + build wishlist queue |

The `SfGovContentDesignTool` shell (header, tabs, footer, left panel) remains as the shared layout. Route-level components render into the `previewSlot`.

### 2. App.tsx Refactoring (DRY + Single Responsibility)

**Extract inline components into standalone files:**

| Component | Lines removed | New file |
|-----------|--------------|----------|
| `StreamRenderer` | 24 | `src/components/StreamRenderer.tsx` |
| `EvaluatingState` | 15 | `src/components/EvaluatingState.tsx` |
| `SuccessState` | 43 | `src/components/SuccessState.tsx` |
| `PlanDiagram` | 98 | `src/components/PlanDiagram.tsx` |
| `PlanSidebar` | 86 | `src/components/PlanSidebar.tsx` |
| `TodoPanel` | 173 | `src/components/TodoPanel.tsx` |

**Extract tab-specific state into a hook:**

| State moved | Source file |
|------------|------------|
| `search`, `filterType`, `verificationFilter`, `showOverlapsOnly`, `sortNewest` | `useWorkspaceState` |
| `selectedPageIds`, `selectAllPages`, `clearPageSelection` | `useWorkspaceState` |
| `newPref`, `mockupEditOpen`, `draftEditBuffer`, `draftEditSaving`, `draftEditError` | `useWorkspaceState` |

**Create page-level route components:**

| Page | Lines | Content |
|------|-------|---------|
| `src/pages/GeneratePage.tsx` | ~500 | Preview + draft editor + refine + Karl eval + history |
| `src/pages/LibraryPage.tsx` | ~30 | Thin wrapper around `LibraryTab` |
| `src/pages/PlanPage.tsx` | ~30 | Thin wrapper around `MapTab` in 'plan' mode |
| `src/pages/IdealPage.tsx` | ~80 | `MapTab` in 'view' mode + build queue panel |

**Create shared context:**
`src/context/WorkspaceContext.tsx` — provides `pages`, `plannedPages`, `selected`, generation hooks, and shared actions to all page components without prop drilling through the shell.

### 3. Ideal Tab Enhancement

Current Ideal tab only shows `ReferenceExample` objects. Enhancement adds a "Build wishlist" section:

```
┌─────────────────────────────────────────┐
│ Goal: Add pages you want to create      │
│ [Page name input] [User type dropdown]  │
│ [Add to queue]                          │
├─────────────────────────────────────────┤
│ Build Queue (3 items pending)           │
│ ┌─────────────────────────────────────┐ │
│ │ Topic: Mosquito Control Permit      │ │
│ │ User: Resident · Status: Pending    │ │
│ │ [Run queue]  [Stop]                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Reference benchmark patterns...         │
```

The queue panel reuses the generation logic from `useQueueRunner` and `TodoPanel` patterns.

### 4. Library Tab Version Display

Already implemented: `p.currentVersionNumber` displays as `v{number}` badge on each page card. `version` field exists on `PageDraft` type. No changes needed.

### Files That Change

- `package.json` — add `react-router-dom` dependency
- `src/main.tsx` — add `BrowserRouter`, `Routes`, route config
- `src/App.tsx` — reduce to shared layout shell, remove inline components, remove tab state management
- **New:** `src/components/StreamRenderer.tsx`
- **New:** `src/components/EvaluatingState.tsx`
- **New:** `src/components/SuccessState.tsx`
- **New:** `src/components/PlanDiagram.tsx`
- **New:** `src/components/PlanSidebar.tsx`
- **New:** `src/components/TodoPanel.tsx`
- **New:** `src/pages/GeneratePage.tsx`
- **New:** `src/pages/LibraryPage.tsx`
- **New:** `src/pages/PlanPage.tsx`
- **New:** `src/pages/IdealPage.tsx`
- **New:** `src/hooks/useWorkspaceState.ts`
- **New:** `src/context/WorkspaceContext.tsx`
- **New:** `src/components/IdealTabQueuePanel.tsx`

### Files That Stay

- `src/hooks/usePagesData.ts`
- `src/hooks/usePlanMap.ts`
- `src/hooks/usePageGeneration.ts`
- `src/hooks/useQueueRunner.ts`
- `src/hooks/useVersionHistory.ts`
- `src/components/tabs/MapTab.tsx`
- `src/components/tabs/LibraryTab.tsx`
- `src/components/SfGovContentDesignTool.tsx`
- `src/components/ui.tsx`