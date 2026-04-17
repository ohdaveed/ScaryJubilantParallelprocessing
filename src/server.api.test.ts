import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: any;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-key";
  const mod = await import("../server.js");
  app = mod.app;
});

describe("API validation guards", () => {
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
});
