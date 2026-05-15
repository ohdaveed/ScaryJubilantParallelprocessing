import { request } from "./client";
import type { PageConcept } from "../types";

export const pageConceptsApi = {
  list: async (): Promise<PageConcept[]> => {
    const data = await request<{ concepts: PageConcept[] }>("/page-concepts");
    return data.concepts || [];
  },

  create: async (payload: Omit<PageConcept, "id" | "intentKey" | "createdAt" | "updatedAt" | "governanceFlags">): Promise<PageConcept> => {
    return request<PageConcept>("/page-concepts", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  update: async (id: number, patch: Partial<Omit<PageConcept, "id" | "intentKey" | "createdAt" | "updatedAt">>): Promise<PageConcept> => {
    return request<PageConcept>(`/page-concepts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  }
};
