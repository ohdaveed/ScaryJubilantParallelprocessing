import { request } from "./client";
import type { IANode } from "../types";

export const iaNodesApi = {
  list: async (mapId?: string): Promise<IANode[]> => {
    const qs = mapId ? `?mapId=${encodeURIComponent(mapId)}` : "";
    const data = await request<{ nodes: IANode[] }>(`/ia-nodes${qs}`);
    return data.nodes || [];
  }
};
