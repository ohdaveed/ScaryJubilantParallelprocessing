# Page Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track up to 10 versions per page, enable revert via a history panel, and inject past version context into refine prompts when notes are provided.

**Architecture:** A new `page_versions` table (Postgres) / `page_versions` array (file store) captures a full `PageDraft` snapshot on every generate or refine. Versions are fetched lazily — only when the history panel opens or when a refine request includes notes. The `buildRefineUserPrompt` function is extended to accept and inject version history so Claude can see what was tried and why.

**Tech Stack:** Express.js, PostgreSQL (pg), Node.js file store, React 18 + TypeScript, Vitest + supertest

---

## File Map

| File | Action | What changes |
| ---- | ------ | ------------ |
| `src/types.ts` | Modify | Add `PageVersion` interface |
| `src/server.file-db.test.ts` | Modify | Add version API integration tests |
| `lib/persistence.js` | Modify | `emptyState`, `normalizeState`, `mapVersion`; add `saveVersion`, `getVersions`, `getVersion` to both stores; add `CREATE TABLE page_versions` to `initPostgres` |
| `server.js` | Modify | Extend `POST /api/pages` body; add `GET /api/pages/:id/versions`, `GET /api/pages/:id/versions/:versionId`, `POST /api/pages/:id/restore/:versionId` |
| `src/utils.ts` | Modify | Add `versionsApi`; extend `pagesApi.save` signature |
| `src/constants.ts` | Modify | Extend `buildRefineUserPrompt` to accept optional `versionHistory` |
| `src/App.tsx` | Modify | Import `PageVersion`, `versionsApi`; update `generate()` and `refine()`; add history state + callbacks + History button + HistoryPanel overlay |

---

## Task 1: Add PageVersion type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `PageVersion` interface after `PlannedPage`**

  In `src/types.ts`, after the `PlannedPage` interface (line 174), add:

  ```typescript
  export interface PageVersion {
    id: number;
    pageId: string;
    versionNumber: number;
    data?: PageDraft;
    notes: string | null;
    trigger: 'generate' | 'refine' | 'restore';
    createdAt: string;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/types.ts
  git commit -m "feat: add PageVersion interface"
  ```

---

## Task 2: Write failing integration tests

**Files:**
- Modify: `src/server.file-db.test.ts`

- [ ] **Step 1: Add version test suite to `src/server.file-db.test.ts`**

  Append this block at the end of the file (before the final `}`):

  ```typescript
  describe("page version tracking", () => {
    const pageId = "version-test-page";
    const pageData = {
      id: pageId,
      name: "Version test",
      raw: "Version 1 content",
      createdAt: new Date().toISOString()
    };

    it("saves a version when versionTrigger is provided", async () => {
      const save = await request(app)
        .post("/api/pages")
        .send({ id: pageId, data: pageData, versionNotes: "Initial generation", versionTrigger: "generate" });
      expect(save.status).toBe(200);

      const versions = await request(app).get(`/api/pages/${pageId}/versions`);
      expect(versions.status).toBe(200);
      expect(versions.body.versions).toHaveLength(1);
      expect(versions.body.versions[0].trigger).toBe("generate");
      expect(versions.body.versions[0].notes).toBe("Initial generation");
      expect(versions.body.versions[0].data).toBeUndefined();
    });

    it("returns version data when includeData=true", async () => {
      const versions = await request(app).get(`/api/pages/${pageId}/versions?includeData=true`);
      expect(versions.status).toBe(200);
      expect(versions.body.versions[0].data).toBeDefined();
      expect(versions.body.versions[0].data.name).toBe("Version test");
    });

    it("returns full snapshot from single version endpoint", async () => {
      const list = await request(app).get(`/api/pages/${pageId}/versions`);
      const versionId = list.body.versions[0].id;
      const version = await request(app).get(`/api/pages/${pageId}/versions/${versionId}`);
      expect(version.status).toBe(200);
      expect(version.body.data.name).toBe("Version test");
      expect(version.body.versionNumber).toBe(1);
    });

    it("restores a version and creates a new restore version", async () => {
      const updatedData = { ...pageData, name: "Version 2" };
      await request(app)
        .post("/api/pages")
        .send({ id: pageId, data: updatedData, versionNotes: "Revision", versionTrigger: "refine" });

      const list = await request(app).get(`/api/pages/${pageId}/versions`);
      const oldest = list.body.versions[list.body.versions.length - 1];

      const restore = await request(app).post(`/api/pages/${pageId}/restore/${oldest.id}`);
      expect(restore.status).toBe(200);

      const after = await request(app).get(`/api/pages/${pageId}/versions`);
      expect(after.body.versions).toHaveLength(3);
      expect(after.body.versions[0].trigger).toBe("restore");
    });

    it("enforces 10-version cap", async () => {
      const capPageId = "cap-test-page";
      const capData = { id: capPageId, name: "Cap test", raw: "body", createdAt: new Date().toISOString() };
      for (let i = 0; i < 11; i++) {
        await request(app)
          .post("/api/pages")
          .send({ id: capPageId, data: { ...capData, name: `Version ${i}` }, versionNotes: `v${i}`, versionTrigger: "generate" });
      }
      const versions = await request(app).get(`/api/pages/${capPageId}/versions`);
      expect(versions.body.versions).toHaveLength(10);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  npx vitest run src/server.file-db.test.ts
  ```

  Expected: `page version tracking` suite fails with 404 or similar — version endpoints don't exist yet.

