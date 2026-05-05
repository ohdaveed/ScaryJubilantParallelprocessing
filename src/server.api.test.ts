import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import packageJson from "../package.json";

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
  const mod = await import("../server.js");
  app = mod.app;
});

describe("API validation guards", () => {
  it("declares and imports server validation dependencies", async () => {
    expect(packageJson.dependencies?.zod).toBeDefined();
    expect(packageJson.dependencies?.["express-rate-limit"]).toBeDefined();

    const zod = await import("zod");
    const expressRateLimit = await import("express-rate-limit");

    expect(zod.object).toBeDefined();
    expect(expressRateLimit.default).toBeDefined();
  });

  it("rejects invalid /api/chat payloads", async () => {
    const res = await request(app).post("/api/chat").send({ foo: "bar" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid request body");
  });

  it("rejects missing draft for /api/evaluate", async () => {
    const res = await request(app).post("/api/evaluate").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing draft");
  });

  it("rejects invalid /api/improve-structure payload", async () => {
    const res = await request(app).post("/api/improve-structure").send({ raw: "", preferences: "bad" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid /api/karl-remediate payload", async () => {
    const res = await request(app).post("/api/karl-remediate").send({ raw: "" });
    expect(res.status).toBe(400);
  });

  it("rejects cross-page version restore attempts", async () => {
    const pageA = `test_page_a_${Date.now()}`;
    const pageB = `test_page_b_${Date.now()}`;
    const dataA = { id: pageA, name: "Page A", createdAt: new Date().toISOString() };
    const dataB = { id: pageB, name: "Page B", createdAt: new Date().toISOString() };

    await request(app).post("/api/pages").send({
      id: pageA,
      data: dataA,
      versionTrigger: "generate",
      versionNotes: "seed A"
    });
    await request(app).post("/api/pages").send({
      id: pageB,
      data: dataB,
      versionTrigger: "generate",
      versionNotes: "seed B"
    });

    const versionsA = await request(app).get(`/api/pages/${encodeURIComponent(pageA)}/versions`);
    expect(versionsA.status).toBe(200);
    expect(Array.isArray(versionsA.body.versions)).toBe(true);
    expect(versionsA.body.versions.length).toBeGreaterThan(0);

    const versionAId = versionsA.body.versions[0].id;
    const crossRestore = await request(app).post(
      `/api/pages/${encodeURIComponent(pageB)}/restore/${versionAId}`
    );

    expect(crossRestore.status).toBe(404);
    expect(crossRestore.body.error).toContain("Version not found for page");
  });

  it("rejects invalid planned-page parent assignments", async () => {
    const suffix = Date.now();
    const root = await request(app).post("/api/planned-pages").send({
      name: `Root ${suffix}`,
      pageType: "Information",
      userType: "General public"
    });
    const child = await request(app).post("/api/planned-pages").send({
      name: `Child ${suffix}`,
      pageType: "Information",
      userType: "General public",
      parentId: root.body.id
    });
    const grandchild = await request(app).post("/api/planned-pages").send({
      name: `Grandchild ${suffix}`,
      pageType: "Information",
      userType: "General public",
      parentId: child.body.id
    });

    const cycleAttempt = await request(app)
      .patch(`/api/planned-pages/${root.body.id}`)
      .send({ parentId: grandchild.body.id });
    expect(cycleAttempt.status).toBe(400);
    expect(cycleAttempt.body.error).toContain("cycle");

    const missingParentAttempt = await request(app)
      .patch(`/api/planned-pages/${child.body.id}`)
      .send({ parentId: 99999999 });
    expect(missingParentAttempt.status).toBe(400);
    expect(missingParentAttempt.body.error).toContain("Parent not found");
  });
});
