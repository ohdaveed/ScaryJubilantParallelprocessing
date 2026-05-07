import { describe, expect, it } from "vitest";
import type { IANode, PageConcept } from "./types";
import {
  HHVC_WORKING_IA_MAP_ID,
  hhvcCanonicalWorkingIaNodes,
  hhvcCanonicalWorkingIaSeed
} from "./data/hhvcCanonicalWorkingIaSeed";
import { buildCanonicalIaInspectorModel, countTreeNodes } from "./utils/canonicalIa";

function buildSeededConceptsAndNodes() {
  const conceptIdBySlug = new Map<string, number>();
  const concepts: PageConcept[] = hhvcCanonicalWorkingIaSeed.map((concept, index) => {
    const id = index + 1;
    conceptIdBySlug.set(concept.slug, id);
    return {
      id,
      intentKey: concept.intentKey,
      taskStatement: concept.taskStatement,
      canonicalTitle: concept.canonicalTitle,
      contentType: concept.contentType as PageConcept["contentType"],
      audience: concept.audience,
      serviceArea: concept.serviceArea,
      status: concept.status,
      summary: concept.summary,
      parentConceptId: null,
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
      governanceFlags: []
    };
  });

  for (const concept of concepts) {
    const seed = hhvcCanonicalWorkingIaSeed.find((entry) => entry.canonicalTitle === concept.canonicalTitle);
    concept.parentConceptId = seed?.parentSlug ? conceptIdBySlug.get(seed.parentSlug) ?? null : null;
  }

  const nodeIdBySlug = new Map<string, number>();
  const nodes: IANode[] = hhvcCanonicalWorkingIaNodes.map((node, index) => {
    const id = index + 1;
    nodeIdBySlug.set(node.slug, id);
    return {
      id,
      conceptId: conceptIdBySlug.get(node.slug) ?? -1,
      iaMapId: HHVC_WORKING_IA_MAP_ID,
      parentNodeId: null,
      position: node.position,
      placementStatus: node.placementStatus,
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z"
    };
  });

  for (const node of nodes) {
    const seed = hhvcCanonicalWorkingIaNodes.find((entry) => conceptIdBySlug.get(entry.slug) === node.conceptId);
    node.parentNodeId = seed?.parentSlug ? nodeIdBySlug.get(seed.parentSlug) ?? null : null;
  }

  return { concepts, nodes };
}

describe("buildCanonicalIaInspectorModel", () => {
  it("builds the working canonical tree from seeded concepts and nodes", () => {
    const { concepts, nodes } = buildSeededConceptsAndNodes();

    const model = buildCanonicalIaInspectorModel(concepts, nodes);

    expect(model.root?.concept.canonicalTitle).toBe("Get help with pests and housing problems");
    expect(model.root?.children).toHaveLength(5);
    expect(model.orphanConceptIds).toEqual([]);
    expect(model.mappedConceptIds).toHaveLength(47);
    expect(countTreeNodes(model.root)).toBe(47);
  });

  it("reports canonical concepts that are not mapped into the working tree", () => {
    const { concepts, nodes } = buildSeededConceptsAndNodes();
    concepts.push({
      id: 999,
      intentKey: "orphan",
      taskStatement: "orphan",
      canonicalTitle: "Orphan concept",
      contentType: "information",
      audience: "General public",
      serviceArea: "hhvc",
      status: "canonical",
      summary: "Orphan",
      parentConceptId: null,
      createdAt: "2026-05-06T00:00:00.000Z",
      updatedAt: "2026-05-06T00:00:00.000Z",
      governanceFlags: []
    });

    const model = buildCanonicalIaInspectorModel(concepts, nodes);

    expect(model.orphanConceptIds).toEqual([999]);
  });
});
