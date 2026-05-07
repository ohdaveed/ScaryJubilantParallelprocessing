import type { IANode, PageConcept } from "../types";
import type { PersistenceStore } from "../types/persistence";
import {
  HHVC_WORKING_IA_MAP_ID,
  hhvcCanonicalWorkingIaNodes,
  hhvcCanonicalWorkingIaSeed
} from "./hhvcCanonicalWorkingIaSeed";

type SyncActionKind = "concept" | "ia_node";
type SyncActionStatus = "create" | "update" | "unchanged";

export interface CanonicalIaSyncAction {
  kind: SyncActionKind;
  slug: string;
  status: SyncActionStatus;
  matchedBy?: "canonicalTitle" | "intentKey";
  id?: number;
  details?: string[];
}

export interface CanonicalIaSyncSummary {
  created: number;
  updated: number;
  unchanged: number;
}

export interface CanonicalIaSyncReport {
  dryRun: boolean;
  mapId: string;
  conceptSummary: CanonicalIaSyncSummary;
  nodeSummary: CanonicalIaSyncSummary;
  karlMetadataStorage: "fixture_only";
  matchingStrategy: "canonicalTitle_then_intentKey";
  actions: CanonicalIaSyncAction[];
}

export interface CanonicalIaSyncOptions {
  dryRun?: boolean;
  mapId?: string;
}

const summarizeStatus = (actions: CanonicalIaSyncAction[], kind: SyncActionKind): CanonicalIaSyncSummary => {
  const filtered = actions.filter((action) => action.kind === kind);
  return {
    created: filtered.filter((action) => action.status === "create").length,
    updated: filtered.filter((action) => action.status === "update").length,
    unchanged: filtered.filter((action) => action.status === "unchanged").length
  };
};

const conceptDiff = (
  current: PageConcept,
  expected: {
    canonicalTitle: string;
    taskStatement: string;
    contentType: string;
    audience: string;
    serviceArea: string;
    status: string;
    summary: string;
    parentConceptId: number | null;
  }
) => {
  const details: string[] = [];
  if (current.canonicalTitle !== expected.canonicalTitle) details.push("canonicalTitle");
  if (current.taskStatement !== expected.taskStatement) details.push("taskStatement");
  if (current.contentType !== expected.contentType) details.push("contentType");
  if (current.audience !== expected.audience) details.push("audience");
  if (current.serviceArea !== expected.serviceArea) details.push("serviceArea");
  if (current.status !== expected.status) details.push("status");
  if (current.summary !== expected.summary) details.push("summary");
  if ((current.parentConceptId ?? null) !== (expected.parentConceptId ?? null)) details.push("parentConceptId");
  return details;
};

const nodeDiff = (
  current: IANode,
  expected: {
    parentNodeId: number | null;
    position: number;
    placementStatus: string;
  }
) => {
  const details: string[] = [];
  if ((current.parentNodeId ?? null) !== (expected.parentNodeId ?? null)) details.push("parentNodeId");
  if (current.position !== expected.position) details.push("position");
  if (current.placementStatus !== expected.placementStatus) details.push("placementStatus");
  return details;
};

const findConceptMatch = (
  concepts: PageConcept[],
  seedConcept: (typeof hhvcCanonicalWorkingIaSeed)[number]
) => {
  const byTitle = concepts.find((concept) => concept.canonicalTitle === seedConcept.canonicalTitle) ?? null;
  const byIntent = concepts.find((concept) => concept.intentKey === seedConcept.intentKey) ?? null;

  if (byTitle && byIntent && byTitle.id !== byIntent.id) {
    throw new Error(
      `Ambiguous canonical seed match for "${seedConcept.slug}": title and intent key resolve to different concepts.`
    );
  }

  if (byTitle) {
    return { concept: byTitle, matchedBy: "canonicalTitle" as const };
  }

  if (byIntent) {
    return { concept: byIntent, matchedBy: "intentKey" as const };
  }

  return { concept: null, matchedBy: undefined };
};

const cloneConcept = (concept: PageConcept): PageConcept => ({ ...concept, governanceFlags: concept.governanceFlags ? [...concept.governanceFlags] : undefined });
const cloneNode = (node: IANode): IANode => ({ ...node });

