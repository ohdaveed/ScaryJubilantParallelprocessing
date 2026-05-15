import { request } from "./client";
import type { BuildQueueItem } from "../types";

export const buildQueueApi = {
  list: async (): Promise<BuildQueueItem[]> => {
    const data = await request<{ items: BuildQueueItem[] }>("/build-queue");
    return data.items || [];
  },

  create: async (payload: Omit<BuildQueueItem, "id" | "createdAt" | "errorMessage" | "karlGrade">): Promise<BuildQueueItem> => {
    return request<BuildQueueItem>("/build-queue", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  update: async (id: number, patch: Partial<BuildQueueItem> & { errorMessage?: string | null; karlGrade?: string | null }): Promise<BuildQueueItem> => {
    return request<BuildQueueItem>(`/build-queue/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },

  delete: async (id: number): Promise<void> => {
    await request<void>(`/build-queue/${id}`, { method: "DELETE" });
  }
};
