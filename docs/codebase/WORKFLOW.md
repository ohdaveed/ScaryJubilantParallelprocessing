# User Workflow & Logic Analysis — hhvc-tool

## Current User Workflows

### **Workflow 1: Single Page Generation (Main Path)**

```
┌─ User Input Form (SfGovContentDesignTool)
│  ├─ Topic (page goal; textarea or input)
│  ├─ User Type (dropdown: Resident, Business Owner, etc.)
│  ├─ Page Type (dropdown: Transaction, Information, etc.)
│  └─ Additional Context (notes field)
│
├─ Generate Button Click
│  └─ usePageGeneration.generate()
│
├─ AI Processing (Anthropic API)
│  ├─ POST /api/chat
│  ├─ Stream text response
│  └─ Display StreamRenderer (real-time output)
│
├─ Parse Structured Output
│  └─ pageParser.repairAndParseStructured()
│     ├─ Extract: name, userType, pageType, draft, components, etc.
│     └─ Store in PageDraft
│
├─ Display Success State
│  └─ Show page draft + grade badge (if Karl eval ran)
│
├─ Optional: Evaluate Against Karl Standards
│  └─ POST /api/evaluate
│     ├─ Claude Haiku evaluates page
│     ├─ Returns KarlEvaluation (score, grade, passed, warnings, failed)
│     └─ Display in KarlEvalPanel
│
├─ Optional: Improve Structure
│  └─ POST /api/improve-structure
│     ├─ Refine based on user feedback
│     └─ Update draft
│
└─ Save Page
   └─ POST /api/pages (persists to DB or file)
```

### **Workflow 2: Batch Generation (Queue)**

```
┌─ User Creates TODO Items (bulk skeleton run)
│  ├─ Title: Page topic
│  ├─ User Type: Target user
│  └─ Status: "pending"
│
├─ Start Queue
│  └─ useQueueRunner.start()
│
├─ For Each TODO (Sequential)
│  ├─ Set status → "generating"
│  ├─ Call generate(topic, userType)
│  ├─ Wait for completion
│  ├─ On success:
│  │  ├─ Set status → "done"
│  │  ├─ Store builtPageId
│  │  └─ Store karlGrade (if auto-evaluated)
│  └─ On error:
│     ├─ Set status → "failed"
│     └─ Store errorMessage
│
├─ Pause/Stop Button (can interrupt mid-run)
│  └─ stopRef.current = true (checked before next item)
│
└─ View Queue Results
   └─ Pages tab or Library tab shows generated pages
```

### **Workflow 3: Page Discovery & Versioning**

```
┌─ Library Tab
│  ├─ Display all pages (from usePagesData.pages)
│  ├─ Filter by type, user type, grade
│  └─ Click page → select it
│
├─ Map Tab (IdealSiteMap)
│  ├─ Show IA structure (planned pages)
│  ├─ Visualize relationships
│  └─ Navigate to planned page
│
├─ Preview Page
│  └─ SfGovPreview renders:
│     ├─ Page title
│     ├─ Components list
│     ├─ Draft HTML/markdown
│     └─ Related pages
│
├─ View Version History
│  └─ useVersionHistory.versions
│     ├─ List snapshots (max 50 per page)
│     └─ Rollback to older version (PATCH /api/pages/:id)
│
└─ Export/Download Page
   └─ toPng() → PDF (jspdf) or HTML
```

---

## State Flow & Logic Issues

### **Recent Stability Improvements**

- Version restore now enforces page/version ownership (`/api/pages/:id/restore/:versionId` and `/api/pages/:id/versions/:versionId` reject cross-page IDs).
- Planned page parent updates now block self-parenting and cycle creation in `/api/planned-pages/:id`.
- First-load sitemap skeleton drafts now ship with concrete section copy (no `[Content to be generated]` placeholders in seed source).

---

### **Issue 1: Complex Parameter Passing**

**Location:** `usePageGeneration` hook

