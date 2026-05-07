import type { IANode, PageConcept } from "../types";

export interface CanonicalIaTreeNode {
  concept: PageConcept;
  node: IANode;
  children: CanonicalIaTreeNode[];
}

export interface CanonicalIaInspectorModel {
  root: CanonicalIaTreeNode | null;
  orphanConceptIds: number[];
  mappedConceptIds: number[];
}

export function buildCanonicalIaInspectorModel(
  concepts: PageConcept[],
  nodes: IANode[],
  mapId = "hhvc-working"
): CanonicalIaInspectorModel {
  const mapNodes = nodes.filter((node) => node.iaMapId === mapId);
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const treeNodeByNodeId = new Map<number, CanonicalIaTreeNode>();
  const roots: CanonicalIaTreeNode[] = [];

  for (const node of mapNodes) {
    const concept = conceptById.get(node.conceptId);
    if (!concept) continue;
    treeNodeByNodeId.set(node.id, {
      concept,
      node,
      children: []
    });
  }

  for (const node of mapNodes) {
    const treeNode = treeNodeByNodeId.get(node.id);
    if (!treeNode) continue;
    if (node.parentNodeId == null) {
      roots.push(treeNode);
      continue;
    }
    const parent = treeNodeByNodeId.get(node.parentNodeId);
    if (parent) {
      parent.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  const sortTree = (treeNode: CanonicalIaTreeNode) => {
    treeNode.children.sort((left, right) => left.node.position - right.node.position);
    treeNode.children.forEach(sortTree);
  };

  roots.sort((left, right) => left.node.position - right.node.position);
  roots.forEach(sortTree);

  const mappedConceptIds = Array.from(new Set(mapNodes.map((node) => node.conceptId)));
  const orphanConceptIds = concepts
    .filter((concept) => concept.status === "canonical" && !mappedConceptIds.includes(concept.id))
    .map((concept) => concept.id);

  return {
    root: roots[0] ?? null,
    orphanConceptIds,
    mappedConceptIds
  };
}

export function countTreeNodes(root: CanonicalIaTreeNode | null): number {
  if (!root) return 0;
  return 1 + root.children.reduce((sum, child) => sum + countTreeNodes(child), 0);
}
