import { request } from "./client";
import type { UserPreference } from "../types";

export const preferencesApi = {
  list: async (pageId?: string | null): Promise<UserPreference[]> => {
    const url = pageId ? `/preferences?page_id=${encodeURIComponent(pageId)}` : "/preferences";
    const data = await request<{ preferences: UserPreference[] }>(url);
    return data.preferences || [];
  },

  create: async (preference: string, source: string = "manual", pageId?: string | null): Promise<UserPreference> => {
    return request<UserPreference>("/preferences", {
      method: "POST",
      body: JSON.stringify({ preference, source, page_id: pageId || null })
    });
  },

  delete: async (id: number): Promise<void> => {
    await request<void>(`/preferences/${id}`, { method: "DELETE" });
  }
};
