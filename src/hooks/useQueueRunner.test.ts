import { describe, it, expect, vi } from "vitest";
import { runQueue } from "./useQueueRunner";
import type { TodoItem } from "../types";

const makeTodo = (id: number, status: TodoItem["status"] = "pending"): TodoItem => ({
  id,
  topic: `Page ${id}`,
  userType: "General public",
  done: false,
  status,
  errorMessage: null,
  builtPageId: null,
  karlGrade: null
});

describe("runQueue", () => {
  it("processes pending todos sequentially and returns stats", async () => {
    const todos = [makeTodo(1), makeTodo(2)];
    const mockPage = { id: "page_1", name: "Page 1", karlEvaluation: { grade: "A" } } as any;
    const generate = vi.fn().mockResolvedValue(mockPage);
    const updates: Array<{ id: number; fields: object }> = [];
    const onUpdate = (id: number, fields: object) => { updates.push({ id, fields }); };

    const result = await runQueue(todos, generate, onUpdate, () => false);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenNthCalledWith(1, "Page 1", "General public");
    expect(generate).toHaveBeenNthCalledWith(2, "Page 2", "General public");
    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0 });

    // first update for todo 1 should set status=generating
    expect(updates[0]).toEqual({ id: 1, fields: { status: "generating" } });
    // second update for todo 1 should set status=done with grade
    expect(updates[1]).toEqual({ id: 1, fields: { status: "done", builtPageId: "page_1", karlGrade: "A" } });
  });

  it("marks todo as failed when generate returns null", async () => {
    const todos = [makeTodo(1)];
    const generate = vi.fn().mockResolvedValue(null);
    const updates: Array<{ id: number; fields: object }> = [];
    const onUpdate = (id: number, fields: object) => { updates.push({ id, fields }); };

    const result = await runQueue(todos, generate, onUpdate, () => false);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    expect(updates[1]).toMatchObject({ id: 1, fields: { status: "failed" } });
  });

  it("stops after current item when shouldStop returns true", async () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3)];
    let stopped = false;
    const generate = vi.fn().mockImplementation(async () => {
      stopped = true;
      return { id: "p", name: "P", karlEvaluation: null } as any;
    });
    const onUpdate = vi.fn();
    const shouldStop = () => stopped;

    const result = await runQueue(todos, generate, onUpdate, shouldStop);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.attempted).toBe(1);
  });

  it("skips todos that are not pending", async () => {
    const todos = [makeTodo(1, "done"), makeTodo(2, "pending")];
    const generate = vi.fn().mockResolvedValue({ id: "p2", name: "P2", karlEvaluation: { grade: "B" } } as any);
    const onUpdate = vi.fn();

    await runQueue(todos, generate, onUpdate, () => false);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith("Page 2", "General public");
  });
});
