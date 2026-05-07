import request from "supertest";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  chatRequestSchema,
  evaluateRequestSchema,
  improveStructureRequestSchema,
  parseRequestBody
} from "../lib/requestSchemas.js";
import packageJson from "../package.json";

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
  const mod = await import("../server.js");
  app = mod.app;
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("validates request schemas in process", () => {
    expect(chatRequestSchema.safeParse({
      model: "  claude  ",
      messages: [{ role: "user", content: "Hello" }]
    }).success).toBe(true);
    expect(chatRequestSchema.safeParse({
      model: "   ",
      messages: [{ role: "user", content: "Hello" }]
    }).success).toBe(false);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: {}
    }).success).toBe(false);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: [{ role: "user" }]
    }).success).toBe(false);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
    }).success).toBe(true);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: [{ role: "user", content: [{ type: "text" }] }]
    }).success).toBe(false);

    expect(evaluateRequestSchema.safeParse({
      draft: "  Valid draft  ",
      pageName: "Page",
      pageType: "Information",
      userType: "General public"
    }).success).toBe(true);
    expect(evaluateRequestSchema.safeParse({
      draft: "   "
    }).success).toBe(false);

    expect(improveStructureRequestSchema.safeParse({
      raw: "  Valid raw content  ",
      evaluationFeedback: {}
    }).success).toBe(true);
    expect(improveStructureRequestSchema.safeParse({
      raw: "Valid raw content",
      evaluationFeedback: "bad"
    }).success).toBe(false);
    expect(improveStructureRequestSchema.safeParse({
      raw: "Valid raw content",
      evaluationFeedback: { warnings: "bad" }
    }).success).toBe(false);
    expect(improveStructureRequestSchema.safeParse({
      raw: "Valid raw content",
      preferences: "bad"
    }).success).toBe(false);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: [{ role: "user", content: "Hello" }],
      images: [{ base64: "abc123", mimeType: "image/png" }]
    }).success).toBe(true);
    expect(chatRequestSchema.safeParse({
      model: "claude",
      messages: [{ role: "user", content: "Hello" }],
      images: [{ foo: "bar" }, null]
    }).success).toBe(false);
  });

  it("parses request bodies in process", () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    const parsed = parseRequestBody(
      chatRequestSchema,
      { body: { model: "  claude  ", messages: [{ role: "user", content: "Hello" }], extra: "keep me" } },
      res as any,
      "/api/chat"
    );

    expect(parsed).toEqual({ model: "  claude  ", messages: [{ role: "user", content: "Hello" }], extra: "keep me" });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    const evaluateParsed = parseRequestBody(
      evaluateRequestSchema,
      { body: { draft: "  Valid draft  ", extra: "keep me too" } },
      res as any,
      "/api/evaluate"
    );

    expect(evaluateParsed).toEqual({ draft: "  Valid draft  ", extra: "keep me too" });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();

    const invalid = parseRequestBody(
      improveStructureRequestSchema,
      { body: { raw: "Valid raw content", evaluationFeedback: "bad" } },
      res as any,
      "/api/improve-structure"
    );

    expect(invalid).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid request body for /api/improve-structure"
    });
  });

  it("rejects invalid /api/chat payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("mock upstream failure"))
    );

    const res = await request(app).post("/api/chat").send({
      model: "   ",
      messages: [{ role: "user", content: "Hello" }]
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body for /api/chat");
  });

  it("rejects malformed nested /api/chat payloads", async () => {
    const res = await request(app).post("/api/chat").send({
      model: "claude",
      messages: [{ role: "user" }],
      images: [{ base64: "abc123" }]
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body for /api/chat");
  });

  it("allows a normal chat burst without rate limiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: new ReadableStream({
          start(controller) {
            controller.close();
          }
        }),
        json: async () => ({ ok: true }),
        text: async () => ""
      } as any))
    );

    const payload = {
      model: "claude",
      messages: [{ role: "user", content: "Hello" }]
    };
    const limiterHeaders = {
      "X-Forwarded-For": "203.0.113.20"
    };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const res = await request(app).post("/api/chat").set(limiterHeaders).send(payload);
      expect(res.status).toBe(200);
    }
  });

  it("rate limits repeated /api/chat requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: new ReadableStream({
          start(controller) {
            controller.close();
          }
        }),
        json: async () => ({ ok: true }),
        text: async () => ""
      } as any))
    );

    const payload = {
      model: "claude",
      messages: [{ role: "user", content: "Hello" }]
    };
    const limiterHeaders = {
      "X-Forwarded-For": "203.0.113.10"
    };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const res = await request(app).post("/api/chat").set(limiterHeaders).send(payload);
      expect(res.status).toBe(200);
    }

    const limited = await request(app).post("/api/chat").set(limiterHeaders).send(payload);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("Too many requests. Please wait and try again.");
  });

  it("rejects invalid /api/evaluate payloads", async () => {
    const res = await request(app).post("/api/evaluate").send({
      draft: ""
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body for /api/evaluate");
  });

  it("rejects invalid /api/improve-structure payloads", async () => {
    const res = await request(app).post("/api/improve-structure").send({
      raw: "Valid raw content",
      preferences: "bad"
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body for /api/improve-structure");
  });

  it("rejects invalid nested evaluation feedback for /api/improve-structure", async () => {
    const res = await request(app).post("/api/improve-structure").send({
      raw: "Valid raw content",
      evaluationFeedback: { warnings: "bad" }
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request body for /api/improve-structure");
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

  it("exposes reference examples separately from working IA", async () => {
    const res = await request(app).get("/api/reference-examples");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.references)).toBe(true);
    expect(res.body.references.length).toBeGreaterThan(0);
    expect(res.body.references[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        sourceSystem: expect.any(String)
      })
    );
  });

  it("rejects duplicate canonical concept titles", async () => {
    const title = `Report a dead bird duplicate ${Date.now()}`;
    const first = await request(app).post("/api/page-concepts").send({
      taskStatement: `Complete the task: ${title}`,
      canonicalTitle: title,
      contentType: "transaction",
      audience: "General public",
      serviceArea: "hhvc",
      status: "canonical",
      summary: "First concept"
    });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/page-concepts").send({
      taskStatement: `Complete the task: ${title}`,
      canonicalTitle: title,
      contentType: "transaction",
      audience: "General public",
      serviceArea: "hhvc",
      status: "canonical",
      summary: "Second concept"
    });
    expect(second.status).toBe(400);
    expect(second.body.error).toContain("duplicates");
  });

  it("rejects placeholder canonical concept titles", async () => {
    const res = await request(app).post("/api/page-concepts").send({
      taskStatement: "Complete the task: Placeholder page",
      canonicalTitle: "Page A",
      contentType: "information",
      audience: "General public",
      serviceArea: "hhvc",
      status: "proposed",
      summary: "Placeholder"
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Placeholder");
  });
});
