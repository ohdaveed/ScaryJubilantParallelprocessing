import { rm } from "node:fs/promises";
import { join } from "node:path";
import { PAGE_VERSION_RETENTION } from "../lib/persistence.js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let app: any;
const storagePath = join(process.cwd(), ".local", "server-file-db.test.json");

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
  process.env.DB_FALLBACK_MODE = "file";
  process.env.LOCAL_DB_PATH = storagePath;
  process.env.DATABASE_URL = "postgresql://127.0.0.1:1/unreachable";

  await rm(storagePath, { force: true });
  vi.resetModules();

  const mod = await import("../server.js");
  app = mod.app;
});

afterAll(async () => {
  await rm(storagePath, { force: true });
  delete process.env.DB_FALLBACK_MODE;
  delete process.env.LOCAL_DB_PATH;
});

describe("file-backed fallback persistence", () => {
  it("stores pages when postgres is unavailable", async () => {
    const empty = await request(app).get("/api/pages");
    expect(empty.status).toBe(200);
    expect(empty.body.pages).toEqual([]);

    const draft = {
      id: "page-1",
      name: "Test page",
      raw: "Draft body",
      createdAt: "2026-04-17T00:00:00.000Z"
    };

    const save = await request(app).post("/api/pages").send({ id: draft.id, data: draft });
    expect(save.status).toBe(200);
    expect(save.body).toEqual({ ok: true });

    const loaded = await request(app).get("/api/pages");
    expect(loaded.status).toBe(200);
    expect(loaded.body.pages).toEqual([draft]);
  });

  it("stores planned pages, todos, and preferences in fallback mode", async () => {
    const createdPlan = await request(app)
      .post("/api/planned-pages")
      .send({ name: "Plan A", pageType: "Topic", userType: "Tenant", parentId: null });
    expect(createdPlan.status).toBe(200);
    expect(createdPlan.body.name).toBe("Plan A");

    const planned = await request(app).get("/api/planned-pages");
    expect(planned.status).toBe(200);
    expect(planned.body.plannedPages).toHaveLength(1);
    expect(planned.body.plannedPages[0].name).toBe("Plan A");

    const createdTodo = await request(app).post("/api/todos").send({ topic: "Follow up", userType: "Tenant" });
    expect(createdTodo.status).toBe(200);
    expect(createdTodo.body.topic).toBe("Follow up");

    const toggledTodo = await request(app)
      .patch(`/api/todos/${createdTodo.body.id}`)
      .send({ done: true });
    expect(toggledTodo.status).toBe(200);
    expect(toggledTodo.body.done).toBe(true);

    const todos = await request(app).get("/api/todos");
    expect(todos.status).toBe(200);
    expect(todos.body.todos).toHaveLength(1);
    expect(todos.body.todos[0].done).toBe(true);

    const createdPreference = await request(app)
      .post("/api/preferences")
      .send({ preference: "Use short summaries", source: "manual", page_id: "page-1" });
    expect(createdPreference.status).toBe(200);
    expect(createdPreference.body.preference).toBe("Use short summaries");

    const preferences = await request(app).get("/api/preferences?page_id=page-1");
    expect(preferences.status).toBe(200);
    expect(preferences.body.preferences).toHaveLength(1);
    expect(preferences.body.preferences[0].pageId).toBe("page-1");
  });
});

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

  it("enforces version retention cap", async () => {
    const capPageId = "cap-test-page";
    const capData = { id: capPageId, name: "Cap test", raw: "body", createdAt: new Date().toISOString() };
    const retention = PAGE_VERSION_RETENTION;
    for (let i = 0; i < retention + 1; i++) {
      await request(app)
        .post("/api/pages")
        .send({ id: capPageId, data: { ...capData, name: `Version ${i}` }, versionNotes: `v${i}`, versionTrigger: "generate" });
    }
    const versions = await request(app).get(`/api/pages/${capPageId}/versions`);
    expect(versions.body.versions).toHaveLength(retention);
  });

  it("includes currentVersionNumber on list when versions exist", async () => {
    const list = await request(app).get("/api/pages");
    expect(list.status).toBe(200);
    const cap = list.body.pages.find((p) => p.id === "cap-test-page");
    expect(cap?.currentVersionNumber).toBe(PAGE_VERSION_RETENTION + 1);
  });
});
