import { describe, expect, it } from "vitest";
import type { IANode, PageConcept } from "./types";
import type { PersistenceStore } from "./types/persistence";
import {
  HHVC_WORKING_IA_MAP_ID,
  hhvcCanonicalWorkingIaSeed
} from "./data/hhvcCanonicalWorkingIaSeed";
import { syncCanonicalWorkingIa } from "./data/syncCanonicalWorkingIa";

const now = () => new Date().toISOString();

class MemoryPersistenceStore implements Pick<
  PersistenceStore,
  "listPageConcepts" | "createPageConcept" | "updatePageConcept" | "listIANodes" | "createIANode" | "updateIANode"
> {
  private nextConceptId = 1;
  private nextNodeId = 1;

  concepts: PageConcept[] = [];
  nodes: IANode[] = [];

  async listPageConcepts() {
    return this.concepts.map((concept) => ({ ...concept }));
  }

  async createPageConcept(payload: {
    taskStatement: string;
    canonicalTitle: string;
    contentType: string;
    audience: string;
    serviceArea: string;
    status?: string;
    summary?: string;
    parentConceptId?: number | null;
  }) {
    const concept: PageConcept = {
      id: this.nextConceptId++,
      intentKey: `${payload.taskStatement}::${payload.audience}::${payload.serviceArea}`,
      taskStatement: payload.taskStatement,
      canonicalTitle: payload.canonicalTitle,
      contentType: payload.contentType as PageConcept["contentType"],
      audience: payload.audience,
      serviceArea: payload.serviceArea,
      status: (payload.status ?? "proposed") as PageConcept["status"],
      summary: payload.summary ?? "",
      parentConceptId: payload.parentConceptId ?? null,
      createdAt: now(),
      updatedAt: now(),
      governanceFlags: []
    };
    this.concepts.push(concept);
    return { ...concept };
  }

  async updatePageConcept(id: number | string, patch: {
    taskStatement?: string;
    canonicalTitle?: string;
    contentType?: string;
    audience?: string;
    serviceArea?: string;
    status?: string;
    summary?: string;
    parentConceptId?: number | null;
  }) {
    const concept = this.concepts.find((entry) => String(entry.id) === String(id)) ?? null;
    if (!concept) return null;
    if (patch.taskStatement !== undefined) concept.taskStatement = patch.taskStatement;
    if (patch.canonicalTitle !== undefined) concept.canonicalTitle = patch.canonicalTitle;
    if (patch.contentType !== undefined) concept.contentType = patch.contentType as PageConcept["contentType"];
    if (patch.audience !== undefined) concept.audience = patch.audience;
    if (patch.serviceArea !== undefined) concept.serviceArea = patch.serviceArea;
    if (patch.status !== undefined) concept.status = patch.status as PageConcept["status"];
    if (patch.summary !== undefined) concept.summary = patch.summary;
    if (patch.parentConceptId !== undefined) concept.parentConceptId = patch.parentConceptId;
    concept.updatedAt = now();
    return { ...concept };
  }

  async listIANodes(mapId = HHVC_WORKING_IA_MAP_ID) {
    return this.nodes.filter((node) => node.iaMapId === mapId).map((node) => ({ ...node }));
  }

  async createIANode(payload: {
    conceptId: number;
    iaMapId?: string;
    parentNodeId?: number | null;
    position?: number;
    placementStatus?: string;
  }) {
    const node: IANode = {
      id: this.nextNodeId++,
      conceptId: payload.conceptId,
      iaMapId: payload.iaMapId ?? HHVC_WORKING_IA_MAP_ID,
      parentNodeId: payload.parentNodeId ?? null,
      position: payload.position ?? 0,
      placementStatus: (payload.placementStatus ?? "placed") as IANode["placementStatus"],
      createdAt: now(),
      updatedAt: now()
    };
    this.nodes.push(node);
    return { ...node };
  }

  async updateIANode(id: number | string, patch: {
    parentNodeId?: number | null;
    position?: number;
    placementStatus?: string;
  }) {
    const node = this.nodes.find((entry) => String(entry.id) === String(id)) ?? null;
    if (!node) return null;
    if (patch.parentNodeId !== undefined) node.parentNodeId = patch.parentNodeId;
    if (patch.position !== undefined) node.position = patch.position;
    if (patch.placementStatus !== undefined) node.placementStatus = patch.placementStatus as IANode["placementStatus"];
    node.updatedAt = now();
    return { ...node };
  }
}

