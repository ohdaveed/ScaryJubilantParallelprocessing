# Task Plan: React Router + App Refactoring + Mockup Enhancement

**Goal:** Install React Router for URL-based tab routing, refactor the monolithic App.tsx (1456 lines) into smaller single-responsibility files, and enhance mockup functionality across all tabs.

**Spec:** `docs/superpowers/specs/2026-05-04-routing-mockup-refactor-design.md`

---

## Phases

### Phase 1: Install dependencies
**Status:** complete  
Installed `react-router-dom`.

### Phase 2: Extract inline components from App.tsx
**Status:** complete  
Extracted StreamRenderer, EvaluatingState, SuccessState, PlanDiagram, PlanSidebar, TodoPanel into standalone files.

### Phase 3: Create shared state hook (useWorkspaceState)
**Status:** complete  
Extracted search, filter, preferences, mockup editor state, page selection into a shared hook.

### Phase 4: Create WorkspaceContext
**Status:** complete  
React context providing pages, planned, generation hooks, and shared actions to all route components.

### Phase 5: Create page-level route components
**Status:** complete  
GeneratePage, LibraryPage, PlanPage, IdealPage (with build queue panel) created.

### Phase 6: Wire React Router in main.tsx + refactor App.tsx
**Status:** complete  
BrowserRouter, Routes configured. App.tsx reduced from ~1456 to ~200 lines.

### Phase 7: Enhance Ideal tab with build queue
**Status:** complete  
Added IdealTabQueuePanel component for adding pages to queue from Ideal tab.

### Phase 8: Verify and commit
**Status:** complete  
TypeScript check passes cleanly.

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| wsActions.setPreferences not found | 1 | Changed to use genActions.setPreferences directly |
| Type mismatch: regenerate vs setSelectedPlanned/mapMode types | 1 | Updated context interface to match hook types |
| Missing `loading` destructure in App.tsx | 1 | Added to destructuring |
| Type mismatch: regenerate return type | 1 | Changed from Promise<PageDraft \| null> to void |

## Decisions
- App.tsx reduced from ~1456 lines to ~200 lines
- All existing functionality preserved; no features removed
- React Router v6 with BrowserRouter wraps WorkspaceProvider
- Ideal tab enhanced with build wishlist queue panel
- Library tab computes filtered/sorted locally using workspace state