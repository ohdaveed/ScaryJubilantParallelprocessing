import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import type { PageDraft, TodoItem, TodoStatus } from "../types";
import { todosApi } from "../api";

type QueueUpdate = {
  status: TodoStatus;
  errorMessage?: string | null;
  builtPageId?: string | null;
  karlGrade?: string | null;
};

/**
 * Pure function — testable without React.
 * Iterates pending todos sequentially, calling generate() for each.
 * Calls onUpdate(id, fields) to report status transitions.
 * Stops early when shouldStop() returns true (checked before each item).
 */
export async function runQueue(
  todos: TodoItem[],
  generate: (todo: TodoItem) => Promise<PageDraft | null>,
  onUpdate: (id: number, fields: QueueUpdate) => void,
  shouldStop: () => boolean
): Promise<{ attempted: number; succeeded: number; failed: number }> {
  const pending = todos.filter((t) => t.status === "pending");
  let succeeded = 0;
  let failed = 0;

  for (const todo of pending) {
    if (shouldStop()) break;

    onUpdate(todo.id, { status: "generating" });

    try {
      const page = await generate(todo);
      if (page) {
        onUpdate(todo.id, {
          status: "done",
          builtPageId: page.id,
          karlGrade: page.karlEvaluation?.grade ?? null
        });
        succeeded++;
      } else {
        onUpdate(todo.id, { status: "failed", errorMessage: "Generation returned no result" });
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      onUpdate(todo.id, { status: "failed", errorMessage: msg });
      failed++;
    }
  }

  return { attempted: succeeded + failed, succeeded, failed };
}

type UseQueueRunnerParams = {
  todos: TodoItem[];
  setTodos: Dispatch<SetStateAction<TodoItem[]>>;
  generate: (todo: TodoItem) => Promise<PageDraft | null>;
};

export function useQueueRunner({ todos, setTodos, generate }: UseQueueRunnerParams) {
  const [running, setRunning] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const stopRef = useRef(false);
  const todosRef = useRef(todos);
  todosRef.current = todos;

  const applyUpdate = useCallback((id: number, fields: QueueUpdate) => {
    setCurrentItemId(fields.status === "generating" ? id : null);
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: fields.status,
              errorMessage: fields.errorMessage ?? t.errorMessage,
              builtPageId: fields.builtPageId ?? t.builtPageId,
              karlGrade: fields.karlGrade ?? t.karlGrade,
              done: fields.status === "done" ? true : t.done
            }
          : t
      )
    );
    todosApi.updateQueue(id, fields).catch(() => {});
  }, [setTodos]);

  const start = useCallback(async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    await runQueue(todosRef.current, generate, applyUpdate, () => stopRef.current);
    setRunning(false);
    setCurrentItemId(null);
  }, [running, generate, applyUpdate]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  return { running, currentItemId, start, stop };
}