**Problem:**
```typescript
type UsePageGenerationParams = {
  topic: string;
  userType: string;
  notes: string;
  pendingPageType: string;
  pendingPlannedId: number | null;
  preferences: UserPreference[];
  pages: PageDraft[];
  selected: PageDraft | null;
  plannedPages: PlannedPage[];
  refineInput: string;
  setPages: Dispatch<SetStateAction<PageDraft[]>>;
  setSelected: Dispatch<SetStateAction<PageDraft | null>>;
  // ... 8 more setters
};
```

- **22 parameters** to configure hook behavior
- Mix of state + setters (violates single responsibility)
- Hard to use; error-prone
- Re-renders frequently on any parent state change

**Impact:** Maintenance burden, frequent re-renders, bug surface area

**Recommended Fix:**
```typescript
// Instead: Context-based state
const usePageGenerationContext = () => {
  const context = useContext(PageGenerationContext);
  if (!context) throw new Error("Missing provider");
  return context;
};

export function usePageGeneration() {
  const { topic, userType, pages, setPages, setSelected, ... } = usePageGenerationContext();
  // Hook logic here
  return { generate, loading, error, ... };
}
```

---

### **Issue 2: Queue Runner State Not Persistent**

**Location:** `useQueueRunner` hook + backend

**Problem:**
- Queue runs in memory via React state (todos[])
- If page reloads → queue state lost
- If user navigates away → queue paused/abandoned
- No resume capability

**Current Code:**
```typescript
const [running, setRunning] = useState(false);
const [currentItemId, setCurrentItemId] = useState<number | null>(null);
const stopRef = useRef(false);

// When user closes browser → running state lost
```

**Impact:** Users can't pause/resume batch generation; bad for 100+ page IA builds

**Recommended Fix:**
- Store queue progress in database (page_queue_runs table)
- Persist `{ queueRunId, itemIndex, status, attempts }` on each update
- Allow resume from any checkpoint
- Example:
```typescript
const persistQueueState = async (queueRunId: string, itemIndex: number) => {
  await POST /api/queue-runs/:id { itemIndex, status: "paused" }
  // Later: GET /api/queue-runs/:id → resume
};
```

---

### **Issue 3: No Undo/Redo for Page Edits**

**Location:** `useVersionHistory` + page updates

