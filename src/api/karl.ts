import { request } from "./client";
import type { KarlEvaluation } from "../types";

export const runKarlEvaluation = async (page: { name: string; pageType: string; draft: string; userType: string }): Promise<KarlEvaluation | null> => {
  try {
    return await request<KarlEvaluation>("/evaluate", {
      method: "POST",
      body: JSON.stringify({ pageName: page.name, pageType: page.pageType, draft: page.draft, userType: page.userType })
    });
  } catch (error) {
    console.error("Karl evaluation error:", error);
    return null;
  }
};

export const fetchKarlRemediation = async (payload: { raw: string; pageType: string; evaluation: KarlEvaluation }): Promise<{ consulted: boolean; guidance: string[]; error: string | null }> => {
  try {
    return await request<{ consulted: boolean; guidance: string[]; error: string | null }>("/karl-remediate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return { consulted: false, guidance: [], error: error instanceof Error ? error.message : "Karl remediation failed" };
  }
};
