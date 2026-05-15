import { request } from "./client";
import type { ReferenceExample } from "../types";

export const referenceExamplesApi = {
  list: async (): Promise<ReferenceExample[]> => {
    const data = await request<{ references: ReferenceExample[] }>("/reference-examples");
    return data.references || [];
  }
};
