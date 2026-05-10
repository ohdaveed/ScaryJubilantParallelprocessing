/**
 * Integration tests for concept-model and build-queue API routes.
 * Requires the Express app to be importable (file-DB mode, no real Anthropic key needed).
 */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
  const mod = await import("../server.js");
  app = mod.app;
});

// ── /api/page-concepts ──────────────────────────────────────────────────────

describe("GET /api/page-concepts", () => {
  it("returns a concepts array", async () => {
    const res = await request(app).get("/api/page-concepts");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("concepts");
    expect(Array.isArray(res.body.concepts)).toBe(true);
  });
});

describe("POST /api/page-concepts", () => {
  it("creates a concept with required fields", async () => {
    const res = await request(app)
      .post("/api/page-concepts")
      .send({
        taskStatement: "Complete the task: Test concept creation",
        canonicalTitle: "Test concept " + Date.now(),
        contentType: "transaction",
        audience: "General public"
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      taskStatement: "Complete the task: Test concept creation",
      contentType: "transaction",
      audience: "General public"
    });
    expect(typeof res.body.id).toBe("number");
  });

  it("rejects when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/page-concepts")
      .send({ taskStatement: "Only task statement, no title" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PATCH /api/page-concepts/:id", () => {
  it("updates an existing concept's fields", async () => {
    const created = await request(app)
      .post("/api/page-concepts")
      .send({
        taskStatement: "Complete the task: Patch test concept",
        canonicalTitle: "Patch test concept " + Date.now(),
        contentType: "information",
        audience: "Property owner / landlord"
      });
    expect(created.status).toBe(200);

    const res = await request(app)
      .patch(`/api/page-concepts/${created.body.id}`)
      .send({ serviceArea: "vector-control", summary: "Updated summary" });

    expect(res.status).toBe(200);
    expect(res.body.serviceArea).toBe("vector-control");
    expect(res.body.summary).toBe("Updated summary");
  });

  it("returns 404 for a non-existent concept id", async () => {
    const res = await request(app)
      .patch("/api/page-concepts/999999")
      .send({ summary: "ghost" });
    expect(res.status).toBe(404);
  });
});

// ── /api/ia-nodes ────────────────────────────────────────────────────────────

describe("GET /api/ia-nodes", () => {
  it("returns a nodes array", async () => {
    const res = await request(app).get("/api/ia-nodes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nodes");
    expect(Array.isArray(res.body.nodes)).toBe(true);
  });

  it("accepts an optional mapId query param", async () => {
    const res = await request(app).get("/api/ia-nodes?mapId=hhvc-working");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.nodes)).toBe(true);
  });
});

// ── /api/page-artifacts ──────────────────────────────────────────────────────

describe("GET /api/page-artifacts", () => {
  it("returns an artifacts array", async () => {
    const res = await request(app).get("/api/page-artifacts");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("artifacts");
    expect(Array.isArray(res.body.artifacts)).toBe(true);
  });
});

// ── /api/build-queue ─────────────────────────────────────────────────────────

describe("GET /api/build-queue", () => {
  it("returns an items array", async () => {
    const res = await request(app).get("/api/build-queue");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe("POST /api/build-queue", () => {
  it("creates a queue item with required topic field", async () => {
    const res = await request(app)
      .post("/api/build-queue")
      .send({ topic: "Prevent mosquitoes", audience: "General public" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ topic: "Prevent mosquitoes", audience: "General public" });
    expect(typeof res.body.id).toBe("number");
  });

  it("rejects when topic is missing", async () => {
    const res = await request(app)
      .post("/api/build-queue")
      .send({ audience: "General public" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PATCH /api/build-queue/:id", () => {
  it("updates queue item status", async () => {
    const created = await request(app)
      .post("/api/build-queue")
      .send({ topic: "Patch queue item " + Date.now(), audience: "General public" });
    expect(created.status).toBe(200);

    const res = await request(app)
      .patch(`/api/build-queue/${created.body.id}`)
      .send({ queueStatus: "generating" });

    expect(res.status).toBe(200);
    expect(res.body.queueStatus).toBe("generating");
  });

  it("returns 404 for a non-existent queue item", async () => {
    const res = await request(app)
      .patch("/api/build-queue/999999")
      .send({ queueStatus: "done" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/build-queue/:id", () => {
  it("deletes an existing queue item and returns ok", async () => {
    const created = await request(app)
      .post("/api/build-queue")
      .send({ topic: "Delete me " + Date.now(), audience: "General public" });
    expect(created.status).toBe(200);

    const res = await request(app).delete(`/api/build-queue/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const list = await request(app).get("/api/build-queue");
    const ids = list.body.items.map((i: any) => i.id);
    expect(ids).not.toContain(created.body.id);
  });
});

// ── /api/health ──────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns ok with db mode and uptime", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.db).toBe("string");
    expect(typeof res.body.uptime).toBe("number");
  });
});