describe("syncCanonicalWorkingIa", () => {
  it("creates the canonical concept set and working map on an empty store", async () => {
    const store = new MemoryPersistenceStore();

    const report = await syncCanonicalWorkingIa(store);

    expect(report.conceptSummary).toEqual({ created: 47, updated: 0, unchanged: 0 });
    expect(report.nodeSummary).toEqual({ created: 47, updated: 0, unchanged: 0 });
    expect(report.karlMetadataStorage).toBe("fixture_only");
    expect(store.concepts).toHaveLength(47);
    expect(store.nodes).toHaveLength(47);

    const rootConcept = store.concepts.find((concept) => concept.canonicalTitle === "Get help with pests and housing problems");
    const reportHub = store.concepts.find((concept) => concept.canonicalTitle === "Report a pest or housing problem");
    const reportHubNode = store.nodes.find((node) => node.conceptId === reportHub?.id);

    expect(rootConcept?.parentConceptId).toBeNull();
    expect(reportHub?.parentConceptId).toBe(rootConcept?.id ?? null);
    expect(reportHubNode?.parentNodeId).toBe(store.nodes.find((node) => node.conceptId === rootConcept?.id)?.id ?? null);
  });

  it("is idempotent on a second run", async () => {
    const store = new MemoryPersistenceStore();

    await syncCanonicalWorkingIa(store);
    const report = await syncCanonicalWorkingIa(store);

    expect(report.conceptSummary).toEqual({ created: 0, updated: 0, unchanged: 47 });
    expect(report.nodeSummary).toEqual({ created: 0, updated: 0, unchanged: 47 });
    expect(store.concepts).toHaveLength(47);
    expect(store.nodes).toHaveLength(47);
  });

  it("updates existing records matched by title or intent key", async () => {
    const store = new MemoryPersistenceStore();

    const rootSeed = hhvcCanonicalWorkingIaSeed[0];
    const rootConcept = await store.createPageConcept({
      taskStatement: rootSeed.taskStatement,
      canonicalTitle: rootSeed.canonicalTitle,
      contentType: rootSeed.contentType,
      audience: rootSeed.audience,
      serviceArea: rootSeed.serviceArea,
      status: "proposed",
      summary: "outdated summary"
    });
    await store.createIANode({
      conceptId: rootConcept.id,
      iaMapId: HHVC_WORKING_IA_MAP_ID,
      position: 9,
      placementStatus: "orphaned"
    });

    const reportHubSeed = hhvcCanonicalWorkingIaSeed[1];
    store.concepts.push({
      id: 999,
      intentKey: reportHubSeed.intentKey,
      taskStatement: reportHubSeed.taskStatement,
      canonicalTitle: "Old hub title",
      contentType: reportHubSeed.contentType as PageConcept["contentType"],
      audience: reportHubSeed.audience,
      serviceArea: reportHubSeed.serviceArea,
      status: "canonical",
      summary: reportHubSeed.summary,
      parentConceptId: null,
      createdAt: now(),
      updatedAt: now(),
      governanceFlags: []
    });
    store.nodes.push({
      id: 999,
      conceptId: 999,
      iaMapId: HHVC_WORKING_IA_MAP_ID,
      parentNodeId: null,
      position: 99,
      placementStatus: "placed",
      createdAt: now(),
      updatedAt: now()
    });

    const report = await syncCanonicalWorkingIa(store);

    expect(report.conceptSummary.updated).toBeGreaterThanOrEqual(2);
    expect(report.nodeSummary.updated).toBeGreaterThanOrEqual(2);

    const syncedRoot = store.concepts.find((concept) => concept.id === rootConcept.id);
    const syncedReportHub = store.concepts.find((concept) => concept.id === 999);
    const syncedRootNode = store.nodes.find((node) => node.conceptId === rootConcept.id);
    const syncedReportHubNode = store.nodes.find((node) => node.conceptId === 999);

    expect(syncedRoot?.status).toBe("canonical");
    expect(syncedRoot?.summary).toBe(rootSeed.summary);
    expect(syncedReportHub?.canonicalTitle).toBe(reportHubSeed.canonicalTitle);
    expect(syncedReportHub?.parentConceptId).toBe(rootConcept.id);
    expect(syncedRootNode?.position).toBe(0);
    expect(syncedRootNode?.placementStatus).toBe("placed");
    expect(syncedReportHubNode?.parentNodeId).toBe(syncedRootNode?.id ?? null);
    expect(syncedReportHubNode?.position).toBe(0);
  });
});
