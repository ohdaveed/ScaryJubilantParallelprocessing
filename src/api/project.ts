import { pageConceptsApi } from "./concepts";
import { iaNodesApi } from "./iaNodes";
import { pageArtifactsApi, artifactVariantsApi } from "./artifacts";
import { referenceExamplesApi } from "./references";
import { buildQueueApi } from "./buildQueue";
import type { PageConcept, IANode, PageArtifact, ArtifactVariant, ReferenceExample, BuildQueueItem } from "../types";

export const projectModelApi = {
  load: async (): Promise<{
    concepts: PageConcept[];
    nodes: IANode[];
    artifacts: PageArtifact[];
    variants: ArtifactVariant[];
    references: ReferenceExample[];
    queue: BuildQueueItem[];
  }> => {
    const [concepts, nodes, artifacts, variants, references, queue] = await Promise.all([
      pageConceptsApi.list(),
      iaNodesApi.list(),
      pageArtifactsApi.list(),
      artifactVariantsApi.list(),
      referenceExamplesApi.list(),
      buildQueueApi.list()
    ]);
    return { concepts, nodes, artifacts, variants, references, queue };
  }
};
