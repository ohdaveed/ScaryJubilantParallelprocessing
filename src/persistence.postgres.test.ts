import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = { rows: any[] };

class FakePool {
  referenceExamples: any[] = [];
  pageConcepts: any[] = [];
  nextPageConceptId = 1;

  async query(text: string, params: any[] = []): Promise<QueryResult> {
    const sql = text.replace(/\s+/g, " ").trim();

    if (
      sql.startsWith("CREATE TABLE") ||
      sql.startsWith("ALTER TABLE") ||
      sql.startsWith("CREATE UNIQUE INDEX")
    ) {
      return { rows: [] };
    }

    // Migration runner tracking queries
    if (sql.startsWith("SELECT COUNT(*) FROM schema_migrations")) {
      return { rows: [{ count: "0" }] }; // always run all migrations in tests
    }
    if (sql.startsWith("SELECT EXISTS")) {
      return { rows: [{ exists: false }] }; // fresh DB — no bootstrap needed
    }
    if (sql.startsWith("SELECT 1 FROM schema_migrations WHERE version")) {
      return { rows: [] }; // all migrations are pending
    }
    if (sql.startsWith("INSERT INTO schema_migrations") || sql.includes("ON CONFLICT DO NOTHING")) {
      return { rows: [] };
    }
    // UPDATE planned_pages (migration 004) — fake pool has no planned_pages table
    if (sql.startsWith("UPDATE planned_pages")) {
      return { rows: [] };
    }

    // Legacy todo-to-build-queue migration; the fake pool does not model todos.
    if (sql.includes("legacy-todos-migration")) {
      return { rows: [] };
    }

    if (sql.startsWith("DROP TABLE IF EXISTS todos")) {
      return { rows: [] };
    }

    if (
      (sql.startsWith("INSERT INTO page_concepts") && params.length === 0) ||
      sql.startsWith("UPDATE page_concepts child") ||
      sql.startsWith("DROP TABLE IF EXISTS planned_pages")
    ) {
      return { rows: [] };
    }

    if (sql.startsWith("SELECT COUNT(*) FROM reference_examples")) {
      return { rows: [{ count: String(this.referenceExamples.length) }] };
    }

    if (sql.startsWith("INSERT INTO reference_examples")) {
      if (params.length > 0) {
        // Parameterized insert (legacy path)
        const row = {
          id: this.referenceExamples.length + 1,
          title: params[0],
          source_system: params[1],
          reference_type: params[2],
          notes: params[3],
          mapped_pattern: params[4],
          reference_map_id: params[5]
        };
        this.referenceExamples.push(row);
        return { rows: [row] };
      }
      // Non-parameterized seed INSERT from migration file (VALUES ... WHERE NOT EXISTS ...)
      if (this.referenceExamples.length === 0) {
        const defaults = [
          { title: "Healthy housing and pests",           source_system: "HHVC reference benchmark", reference_type: "topic_hub",   notes: "Reference-only benchmark for the root HHVC topic structure.",                          mapped_pattern: "Root topic hub",  reference_map_id: "hhvc-reference" },
          { title: "Report a housing or pest problem",    source_system: "HHVC reference benchmark", reference_type: "task_hub",    notes: "Reference-only benchmark for report routing and transaction entry points.",             mapped_pattern: "Action hub",      reference_map_id: "hhvc-reference" },
          { title: "Fix a problem in your building",      source_system: "HHVC reference benchmark", reference_type: "task_hub",    notes: "Reference-only benchmark for post-report lifecycle guidance.",                          mapped_pattern: "Follow-up hub",   reference_map_id: "hhvc-reference" },
          { title: "Prevent pests and health problems",   source_system: "HHVC reference benchmark", reference_type: "task_hub",    notes: "Reference-only benchmark for prevention and educational guidance.",                     mapped_pattern: "Prevention hub",  reference_map_id: "hhvc-reference" },
          { title: "Programs and services",               source_system: "HHVC reference benchmark", reference_type: "service_hub", notes: "Reference-only benchmark for programs, workshops, and service entries.",                mapped_pattern: "Services hub",    reference_map_id: "hhvc-reference" },
          { title: "Tools, fees, and help",               source_system: "HHVC reference benchmark", reference_type: "support_hub", notes: "Reference-only benchmark for tools, payments, and support resources.",                  mapped_pattern: "Support hub",     reference_map_id: "hhvc-reference" },
        ];
        defaults.forEach((d, i) => this.referenceExamples.push({ id: i + 1, ...d }));
      }
      return { rows: [] };
    }

    if (sql.startsWith("SELECT * FROM reference_examples ORDER BY id ASC")) {
      return { rows: [...this.referenceExamples] };
    }

    if (sql === "SELECT * FROM page_concepts") {
      return { rows: [...this.pageConcepts] };
    }

    if (sql.startsWith("SELECT * FROM page_concepts ORDER BY created_at ASC")) {
      return { rows: [...this.pageConcepts] };
    }

    if (sql.startsWith("SELECT * FROM page_concepts WHERE id = $1")) {
      const match = this.pageConcepts.find((row) => String(row.id) === String(params[0]));
      return { rows: match ? [match] : [] };
    }

    if (sql.startsWith("INSERT INTO page_concepts")) {
      const row = {
        id: this.nextPageConceptId++,
        intent_key: params[0],
        task_statement: params[1],
        canonical_title: params[2],
        content_type: params[3],
        audience: params[4],
        service_area: params[5],
        status: params[6],
        summary: params[7],
        parent_concept_id: params[8],
        governance_flags: JSON.parse(params[9]),
        created_at: params[10],
        updated_at: params[11]
      };
      this.pageConcepts.push(row);
      return { rows: [row] };
    }

    if (sql.startsWith("UPDATE page_concepts SET")) {
      const id = params[11];
      const row = this.pageConcepts.find((entry) => String(entry.id) === String(id));
      if (!row) return { rows: [] };
      row.intent_key = params[0];
      row.task_statement = params[1];
      row.canonical_title = params[2];
      row.content_type = params[3];
      row.audience = params[4];
      row.service_area = params[5];
      row.status = params[6];
      row.summary = params[7];
      row.parent_concept_id = params[8];
      row.governance_flags = JSON.parse(params[9]);
      row.updated_at = params[10];
      return { rows: [row] };
    }

    throw new Error(`Unhandled SQL in fake pool: ${sql}`);
  }

