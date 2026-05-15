import { request } from "./client";
import type { TodoItem } from "../types";

export const todosApi = {
  list: async (): Promise<TodoItem[]> => {
    const data = await request<{ todos: TodoItem[] }>("/todos");
    return data.todos || [];
  },

  create: async (topic: string, userType: string, opts?: { plannedId?: number }): Promise<TodoItem> => {
    return request<TodoItem>("/todos", {
      method: "POST",
      body: JSON.stringify({ topic, userType, ...(opts?.plannedId != null ? { plannedId: opts.plannedId } : {}) })
    });
  },

  toggle: async (id: number, done: boolean): Promise<void> => {
    await request<void>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ done })
    });
  },

  updateQueue: async (id: number, fields: { status: string; errorMessage?: string | null; builtPageId?: string | null; karlGrade?: string | null }): Promise<TodoItem> => {
    return request<TodoItem>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields)
    });
  },

  delete: async (id: number): Promise<void> => {
    await request<void>(`/todos/${id}`, { method: "DELETE" });
  }
};