- [ ] **Step 3: Commit**

  ```bash
  git add src/server.file-db.test.ts
  git commit -m "test: add failing integration tests for page versioning"
  ```

---

## Task 3: Extend file store state for versions

**Files:**
- Modify: `lib/persistence.js`

- [ ] **Step 1: Update `emptyState` to include `page_versions`**

  Replace the `emptyState` function (lines 13–25):

  ```javascript
  const emptyState = () => ({
    meta: {
      nextIds: {
        todos: 1,
        planned_pages: 1,
        user_preferences: 1,
        page_versions: 1
      }
    },
    pages: [],
    todos: [],
    planned_pages: [],
    user_preferences: [],
    page_versions: []
  });
  ```

- [ ] **Step 2: Update `normalizeState` to include `page_versions`**

  Replace the `normalizeState` function (lines 27–48):

  ```javascript
  const normalizeState = (state) => {
    const safe = state && typeof state === "object" ? state : {};
    const nextIds = safe.meta?.nextIds || {};
    const pages = Array.isArray(safe.pages) ? safe.pages : [];
    const todos = Array.isArray(safe.todos) ? safe.todos : [];
    const plannedPages = Array.isArray(safe.planned_pages) ? safe.planned_pages : [];
    const userPreferences = Array.isArray(safe.user_preferences) ? safe.user_preferences : [];
    const pageVersions = Array.isArray(safe.page_versions) ? safe.page_versions : [];

    return {
      meta: {
        nextIds: {
          todos: Number(nextIds.todos) || (Math.max(0, ...todos.map((row) => Number(row.id) || 0)) + 1),
          planned_pages: Number(nextIds.planned_pages) || (Math.max(0, ...plannedPages.map((row) => Number(row.id) || 0)) + 1),
          user_preferences: Number(nextIds.user_preferences) || (Math.max(0, ...userPreferences.map((row) => Number(row.id) || 0)) + 1),
          page_versions: Number(nextIds.page_versions) || (Math.max(0, ...pageVersions.map((row) => Number(row.id) || 0)) + 1)
        }
      },
      pages,
      todos,
      planned_pages: plannedPages,
      user_preferences: userPreferences,
      page_versions: pageVersions
    };
  };
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add lib/persistence.js
  git commit -m "feat: extend file store state schema for page versions"
  ```

---

## Task 4: Add version methods to file store

**Files:**
- Modify: `lib/persistence.js`

- [ ] **Step 1: Add `mapVersion` helper after `mapPreference` (line 73)**

  ```javascript
  const mapVersion = (row, includeData = false) => {
    const base = {
      id: row.id,
      pageId: row.page_id,
      versionNumber: row.version_number,
      notes: row.notes,
      trigger: row.trigger,
      createdAt: row.created_at
    };
    return includeData ? { ...base, data: row.data } : base;
  };
  ```