export async function syncCanonicalWorkingIa(
  store: Pick<
    PersistenceStore,
    "listPageConcepts" | "createPageConcept" | "updatePageConcept" | "listIANodes" | "createIANode" | "updateIANode"
  >,
  options: CanonicalIaSyncOptions = {}
): Promise<CanonicalIaSyncReport> {
  const dryRun = options.dryRun ?? false;
  const mapId = options.mapId ?? HHVC_WORKING_IA_MAP_ID;
  const actions: CanonicalIaSyncAction[] = [];

  const concepts = (await store.listPageConcepts()).map(cloneConcept);
  const nodes = (await store.listIANodes(mapId)).map(cloneNode);
  const conceptIdBySlug = new Map<string, number>();
  let nextVirtualConceptId = Math.max(0, ...concepts.map((concept) => Number(concept.id) || 0)) + 1;
  let nextVirtualNodeId = Math.max(0, ...nodes.map((node) => Number(node.id) || 0)) + 1;

  for (const seedConcept of hhvcCanonicalWorkingIaSeed) {
    const parentConceptId = seedConcept.parentSlug ? conceptIdBySlug.get(seedConcept.parentSlug) ?? null : null;
    if (seedConcept.parentSlug && parentConceptId == null) {
      throw new Error(`Parent concept "${seedConcept.parentSlug}" must be resolved before "${seedConcept.slug}".`);
    }

    const expected = {
      taskStatement: seedConcept.taskStatement,
      canonicalTitle: seedConcept.canonicalTitle,
      contentType: seedConcept.contentType,
      audience: seedConcept.audience,
      serviceArea: seedConcept.serviceArea,
      status: seedConcept.status,
      summary: seedConcept.summary,
      parentConceptId
    };

    const match = findConceptMatch(concepts, seedConcept);
    if (!match.concept) {
      if (dryRun) {
        const virtualConcept: PageConcept = {
          id: nextVirtualConceptId++,
          intentKey: seedConcept.intentKey,
          taskStatement: expected.taskStatement,
          canonicalTitle: expected.canonicalTitle,
          contentType: expected.contentType,
          audience: expected.audience,
          serviceArea: expected.serviceArea,
          status: expected.status as PageConcept["status"],
          summary: expected.summary,
          parentConceptId: expected.parentConceptId,
          createdAt: "",
          updatedAt: ""
        };
        concepts.push(virtualConcept);
        conceptIdBySlug.set(seedConcept.slug, virtualConcept.id);
        actions.push({ kind: "concept", slug: seedConcept.slug, status: "create", id: virtualConcept.id });
        continue;
      }

      const created = await store.createPageConcept(expected);
      concepts.push(cloneConcept(created));
      conceptIdBySlug.set(seedConcept.slug, created.id);
      actions.push({ kind: "concept", slug: seedConcept.slug, status: "create", id: created.id });
      continue;
    }

    const matchedConcept = match.concept;
    conceptIdBySlug.set(seedConcept.slug, matchedConcept.id);
    const changedFields = conceptDiff(matchedConcept, expected);
    if (changedFields.length === 0) {
      actions.push({
        kind: "concept",
        slug: seedConcept.slug,
        status: "unchanged",
        matchedBy: match.matchedBy,
        id: matchedConcept.id
      });
      continue;
    }

    if (dryRun) {
      const updatedConcept = concepts.find((concept) => concept.id === matchedConcept.id);
      if (updatedConcept) {
        updatedConcept.taskStatement = expected.taskStatement;
        updatedConcept.canonicalTitle = expected.canonicalTitle;
        updatedConcept.contentType = expected.contentType as PageConcept["contentType"];
        updatedConcept.audience = expected.audience;
        updatedConcept.serviceArea = expected.serviceArea;
        updatedConcept.status = expected.status as PageConcept["status"];
        updatedConcept.summary = expected.summary;
        updatedConcept.parentConceptId = expected.parentConceptId;
      }
      actions.push({
        kind: "concept",
        slug: seedConcept.slug,
        status: "update",
        matchedBy: match.matchedBy,
        id: matchedConcept.id,
        details: changedFields
      });
      continue;
    }

    const updated = await store.updatePageConcept(matchedConcept.id, expected);
    if (!updated) {
      throw new Error(`Failed to update canonical concept "${seedConcept.slug}" (${matchedConcept.id}).`);
    }
    const conceptIndex = concepts.findIndex((concept) => concept.id === matchedConcept.id);
    concepts[conceptIndex] = cloneConcept(updated);
    actions.push({
      kind: "concept",
      slug: seedConcept.slug,
      status: "update",
      matchedBy: match.matchedBy,
      id: updated.id,
      details: changedFields
    });
  }

  const nodesByConceptId = new Map<number, IANode>();
  for (const node of nodes) {
    if (nodesByConceptId.has(node.conceptId)) {
      throw new Error(`Duplicate IA node found for concept ${node.conceptId} in map "${mapId}".`);
    }
    nodesByConceptId.set(node.conceptId, node);
  }

  for (const seedNode of hhvcCanonicalWorkingIaNodes) {
    const conceptId = conceptIdBySlug.get(seedNode.slug);
    if (conceptId == null) {
      throw new Error(`Concept ID for "${seedNode.slug}" was not resolved before IA node sync.`);
    }

    const parentConceptId = seedNode.parentSlug ? conceptIdBySlug.get(seedNode.parentSlug) ?? null : null;
    if (seedNode.parentSlug && parentConceptId == null) {
      throw new Error(`Parent node concept "${seedNode.parentSlug}" must be resolved before "${seedNode.slug}".`);
    }

    const parentNodeId = parentConceptId != null ? nodesByConceptId.get(parentConceptId)?.id ?? null : null;
    if (parentConceptId != null && parentNodeId == null) {
      throw new Error(`Parent node for "${seedNode.slug}" could not be resolved in map "${mapId}".`);
    }

    const expected = {
      parentNodeId,
      position: seedNode.position,
      placementStatus: seedNode.placementStatus
    };

    const existingNode = nodesByConceptId.get(conceptId) ?? null;
    if (!existingNode) {
      if (dryRun) {
        const virtualNode: IANode = {
          id: nextVirtualNodeId++,
          conceptId,
          iaMapId: mapId,
          parentNodeId: expected.parentNodeId,
          position: expected.position,
          placementStatus: expected.placementStatus as IANode["placementStatus"],
          createdAt: "",
          updatedAt: ""
        };
        nodes.push(virtualNode);
        nodesByConceptId.set(conceptId, virtualNode);
        actions.push({ kind: "ia_node", slug: seedNode.slug, status: "create", id: virtualNode.id });
        continue;
      }

      const created = await store.createIANode({
        conceptId,
        iaMapId: mapId,
        parentNodeId: expected.parentNodeId,
        position: expected.position,
        placementStatus: expected.placementStatus
      });
      const cloned = cloneNode(created);
      nodes.push(cloned);
      nodesByConceptId.set(conceptId, cloned);
      actions.push({ kind: "ia_node", slug: seedNode.slug, status: "create", id: created.id });
      continue;
    }

    const changedFields = nodeDiff(existingNode, expected);
    if (changedFields.length === 0) {
      actions.push({ kind: "ia_node", slug: seedNode.slug, status: "unchanged", id: existingNode.id });
      continue;
    }

    if (dryRun) {
      existingNode.parentNodeId = expected.parentNodeId;
      existingNode.position = expected.position;
      existingNode.placementStatus = expected.placementStatus as IANode["placementStatus"];
      actions.push({
        kind: "ia_node",
        slug: seedNode.slug,
        status: "update",
        id: existingNode.id,
        details: changedFields
      });
      continue;
    }

    const updated = await store.updateIANode(existingNode.id, expected);
    if (!updated) {
      throw new Error(`Failed to update IA node for "${seedNode.slug}" (${existingNode.id}).`);
    }
    nodesByConceptId.set(conceptId, cloneNode(updated));
    actions.push({
      kind: "ia_node",
      slug: seedNode.slug,
      status: "update",
      id: updated.id,
      details: changedFields
    });
  }

  return {
    dryRun,
    mapId,
    conceptSummary: summarizeStatus(actions, "concept"),
    nodeSummary: summarizeStatus(actions, "ia_node"),
    karlMetadataStorage: "fixture_only",
    matchingStrategy: "canonicalTitle_then_intentKey",
    actions
  };
}
