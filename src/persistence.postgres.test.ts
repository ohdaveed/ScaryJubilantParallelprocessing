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

    if (sql.startsWith("SELECT COUNT(*) FROM reference_examples")) {
      return { rows: [{ count: String(this.referenceExamples.length) }] };
    }

    if (sql.startsWith("INSERT INTO reference_examples")) {
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