- [ ] **Step 2: Add version methods to `createFileStore` return object**

  Inside the `return { ... }` block of `createFileStore` (before the closing `}`), add after `deletePlannedPage`:

  ```javascript
  async saveVersion(pageId, data, notes, trigger) {
    const existing = state.page_versions.filter(r => r.page_id === pageId);
    const maxNum = existing.length > 0 ? Math.max(...existing.map(r => r.version_number)) : 0;
    const row = {
      id: nextId("page_versions"),
      page_id: pageId,
      version_number: maxNum + 1,
      data: clone(data),
      notes: notes || null,
      trigger,
      created_at: new Date().toISOString()
    };
    state.page_versions.push(row);
    const allForPage = state.page_versions
      .filter(r => r.page_id === pageId)
      .sort((a, b) => a.version_number - b.version_number);
    if (allForPage.length > 10) {
      const toRemove = allForPage[0].id;
      state.page_versions = state.page_versions.filter(r => r.id !== toRemove);
    }
    await persist();
  },
  async getVersions(pageId, { limit, includeData = false } = {}) {
    let versions = state.page_versions
      .filter(r => r.page_id === pageId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(r => mapVersion(r, includeData));
    if (limit) versions = versions.slice(0, limit);
    return versions;
  },
  async getVersion(versionId) {
    const row = state.page_versions.find(r => String(r.id) === String(versionId));
    return row ? mapVersion(row, true) : null;
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add lib/persistence.js
  git commit -m "feat: add saveVersion/getVersions/getVersion to file store"
  ```

---

## Task 5: Add Postgres migration and version methods

**Files:**
- Modify: `lib/persistence.js`

- [ ] **Step 1: Add `page_versions` table to `initPostgres`**

  Inside `initPostgres` (after the `user_preferences` query, before the `ALTER TABLE` line at ~299), add:

  ```javascript
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_versions (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      data JSONB NOT NULL,
      notes TEXT,
      trigger TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  ```