  async end() {
    return undefined;
  }
}

vi.mock("pg", () => ({
  default: {
    Pool: FakePool
  }
}));

describe("postgres persistence path", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.DB_FALLBACK_MODE;
    delete process.env.LOCAL_DB_PATH;
    delete process.env.DATABASE_URL;
  });

  it("initializes normalized postgres persistence and seeds reference examples", async () => {
    const { createPersistence } = await import("../lib/persistence.js");
    const store = await createPersistence({
      databaseUrl: "postgresql://example.test/hhvc?sslmode=require"
    });

    expect(store.mode).toBe("postgres");

    const references = await store.listReferenceExamples();
    expect(references).toHaveLength(6);
    expect(references[0]).toEqual(
      expect.objectContaining({
        title: "Healthy housing and pests",
        sourceSystem: "HHVC reference benchmark"
      })
    );
  });

  it("persists serviceArea updates through the postgres concept store", async () => {
    const { createPersistence } = await import("../lib/persistence.js");
    const store = await createPersistence({
      databaseUrl: "postgresql://example.test/hhvc"
    });

    const created = await store.createPageConcept({
      taskStatement: "Complete the task: Report a dead bird",
      canonicalTitle: "Report a dead bird for West Nile Virus testing",
      contentType: "transaction",
      audience: "General public",
      serviceArea: "hhvc",
      status: "canonical",
      summary: "Canonical concept"
    });

    const updated = await store.updatePageConcept(created.id, {
      serviceArea: "vector-control",
      summary: "Updated concept"
    });

    expect(updated?.serviceArea).toBe("vector-control");
    expect(updated?.summary).toBe("Updated concept");

    const concepts = await store.listPageConcepts();
    expect(concepts[0].serviceArea).toBe("vector-control");
  });
});
