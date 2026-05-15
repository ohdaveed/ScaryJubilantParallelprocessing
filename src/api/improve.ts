import { request } from "./client";
import type { KarlEvaluation } from "../types";

export const improveStructure = async (
  raw: string,
  preferences: string[],
  evaluationFeedback?: KarlEvaluation | null
): Promise<string | null> => {
  try {
    const data = await request<{ improved: string }>("/improve-structure", {
      method: "POST",
      body: JSON.stringify({ raw, preferences, evaluationFeedback })
    });
    return data.improved || null;
  } catch (error) {
    console.error("Structure improvement error:", error);
    return null;
  }
};
