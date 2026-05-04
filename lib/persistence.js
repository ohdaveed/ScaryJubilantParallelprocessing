import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pkg from "pg";

const { Pool } = pkg;

const DEFAULT_LOCAL_DB_PATH = ".local/hhvc-local-db.json";

/** Max snapshots kept per page; oldest are dropped after each new version. */
export const PAGE_VERSION_RETENTION = 50;

const clone = (value) => JSON.parse(JSON.stringify(value));

/** Strip fields only used on list API responses; never persist them. */
const stripEphemeralPageFields = (data) => {
  if (!data || typeof data !== "object") return data;
  const next = clone(data);
  delete next.currentVersionNumber;
  return next;
};
const byCreatedAsc = (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
const byCreatedDesc = (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const PLAN_PAGE_RENAMES = new Map([
  ["Get help with pests, mold, and trash", { name: "Healthy housing and pests", pageType: "Topic", userType: "General public" }],
  ["Help with pests and bugs", { name: "Prevent pests and health problems", pageType: "Information", userType: "General public" }],
  ["Help with mold and water", { name: "Reduce indoor moisture and prevent mold (not leaks)", pageType: "Information", userType: "Resident / tenant" }],
  ["Help with trash and messes", { name: "Report garbage or dirty conditions", pageType: "Transaction", userType: "Resident / tenant" }],
  ["Help with plants and weeds", { name: "Report overgrown plants or weeds that attract pests", pageType: "Transaction", userType: "General public" }],
  ["Pay your annual building fee", { name: "Pay your healthy housing fee for buildings with 3 or more units", pageType: "Transaction", userType: "Property owner / landlord" }],
  ["Fee deadlines and late costs", { name: "Fees and payments", pageType: "Information", userType: "Property owner / landlord" }],
  ["Fixing a violation", { name: "What owners need to do after getting a notice of violation", pageType: "Information", userType: "Property owner / landlord" }],
  ["Owner rules for buildings with 3+ units", { name: "About the healthy housing program and inspections", pageType: "Information", userType: "Property owner / landlord" }],
  ["Learn how to stop mosquitoes", { name: "Prevent mosquitoes by removing standing water", pageType: "Information", userType: "General public" }],
  ["Mosquito classes for schools", { name: "Request a mosquito education workshop for students", pageType: "Transaction", userType: "General public" }],
  ["Report a dead bird", { name: "Report a dead bird for West Nile Virus testing", pageType: "Transaction", userType: "General public" }],
  ["Contact HHVC", { name: "Contact healthy housing and vector control", pageType: "Information", userType: "General public" }]
]);

const normalizePlannedPage = (row) => {
  if (!row || typeof row !== "object") return row;
  const rename = PLAN_PAGE_RENAMES.get(row.name);
  if (!rename) return row;
  return {
    ...row,
    name: rename.name,
    page_type: rename.pageType || row.page_type,
    user_type: rename.userType || row.user_type
  };
};

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

const normalizeState = (state) => {
  const safe = state && typeof state === "object" ? state : {};
  const nextIds = safe.meta?.nextIds || {};
  const pages = Array.isArray(safe.pages) ? safe.pages : [];
  const todos = Array.isArray(safe.todos) ? safe.todos : [];
  const plannedPages = Array.isArray(safe.planned_pages) ? safe.planned_pages.map(normalizePlannedPage) : [];
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

const mapTodo = (row) => ({
  id: row.id,
  topic: row.topic,
  userType: row.user_type,
  done: row.done,
  status: row.status || "pending",
  errorMessage: row.error_message || null,
  builtPageId: row.built_page_id || null,
  karlGrade: row.karl_grade || null,
  plannedId: row.planned_id != null ? Number(row.planned_id) : null
});

const mapPlannedPage = (row) => ({
  id: row.id,
  name: row.name,
  pageType: row.page_type,
  userType: row.user_type,
  parentId: row.parent_id,
  builtPageId: row.built_page_id,
  createdAt: row.created_at
});

const mapPreference = (row) => ({
  id: row.id,
  preference: row.preference,
  source: row.source,
  pageId: row.page_id,
  createdAt: row.created_at
});

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

export const formatPersistenceError = (error) => {
  if (!error) return "Unknown persistence error";

  const parts = [];
  if (error.message) parts.push(error.message);
  if (error.code) parts.push(`code=${error.code}`);

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    parts.push(
      error.errors
        .map((entry) => entry?.message || [entry?.code, entry?.address, entry?.port].filter(Boolean).join(" "))
        .filter(Boolean)
        .join("; ")
    );
  }

  return parts.join(" | ") || String(error);
};

const createFileStore = async (filePath = DEFAULT_LOCAL_DB_PATH) => {
  const resolvedPath = resolve(filePath || DEFAULT_LOCAL_DB_PATH);
  await mkdir(dirname(resolvedPath), { recursive: true });

  let state = emptyState();
  let needsPersist = false;

  try {
    const parsed = JSON.parse(await readFile(resolvedPath, "utf8"));
    state = normalizeState(parsed);
    needsPersist = JSON.stringify(state) !== JSON.stringify(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  }

  if (needsPersist) {
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  }

  const persist = async () => {
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  };

  const nextId = (key) => {
    const id = state.meta.nextIds[key] || 1;
    state.meta.nextIds[key] = id + 1;
    return id;
  };

  return {
    mode: "file",
    location: resolvedPath,
    async listPreferences(pageId) {
      return state.user_preferences
        .filter((row) => (pageId ? row.page_id === pageId : row.page_id == null))
        .sort(byCreatedDesc)
        .map(mapPreference);
    },
    async createPreference(preference, source, pageId) {
      const row = {
        id: nextId("user_preferences"),
        preference,
        source,
        page_id: pageId ?? null,
        created_at: new Date().toISOString()
      };
      state.user_preferences.push(row);
      await persist();
      return mapPreference(row);
    },
    async deletePreference(id) {
      state.user_preferences = state.user_preferences.filter((row) => String(row.id) !== String(id));
      await persist();
    },
    async listPages() {
      const maxByPage = new Map();
      for (const r of state.page_versions) {
        const pid = r.page_id;
        const n = r.version_number;
        const prev = maxByPage.get(pid);
        if (prev == null || n > prev) maxByPage.set(pid, n);
      }
      return state.pages
        .slice()
        .sort(byCreatedAsc)
        .map((row) => {
          const data = clone(row.data);
          const max = maxByPage.get(row.id);
          if (max != null && max > 0) data.currentVersionNumber = max;
          return data;
        });
    },
    async savePage(id, data) {
      const payload = stripEphemeralPageFields(data);
      const existing = state.pages.find((row) => row.id === id);
      if (existing) {
        existing.data = payload;
      } else {
        state.pages.push({
          id,
          data: payload,
          created_at: payload?.createdAt || new Date().toISOString()
        });
      }
      await persist();
    },
    async deletePage(id) {
      state.pages = state.pages.filter((row) => row.id !== id);
      state.page_versions = state.page_versions.filter((row) => row.page_id !== id);
      await persist();
    },
    async listPageNames() {
      return state.pages.map((row) => ({ name: row.data?.name || "" }));
    },
    async insertImportedPage(id, data, createdAt) {
      state.pages.push({
        id,
        data: stripEphemeralPageFields(data),
        created_at: createdAt || data?.createdAt || new Date().toISOString()
      });
      await persist();
    },
    async updatePageReview(id, status) {
      const row = state.pages.find((entry) => entry.id === id);
      if (!row) return null;
      row.data = {
        ...stripEphemeralPageFields(row.data),
        reviewStatus: status
      };
      await persist();
      return clone(row.data);
    },
    async listTodos() {
      return state.todos
        .slice()
        .sort(byCreatedAsc)
        .map(mapTodo);
    },
    async createTodo(topic, userType, { plannedId } = {}) {
      const row = {
        id: nextId("todos"),
        topic,
        user_type: userType,
        done: false,
        created_at: new Date().toISOString(),
        ...(plannedId != null ? { planned_id: plannedId } : {})
      };
      state.todos.push(row);
      await persist();
      return mapTodo(row);
    },
    async updateTodo(id, done) {
      const row = state.todos.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      row.done = done;
      await persist();
      return mapTodo(row);
    },
    async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
      const row = state.todos.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      if (status !== undefined) row.status = status;
      if (errorMessage !== undefined) row.error_message = errorMessage;
      if (builtPageId !== undefined) row.built_page_id = builtPageId;
      if (karlGrade !== undefined) row.karl_grade = karlGrade;
      await persist();
      return mapTodo(row);
    },
    async deleteTodo(id) {
      state.todos = state.todos.filter((row) => String(row.id) !== String(id));
      await persist();
    },
    async listPlannedPages() {
      return state.planned_pages
        .slice()
        .sort(byCreatedAsc)
        .map(mapPlannedPage);
    },
    async getPlannedPage(id) {
      const row = state.planned_pages.find((entry) => String(entry.id) === String(id));
      return row ? mapPlannedPage(row) : null;
    },
    async createPlannedPage(name, pageType, userType, parentId) {
      const row = {
        id: nextId("planned_pages"),
        name,
        page_type: pageType,
        user_type: userType,
        parent_id: parentId ?? null,
        built_page_id: null,
        created_at: new Date().toISOString()
      };
      state.planned_pages.push(row);
      await persist();
      return mapPlannedPage(row);
    },
    async updatePlannedPage(id, patch) {
      const row = state.planned_pages.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.pageType !== undefined) row.page_type = patch.pageType;
      if (patch.userType !== undefined) row.user_type = patch.userType;
      if (patch.parentId !== undefined) row.parent_id = patch.parentId;
      if (patch.builtPageId !== undefined) row.built_page_id = patch.builtPageId;
      await persist();
      return mapPlannedPage(row);
    },
    async deletePlannedPage(id) {
      state.planned_pages = state.planned_pages.filter((row) => String(row.id) !== String(id));
      state.planned_pages.forEach((row) => {
        if (String(row.parent_id) === String(id)) {
          row.parent_id = null;
        }
      });
      await persist();
    },
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
      const forPage = state.page_versions
        .filter(r => r.page_id === pageId)
        .sort((a, b) => a.version_number - b.version_number);
      if (forPage.length > PAGE_VERSION_RETENTION) {
        const toDrop = forPage.slice(0, forPage.length - PAGE_VERSION_RETENTION);
        const dropIds = new Set(toDrop.map((r) => r.id));
        state.page_versions = state.page_versions.filter((r) => !dropIds.has(r.id));
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
  };
};

const initPostgres = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      topic TEXT NOT NULL,
      user_type TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS error_message TEXT`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS built_page_id TEXT`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS karl_grade TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planned_pages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      page_type TEXT NOT NULL,
      user_type TEXT NOT NULL,
      parent_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL,
      built_page_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS planned_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      preference TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      page_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS page_id TEXT
  `);
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
};

const createPostgresStore = (pool) => ({
  mode: "postgres",
  async listPreferences(pageId) {
    const result = pageId
      ? await pool.query("SELECT * FROM user_preferences WHERE page_id = $1 ORDER BY created_at DESC", [pageId])
      : await pool.query("SELECT * FROM user_preferences WHERE page_id IS NULL ORDER BY created_at DESC");
    return result.rows.map(mapPreference);
  },
  async createPreference(preference, source, pageId) {
    const result = await pool.query(
      "INSERT INTO user_preferences (preference, source, page_id) VALUES ($1, $2, $3) RETURNING *",
      [preference, source, pageId ?? null]
    );
    return mapPreference(result.rows[0]);
  },
  async deletePreference(id) {
    await pool.query("DELETE FROM user_preferences WHERE id = $1", [id]);
  },
  async listPages() {
    const result = await pool.query(`
      SELECT p.id AS page_id, p.data AS data, COALESCE(m.max_vn, 0)::int AS max_version
      FROM pages p
      LEFT JOIN (
        SELECT page_id, MAX(version_number) AS max_vn
        FROM page_versions
        GROUP BY page_id
      ) m ON m.page_id = p.id
      ORDER BY p.created_at ASC
    `);
    return result.rows.map((row) => {
      const raw = row.data;
      const data = typeof raw === "string" ? JSON.parse(raw) : clone(raw);
      if (row.max_version > 0) data.currentVersionNumber = row.max_version;
      return data;
    });
  },
  async savePage(id, data) {
    const payload = stripEphemeralPageFields(data);
    await pool.query(
      "INSERT INTO pages (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, JSON.stringify(payload)]
    );
  },
  async deletePage(id) {
    await pool.query("DELETE FROM pages WHERE id = $1", [id]);
  },
  async listPageNames() {
    const result = await pool.query("SELECT data->>'name' AS name FROM pages");
    return result.rows;
  },
  async insertImportedPage(id, data, createdAt) {
    const payload = stripEphemeralPageFields(data);
    await pool.query(
      "INSERT INTO pages (id, data, created_at) VALUES ($1, $2, $3)",
      [id, JSON.stringify(payload), createdAt]
    );
  },
  async updatePageReview(id, status) {
    const result = await pool.query(
      "UPDATE pages SET data = data || $1::jsonb WHERE id = $2 RETURNING data",
      [JSON.stringify({ reviewStatus: status }), id]
    );
    return result.rows[0]?.data || null;
  },
  async listTodos() {
    const result = await pool.query("SELECT * FROM todos ORDER BY created_at ASC");
    return result.rows.map(mapTodo);
  },
  async createTodo(topic, userType, { plannedId } = {}) {
    const result =
      plannedId != null
        ? await pool.query(
            "INSERT INTO todos (topic, user_type, planned_id) VALUES ($1, $2, $3) RETURNING *",
            [topic, userType, plannedId]
          )
        : await pool.query("INSERT INTO todos (topic, user_type) VALUES ($1, $2) RETURNING *", [topic, userType]);
    return mapTodo(result.rows[0]);
  },
  async updateTodo(id, done) {
    const result = await pool.query(
      "UPDATE todos SET done = $1 WHERE id = $2 RETURNING *",
      [done, id]
    );
    return result.rows[0] ? mapTodo(result.rows[0]) : null;
  },
  async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
    const columns = [];
    const values = [];
    let i = 1;
    if (status !== undefined) {
      columns.push(`status = $${i++}`);
      values.push(status);
    }
    if (errorMessage !== undefined) {
      columns.push(`error_message = $${i++}`);
      values.push(errorMessage);
    }
    if (builtPageId !== undefined) {
      columns.push(`built_page_id = $${i++}`);
      values.push(builtPageId);
    }
    if (karlGrade !== undefined) {
      columns.push(`karl_grade = $${i++}`);
      values.push(karlGrade);
    }
    if (columns.length === 0) return null;
    values.push(id);
    const result = await pool.query(
      `UPDATE todos SET ${columns.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0] ? mapTodo(result.rows[0]) : null;
  },
  async deleteTodo(id) {
    await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  },
  async listPlannedPages() {
    const result = await pool.query("SELECT * FROM planned_pages ORDER BY created_at ASC");
    return result.rows.map(mapPlannedPage);
  },
  async getPlannedPage(id) {
    const result = await pool.query("SELECT * FROM planned_pages WHERE id = $1", [id]);
    return result.rows[0] ? mapPlannedPage(result.rows[0]) : null;
  },
  async createPlannedPage(name, pageType, userType, parentId) {
    const result = await pool.query(
      "INSERT INTO planned_pages (name, page_type, user_type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, pageType, userType, parentId ?? null]
    );
    return mapPlannedPage(result.rows[0]);
  },
  async updatePlannedPage(id, patch) {
    const fields = [];
    const values = [];
    let index = 1;

    if (patch.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(patch.name);
    }
    if (patch.pageType !== undefined) {
      fields.push(`page_type = $${index++}`);
      values.push(patch.pageType);
    }
    if (patch.userType !== undefined) {
      fields.push(`user_type = $${index++}`);
      values.push(patch.userType);
    }
    if (patch.parentId !== undefined) {
      fields.push(`parent_id = $${index++}`);
      values.push(patch.parentId);
    }
    if (patch.builtPageId !== undefined) {
      fields.push(`built_page_id = $${index++}`);
      values.push(patch.builtPageId);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE planned_pages SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`,
      values
    );
    return result.rows[0] ? mapPlannedPage(result.rows[0]) : null;
  },
  async deletePlannedPage(id) {
    await pool.query("DELETE FROM planned_pages WHERE id = $1", [id]);
  },
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
           ORDER BY version_number DESC LIMIT $2
         )`,
      [pageId, PAGE_VERSION_RETENTION]
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
});

export const createPersistence = async ({
  databaseUrl = process.env.DATABASE_URL,
  fallbackMode = process.env.DB_FALLBACK_MODE,
  localPath = process.env.LOCAL_DB_PATH
} = {}) => {
  if (fallbackMode === "file" || !databaseUrl?.trim()) {
    const store = await createFileStore(localPath);
    console.warn(`Using file-backed persistence at ${store.location}`);
    return store;
  }

  let effectiveDatabaseUrl = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);
    const sslMode = parsed.searchParams.get("sslmode");
    const useLibpqCompat = parsed.searchParams.get("uselibpqcompat");
    if (
      (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") &&
      useLibpqCompat !== "true"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
      effectiveDatabaseUrl = parsed.toString();
    }
  } catch {
    // Keep the original value if DATABASE_URL is not a fully parseable URL.
  }

  const pool = new Pool({
    connectionString: effectiveDatabaseUrl,
    connectionTimeoutMillis: 3000
  });

  try {
    await initPostgres(pool);
    console.log("Database tables ready");
    return createPostgresStore(pool);
  } catch (error) {
    console.error("DB init error:", formatPersistenceError(error));
    await pool.end().catch(() => {});
    const store = await createFileStore(localPath);
    console.warn(`Postgres unavailable, using file-backed persistence at ${store.location}`);
    return store;
  }
};