- [ ] **Step 2: Add version methods to `createPostgresStore`**

  Inside the `createPostgresStore(pool)` return object, add after `deletePlannedPage`:

  ```javascript
  async saveVersion(pageId, data, notes, trigger) {
    const next = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_num FROM page_versions WHERE page_id = $1`,
      [pageId]
    );
    const versionNumber = next.rows[0].next_num;
    await pool.query(
      `INSERT INTO page_versions (page_id, version_number, data, notes, trigger) VALUES ($1, $2, $3, $4, $5)`,
      [pageId, versionNumber, JSON.stringify(data), notes || null, trigger]
    );
    await pool.query(
      `DELETE FROM page_versions
       WHERE page_id = $1
         AND id NOT IN (
           SELECT id FROM page_versions WHERE page_id = $1
           ORDER BY version_number DESC LIMIT 10
         )`,
      [pageId]
    );
  },
  async getVersions(pageId, { limit, includeData = false } = {}) {
    const cols = includeData ? "*" : "id, page_id, version_number, notes, trigger, created_at";
    const limitClause = limit ? ` LIMIT ${parseInt(limit)}` : "";
    const result = await pool.query(
      `SELECT ${cols} FROM page_versions WHERE page_id = $1 ORDER BY created_at DESC${limitClause}`,
      [pageId]
    );
    return result.rows.map(row => ({
      id: row.id,
      pageId: row.page_id,
      versionNumber: row.version_number,
      notes: row.notes,
      trigger: row.trigger,
      createdAt: row.created_at,
      ...(includeData ? { data: row.data } : {})
    }));
  },
  async getVersion(versionId) {
    const result = await pool.query("SELECT * FROM page_versions WHERE id = $1", [versionId]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      pageId: row.page_id,
      versionNumber: row.version_number,
      notes: row.notes,
      trigger: row.trigger,
      createdAt: row.created_at,
      data: row.data
    };
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add lib/persistence.js
  git commit -m "feat: add page_versions table migration and Postgres version methods"
  ```

---

## Task 6: Add server version endpoints and wire saveVersion

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Extend `POST /api/pages` to call `saveVersion`**

  Replace the existing `POST /api/pages` handler (lines 550–560):

  ```javascript
  app.post("/api/pages", async (req, res) => {
    const { id, data, versionNotes, versionTrigger } = req.body;
    if (!id || !data) return res.status(400).json({ error: "Missing id or data" });
    try {
      await db.savePage(id, data);
      if (versionTrigger) {
        await db.saveVersion(id, data, versionNotes || null, versionTrigger);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/pages error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
  ```

- [ ] **Step 2: Add three version routes after `PATCH /api/pages/:id/review`**

  After the closing `});` of the `PATCH /api/pages/:id/review` handler (after line ~621), add:

  ```javascript
  app.get("/api/pages/:id/versions", async (req, res) => {
    const { includeData, limit } = req.query;
    try {
      const versions = await db.getVersions(req.params.id, {
        includeData: includeData === "true",
        limit: limit ? parseInt(limit) : undefined
      });
      res.json({ versions });
    } catch (err) {
      console.error("GET /api/pages/:id/versions error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.get("/api/pages/:id/versions/:versionId", async (req, res) => {
    try {
      const version = await db.getVersion(req.params.versionId);
      if (!version) return res.status(404).json({ error: "Version not found" });
      res.json(version);
    } catch (err) {
      console.error("GET /api/pages/:id/versions/:versionId error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });

  app.post("/api/pages/:id/restore/:versionId", async (req, res) => {
    const { id, versionId } = req.params;
    try {
      const version = await db.getVersion(versionId);
      if (!version) return res.status(404).json({ error: "Version not found" });
      await db.savePage(id, version.data);
      await db.saveVersion(id, version.data, `Restored from v${version.versionNumber}`, "restore");
      res.json({ ok: true, data: version.data });
    } catch (err) {
      console.error("POST /api/pages/:id/restore/:versionId error:", getErrorMessage(err));
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
  ```

- [ ] **Step 3: Run tests to verify they pass**

  ```bash
  npx vitest run src/server.file-db.test.ts
  ```

  Expected: all tests in `page version tracking` pass.

- [ ] **Step 4: Commit**

  ```bash
  git add server.js
  git commit -m "feat: add version API endpoints and wire saveVersion into page save"
  ```

---

## Task 7: Add versionsApi and extend pagesApi.save

**Files:**
- Modify: `src/utils.ts`

- [ ] **Step 1: Update `pagesApi.save` to accept optional version info**

  Replace the `save` method inside `pagesApi` (lines ~262–269):

  ```typescript
  save: async (id: string, page: import("./types").PageDraft, version?: { notes: string; trigger: 'generate' | 'refine' | 'restore' }): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        data: page,
        ...(version ? { versionNotes: version.notes, versionTrigger: version.trigger } : {})
      })
    });
    if (!res.ok) throw new Error(`Failed to save page: ${res.status}`);
  },
  ```

- [ ] **Step 2: Add `versionsApi` after `preferencesApi`**

  After the closing `};` of `preferencesApi` (around line 438), add:

  ```typescript
  export const versionsApi = {
    list: async (pageId: string, opts: { limit?: number; includeData?: boolean } = {}): Promise<import("./types").PageVersion[]> => {
      const params = new URLSearchParams();
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      if (opts.includeData) params.set("includeData", "true");
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions${qs}`);
      if (!res.ok) throw new Error(`Failed to load versions: ${res.status}`);
      const data = await res.json();
      return data.versions || [];
    },
    get: async (pageId: string, versionId: number): Promise<import("./types").PageVersion> => {
      const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions/${versionId}`);
      if (!res.ok) throw new Error(`Failed to load version: ${res.status}`);
      return res.json();
    },
    restore: async (pageId: string, versionId: number): Promise<import("./types").PageDraft> => {
      const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/restore/${versionId}`, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to restore version: ${res.status}`);
      const body = await res.json();
      return body.data;
    }
  };
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/utils.ts
  git commit -m "feat: add versionsApi and extend pagesApi.save with version info"
  ```

---

## Task 8: Extend buildRefineUserPrompt

**Files:**
- Modify: `src/constants.ts`

- [ ] **Step 1: Add optional `versionHistory` parameter**

  Replace the `buildRefineUserPrompt` function (lines 497–519):

  ```typescript
  export const buildRefineUserPrompt = (baseRequest: string, versionHistory?: string): string => {
    const historySection = versionHistory
      ? `\n\nPREVIOUS VERSIONS (most recent first — use this to understand what the user is optimizing toward; do not repeat discarded approaches):\n${versionHistory}`
      : "";
    return `${baseRequest}${historySection}

  PROMPT CONTRACT VERSION: ${PROMPT_CONTRACT_VERSION}

  ${INSTRUCTION_PRIORITY_BLOCK}

  ${PROMPT_IMMUTABLE_CONSTRAINTS}

  ${PROMPT_TASK_CONTEXT_RULES}

  ${PROMPT_FIELD_LEVEL_RULES}

  ${PROMPT_SELF_CHECK_RULES}

  IMMUTABLE FIELDS (unless explicitly requested to change):
  - PAGE NAME
  - PAGE TYPE
  - PRIMARY USER
  - Required output headers

  If the request conflicts with immutable fields, keep them unchanged and explain in integration notes.
  `;
  };
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/constants.ts
  git commit -m "feat: extend buildRefineUserPrompt to inject version history context"
  ```

---

## Task 9: Update generate() and refine() in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `PageVersion` to the types import and `versionsApi` to the utils import**

  Replace line 2:
  ```typescript
  import { PageDraft, TodoItem, KarlEvaluation, PlannedPage, UserPreference, PageVersion } from "./types";
  ```

  Replace line 4:
  ```typescript
  import { clean, isPest, parsePage, parseRel, parseStructuredPage, pagesApi, todosApi, plannedPagesApi, preferencesApi, improveStructure, runKarlEvaluation, evaluateQualityGate, lsLegacy, driveApi, skeletonToPageDraft, versionsApi } from "./utils";
  ```

- [ ] **Step 2: Update `generate()` — pass version info to `pagesApi.save`**

  Find the `pagesApi.save` call inside `generate()` (around line 766):
  ```typescript
  try {
    await pagesApi.save(id, page);
  } catch {
  ```

  Replace with:
  ```typescript
  try {
    await pagesApi.save(id, page, { notes: lastInput.current.notes || "", trigger: "generate" });
  } catch {
  ```

- [ ] **Step 3: Update `refine()` — fetch version history and inject into prompt**

  Find the `const msg = buildRefineUserPrompt(` call inside `refine()` (around line 808).

  Replace this block:
  ```typescript
  const msg = buildRefineUserPrompt(
    `Here is the current HHVC SF.gov page draft to revise:\n\n${selected.raw}\n\nPlease make this specific change: ${instruction}\n\nReturn the COMPLETE revised page, preserving all sections not being changed.`
  );
  ```

  With:
  ```typescript
  let versionHistory: string | undefined;
  try {
    const versions = await versionsApi.list(selected.id, { limit: 3, includeData: true });
    if (versions.length > 0) {
      versionHistory = versions
        .map(v => `v${v.versionNumber} notes: "${v.notes || "No notes"}"\n${((v.data as PageDraft).raw || "").trim()}`)
        .join("\n---\n");
    }
  } catch {
    // best-effort — don't block refine if versions unavailable
  }

  const msg = buildRefineUserPrompt(
    `Here is the current HHVC SF.gov page draft to revise:\n\n${selected.raw}\n\nPlease make this specific change: ${instruction}\n\nReturn the COMPLETE revised page, preserving all sections not being changed.`,
    versionHistory
  );
  ```

- [ ] **Step 4: Update `refine()` — pass version info to `pagesApi.save`**

  Find the `pagesApi.save` call inside `refine()` (around line 888):
  ```typescript
  try { await pagesApi.save(selected.id, updated); } catch { setError("Revised but could not save."); }
  ```

  Replace with:
  ```typescript
  try { await pagesApi.save(selected.id, updated, { notes: instruction, trigger: "refine" }); } catch { setError("Revised but could not save."); }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat: wire version capture and history injection into generate/refine"
  ```

---

## Task 10: Add HistoryPanel UI

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add history state variables**

  After the `driveLoadingIds` state declaration (around line 429), add:

  ```typescript
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const [historyVersions, setHistoryVersions] = useState<PageVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  ```

- [ ] **Step 2: Add `openHistory` and `restoreVersion` callbacks**

  After the `deletePage` function (around line 903), add:

  ```typescript
  const openHistory = useCallback(async (pageId: string) => {
    setHistoryPageId(pageId);
    setHistoryLoading(true);
    try {
      const versions = await versionsApi.list(pageId);
      setHistoryVersions(versions);
    } catch {
      setHistoryVersions([]);
    }
    setHistoryLoading(false);
  }, []);

  const restoreVersion = useCallback(async (pageId: string, versionId: number, versionNumber: number) => {
    if (!window.confirm(`Restore v${versionNumber}? This will replace the current page content. The current state will be saved as a new version automatically.`)) return;
    try {
      const restoredData = await versionsApi.restore(pageId, versionId);
      setPages(prev => prev.map(p => p.id === pageId ? restoredData : p));
      if (selected?.id === pageId) setSelected(restoredData);
      setHistoryPageId(null);
    } catch {
      alert("Failed to restore version. Please try again.");
    }
  }, [selected]);
  ```

- [ ] **Step 3: Add History button next to Regenerate button**

  Find the Regenerate button (around line 1302):
  ```tsx
  {!selected.skeleton && <Btn onClick={() => regenerate(selected)} variant="ghost" size="sm">Regenerate</Btn>}
  ```

  Replace with:
  ```tsx
  {!selected.skeleton && <Btn onClick={() => regenerate(selected)} variant="ghost" size="sm">Regenerate</Btn>}
  {!selected.skeleton && <Btn onClick={() => openHistory(selected.id)} variant="ghost" size="sm">History</Btn>}
  ```

- [ ] **Step 4: Add HistoryPanel overlay**

  Find the closing `</div>` of the App component's return JSX (near the very end of the file). Add the panel just before it:

  ```tsx
  {historyPageId && (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={() => setHistoryPageId(null)}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div
        style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, background: "var(--color-background-primary)", borderLeft: "0.5px solid var(--color-border-secondary)", display: "flex", flexDirection: "column", zIndex: 101 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Version History</span>
          <button onClick={() => setHistoryPageId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-tertiary)", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {historyLoading ? (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", paddingTop: 24 }}>Loading…</p>
          ) : historyVersions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", paddingTop: 24 }}>No versions saved yet.</p>
          ) : historyVersions.map(v => (
            <div key={v.id} style={{ marginBottom: 12, padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>v{v.versionNumber}</span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 8,
                  background: v.trigger === "generate" ? "#E1F5EE" : v.trigger === "restore" ? "#E6F1FB" : "#FAEEDA",
                  color: v.trigger === "generate" ? "#0F6E56" : v.trigger === "restore" ? "#185FA5" : "#854F0B"
                }}>{v.trigger}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>
                  {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {v.notes && (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                  {v.notes}
                </p>
              )}
              <Btn onClick={() => restoreVersion(historyPageId, v.id, v.versionNumber)} variant="ghost" size="sm">Restore this version</Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}
  ```

- [ ] **Step 5: Run tests to confirm nothing regressed**

  ```bash
  npx vitest run src/server.file-db.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat: add HistoryPanel UI for page version browsing and restore"
  ```

---

## Verification Checklist

End-to-end manual testing in the browser (run `npm run dev`):

- [ ] Generate a page → open DevTools Network → `POST /api/pages` body contains `versionTrigger: "generate"`
- [ ] `GET /api/pages/<id>/versions` returns 1 version with `trigger: "generate"`
- [ ] Refine a page with notes → version panel shows 2 entries; `trigger: "refine"` entry shows the instruction as notes
- [ ] Refine a page **without** notes → no `GET /api/pages/:id/versions` call appears in Network tab
- [ ] Open History button → panel slides in with timestamps and trigger badges
- [ ] Click "Restore this version" → confirm dialog → page content reverts → new version appears with `trigger: "restore"`
- [ ] Generate/refine 11 times on the same page → History panel shows exactly 10 entries
- [ ] Set `DB_FALLBACK_MODE=file`, repeat generate + refine + restore → versions persist in `.local/hhvc-local-db.json`
