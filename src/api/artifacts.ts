import { request } from "./client";
import type { PageArtifact, ArtifactVariant } from "../types";

export const pageArtifactsApi = {
  list: async (): Promise<PageArtifact[]> => {
    const data = await request<{ artifacts: PageArtifact[] }>("/page-artifacts");
    return data.artifacts || [];
  },

  promote: async (artifactId: string, conceptId: number): Promise<PageArtifact> => {
    return request<PageArtifact>(`/page-artifacts/${encodeURIComponent(artifactId)}/promote`, {
      method: "POST",
      body: JSON.stringify({ conceptId })
    });
  }
};

export const artifactVariantsApi = {
  list: async (): Promise<ArtifactVariant[]> => {
    const data = await request<{ variants: ArtifactVariant[] }>("/artifact-variants");
    return data.variants || [];
  },

  create: async (payload: Omit<ArtifactVariant, "id" | "createdAt" | "updatedAt">): Promise<ArtifactVariant> => {
    return request<ArtifactVariant>("/artifact-variants", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
