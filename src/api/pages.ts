import { request } from "./client";
import type { PageDraft, PageVersion, PlannedPage } from "../types";

export const pagesApi = {
  list: async (): Promise<PageDraft[]> => {
    const summaryFields = ["id", "name", "pageType", "userType", "createdAt", "reviewStatus", "currentVersionNumber", "draftPreview", "karlConnected", "karlEvaluation", "qualityGate"].join(",");
    const data = await request<{ pages: any[] }>(`/pages?fields=${encodeURIComponent(summaryFields)}&includeDraft=false&includeRaw=false&includeDraftPreview=true`);
    return (data.pages || []).map(toPageSummary);
  },

  get: async (id: string): Promise<PageDraft> => {
    const data = await request<any>(`/pages/${encodeURIComponent(id)}`);
    return {
      ...toPageSummary(data),
      draft: data?.draft || "",
      raw: data?.raw || "",
      contentHydrated: true
    };
  },

  save: async (id: string, page: PageDraft, version?: { notes: string; trigger: "generate" | "refine" | "restore" | "manual" }): Promise<void> => {
    await request<void>("/pages", {
      method: "POST",
      body: JSON.stringify({ id, data: page, ...(version ? { versionNotes: version.notes, versionTrigger: version.trigger } : {}) })
    });
  },

  delete: async (id: string): Promise<void> => {
    await request<void>(`/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  updateReview: async (id: string, status: string): Promise<void> => {
    await request<void>(`/pages/${encodeURIComponent(id)}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }
};

export const versionsApi = {
  list: async (pageId: string, opts: { limit?: number; includeData?: boolean } = {}): Promise<PageVersion[]> => {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.includeData) params.set("includeData", "true");
    const qs = params.toString() ? `?${params}` : "";
    const data = await request<{ versions: PageVersion[] }>(`/pages/${encodeURIComponent(pageId)}/versions${qs}`);
    return data.versions || [];
  },

  get: async (pageId: string, versionId: number): Promise<PageVersion> => {
    return request<PageVersion>(`/pages/${encodeURIComponent(pageId)}/versions/${versionId}`);
  },

  restore: async (pageId: string, versionId: number): Promise<PageDraft> => {
    const body = await request<{ data: PageDraft }>(`/pages/${encodeURIComponent(pageId)}/restore/${versionId}`, { method: "POST" });
    return body.data;
  }
};

export const plannedPagesApi = {
  list: async (): Promise<PlannedPage[]> => {
    const data = await request<{ plannedPages: PlannedPage[] }>("/planned-pages");
    return data.plannedPages || [];
  },

  create: async (name: string, pageType: string, userType: string, parentId?: number | null): Promise<PlannedPage> => {
    return request<PlannedPage>("/planned-pages", {
      method: "POST",
      body: JSON.stringify({ name, pageType, userType, parentId: parentId || null })
    });
  },

  update: async (id: number, updates: Partial<{ name: string; pageType: string; userType: string; parentId: number | null; builtPageId: string | null }>): Promise<PlannedPage> => {
    return request<PlannedPage>(`/planned-pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  },

  delete: async (id: number): Promise<void> => {
    await request<void>(`/planned-pages/${id}`, { method: "DELETE" });
  }
};

/**
 * Helper to normalize page summary fields
 */
const toPageSummary = (page: any): PageDraft => {
  const fallbackDraft = typeof page.draft === "string" && page.draft.length > 0
    ? page.draft
    : (typeof page.draftPreview === "string" ? page.draftPreview : "");
    
  return {
    id: page.id || "",
    name: page.name || "",
    userType: page.userType || "",
    userGoal: page.userGoal || "",
    purpose: page.purpose || "",
    pageType: page.pageType || "",
    components: page.components || "",
    relationships: page.relationships || "",
    duplication: page.duplication || "",
    enforcement: page.enforcement || "",
    draft: fallbackDraft,
    draftPreview: typeof page.draftPreview === "string" ? page.draftPreview : fallbackDraft,
    integration: page.integration || "",
    valid: page.valid ?? true,
    raw: page.raw || "",
    createdAt: page.createdAt || "",
    karlConnected: page.karlConnected ?? false,
    karlEvaluation: page.karlEvaluation,
    skeleton: page.skeleton,
    imported: page.imported,
    currentVersionNumber: page.currentVersionNumber,
    version: page.version,
    reviewStatus: page.reviewStatus,
    qualityGate: page.qualityGate,
    inputs: page.inputs || { topic: page.name || "", userType: page.userType || "", notes: "" },
    contentHydrated: page.contentHydrated ?? false
  };
};