**Problem:**
- Pages saved on each PATCH /api/pages/:id
- Version history is snapshots (50 max per page)
- Can rollback to old version but:
  - No undo stack (can't redo after rollback)
  - No conflict detection (if two users edit same page)
  - Snapshots not diff-based (storage inefficient)

**Current Code:**
```typescript
const rollback = async (versionNumber: number) => {
  const snapshot = versions[versionNumber].snapshot;
  await PATCH /api/pages/:id { snapshot };
};
```

**Impact:** Risky to experiment with edits; hard to undo mid-session

**Recommended Fix:**
- Add undo/redo stack (in-memory for session)
- Diff-based storage (store deltas, not full snapshots)
- Conflict resolution UI (if collaborative)

---

### **Issue 4: Incomplete User Flow for "Improve Structure"**

**Location:** `usePageGeneration.refine()` + UI

**Problem:**
- User can input refinement feedback
- API endpoint exists (`/api/improve-structure`)
- But **workflow unclear:**
  - What happens to old draft? (replaced or merged?)
  - No side-by-side comparison of before/after
  - No automatic re-evaluation after improve
  - User doesn't see what changed

**Current Code:**
```typescript
const refine = useCallback(async () => {
  // Calls improveStructure(selected, refineInput)
  // Returns new PageDraft
  // But: no visual diff, no confirmation
}, []);
```

**Impact:** Users unsure if refinement actually helped; incomplete workflow

**Recommended Fix:**
- Show side-by-side comparison (old vs. new draft)
- Highlight changed sections
- Auto-run Karl evaluation after improve
- Offer "Keep New / Revert" buttons

---

### **Issue 5: Error Recovery Path Not Clear**

**Location:** Page generation errors + queue errors

**Problem:**
- Generation fails → error displayed but:
  - Can user retry? (UI unclear)
  - Does retry use same inputs? (not documented)
  - Can they edit inputs and retry? (design incomplete)
- Queue stops on first error → lost context

**Current Code:**
```typescript
try {
  const page = await generate(topic, userType);
} catch (err) {
  setError(String(err)); // Just displays string
  // No retry button visible
}
```

**Impact:** Users stuck on errors; no self-service recovery path

**Recommended Fix:**
- Show "Retry" button on error state
- Allow editing inputs before retry
- Queue: optionally skip failed items + continue
- Log error context (input, model, token count) for debugging

---

### **Issue 6: Planned Pages Linking Logic Fragile**

**Location:** `usePageGeneration.linkPlannedPage()` callback

**Problem:**
- Planned page → generated page linking via `plannedId` parameter
- Callback: `linkPlannedPage(plannedId, builtPageId)`
- But: race condition if multiple generations race
- No UI feedback if link fails
- Unclear if link persists to database

**Current Code:**
```typescript
type GenerateOverrides = Partial<{
  plannedId: number;
}>;

// Later:
await linkPlannedPage(plannedId, builtPageId);
```

**Impact:** Generated pages may not be properly linked to IA; sync issues

**Recommended Fix:**
- Store plannedPageId in PageDraft entity
- PATCH /api/pages/:id with { plannedPageId }
- Return success/failure to caller
- Show confirmation: "Linked to [Planned Page Name]"

---

## User Workflow Improvements (Priority Order)

### **P1: Queue Resume Capability**

Currently batch generation is fragile. Add persistence:
- [ ] Create `page_queue_runs` table (queueRunId, userId, createdAt, status)
- [ ] Persist queue progress after each item completes
- [ ] UI: "Resume Queue" button if incomplete run detected
- [ ] Benefit: Users can safely batch-generate 100+ pages

### **P2: Error Recovery with Retry**

Generation failures halt user; add recovery:
- [ ] Show "Retry" + "Edit & Retry" buttons on error
- [ ] Store last generation inputs for quick retry
- [ ] Queue: add "Skip" button for failed items (continue with others)
- [ ] Benefit: Self-service recovery; users unblocked

### **P3: Improve Structure Workflow**

Refinement feature incomplete:
- [ ] Side-by-side comparison view (before/after draft)
- [ ] Auto-run Karl evaluation after improve
- [ ] Highlight changes in diff (e.g., green for additions, red for deletions)
- [ ] "Accept / Revert" buttons
- [ ] Benefit: Users confident improvements actually help

### **P4: Context Refactoring**

Hook parameter explosion (22 params):
- [ ] Extract form state → FormContext
- [ ] Extract pages state → PagesContext
- [ ] Extract queue state → QueueContext
- [ ] Reduce hook dependencies; easier to test
- [ ] Benefit: Cleaner code, fewer re-renders, easier mocking

### **P5: Planned Page Linking**

Link logic fragile:
- [ ] Store plannedPageId in PageDraft table
- [ ] Validate link on save (check parent exists)
- [ ] Show "Linked to: [Page Name]" in page preview
- [ ] Benefit: Pages properly organized in IA

### **P6: Undo/Redo in Session**

Users experiment nervously:
- [ ] In-memory undo stack (Ctrl+Z / Cmd+Z)
- [ ] Visual state: "Undo (2), Redo (0)"
- [ ] Sync with version history on save
- [ ] Benefit: Users bold to experiment; less afraid of mistakes

---

## Evidence

- `src/hooks/usePageGeneration.ts`: 22-parameter hook, generation logic
- `src/hooks/useQueueRunner.ts`: queue runner, no persistence
- `src/hooks/useVersionHistory.ts`: version snapshots, rollback
- `src/components/SfGovContentDesignTool.tsx`: tab routing, UI coordination
- `src/services/pageParser.ts`: structured output parsing
- `server.js`: `/api/improve-structure` endpoint definition
- `lib/persistence.js`: page versioning, snapshot retention (50 max)
