import { useCallback, useEffect, useState } from "react";
import type { ArtifactVariant, BuildQueueItem, IANode, PageArtifact, PageConcept, ReferenceExample } from "../types";
import { projectModelApi } from "../api";

type ProjectModelState = {
  concepts: PageConcept[];
  nodes: IANode[];
  artifacts: PageArtifact[];
  variants: ArtifactVariant[];
  references: ReferenceExample[];
  queue: BuildQueueItem[];
};

const EMPTY_STATE: ProjectModelState = {
  concepts: [],
  nodes: [],
  artifacts: [],
  variants: [],
  references: [],
  queue: []
};

export function useProjectModel() {
  const [model, setModel] = useState<ProjectModelState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await projectModelApi.load();
    setModel(next);
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        console.error("Failed to load project model:", error);
        setModel(EMPTY_STATE);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  return {
    ...model,
    modelLoading: loading,
    refreshModel: refresh,
    setModel
  };
}
