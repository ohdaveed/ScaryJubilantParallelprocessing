import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pkg from "pg";
import {
  artifactKindFromPage,
  artifactWorkflowFromPage,
  buildIntentKey,
  contentTypeFromPageType,
  findConceptConflicts,
  normalizeTitleForComparison,
  pageTypeFromContentType,
  validateConceptDraft
} from "./contentModel.js";

const { Pool } = pkg;

const DEFAULT_LOCAL_DB_PATH = ".local/hhvc-local-db.json";

/** Max snapshots kept per page; oldest are dropped after each new version. */
export const PAGE_VERSION_RETENTION = 50;

const clone = (value) => JSON.parse(JSON.stringify(value));
const WORKING_IA_MAP_ID = "hhvc-working";
const REFERENCE_IA_MAP_ID = "hhvc-reference";

/** Strip fields only used on list API responses; never persist them. */
const stripEphemeralPageFields = (data) => {
  if (!data || typeof data !== "object") return data;
  const next = clone(data);
  delete next.currentVersionNumber;
  delete next.draftPreview;
  delete next.contentHydrated;
  return next;
};
const byCreatedAsc = (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
const byCreatedDesc = (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const PLAN_PAGE_RENAMES = new Map([
  ["Get help with pests, mold, and trash", { name: "Healthy housing and pests", pageType: "Topic", userType: "General public" }],
  ["Help with pests and bugs", { name: "Prevent pests and health problems", pageType: "Information", userType: "General public" }],
  ["Help with mold and water", { name: "Reduce indoor moisture and prevent mold (not leaks)", pageType: "Information", userType: "Resident / tenant" }],
  ["Help with trash and messes", { name: "Report garbage or dirty conditions", pageType: "Transaction", userType: "Resident / tenant" }],
  ["Help with plants and weeds", { name: "Report overgrown plants or weeds that attract pests", pageType: "Transaction", userType: "General public" }],
  ["Pay your annual building fee", { name: "Pay your healthy housing fee for buildings with 3 or more units", pageType: "Transaction", userType: "Property owner / landlord" }],
  ["Fee deadlines and late costs", { name: "Tools, fees, and help", pageType: "Information", userType: "Property owner / landlord" }],
  ["Fixing a violation", { name: "What owners need to do after getting a notice of violation", pageType: "Information", userType: "Property owner / landlord" }],
  ["Owner rules for buildings with 3+ units", { name: "About the healthy housing program and inspections", pageType: "Information", userType: "Property owner / landlord" }],
  ["Learn how to stop mosquitoes", { name: "Prevent mosquitoes by removing standing water", pageType: "Information", userType: "General public" }],
  ["Mosquito classes for schools", { name: "Request a mosquito education workshop for students", pageType: "Transaction", userType: "General public" }],
  ["Report a dead bird", { name: "Report a dead bird for West Nile Virus testing", pageType: "Transaction", userType: "General public" }],
  ["Contact HHVC", { name: "Contact healthy housing and vector control", pageType: "Information", userType: "General public" }]
]);

const normalizePlannedPage = (row) => {
  if (!row || typeof row !== "object") return row;
  const rename = PLAN_PAGE_RENAMES.get(row.name);
  if (!rename) return row;
  return {
    ...row,
    name: rename.name,
    page_type: rename.pageType || row.page_type,
    user_type: rename.userType || row.user_type
  };
};

const DEFAULT_REFERENCE_EXAMPLES = [
  {
    title: "Healthy housing and pests",
    source_system: "HHVC reference benchmark",
    reference_type: "topic_hub",
    notes: "Reference-only benchmark for the root HHVC topic structure.",
    mapped_pattern: "Root topic hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  },
  {
    title: "Report a housing or pest problem",
    source_system: "HHVC reference benchmark",
    reference_type: "task_hub",
    notes: "Reference-only benchmark for report routing and transaction entry points.",
    mapped_pattern: "Action hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  },
  {
    title: "Fix a problem in your building",
    source_system: "HHVC reference benchmark",
    reference_type: "task_hub",
    notes: "Reference-only benchmark for post-report lifecycle guidance.",
    mapped_pattern: "Follow-up hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  },
  {
    title: "Prevent pests and health problems",
    source_system: "HHVC reference benchmark",
    reference_type: "task_hub",
    notes: "Reference-only benchmark for prevention and educational guidance.",
    mapped_pattern: "Prevention hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  },
  {
    title: "Programs and services",
    source_system: "HHVC reference benchmark",
    reference_type: "service_hub",
    notes: "Reference-only benchmark for programs, workshops, and service entries.",
    mapped_pattern: "Services hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  },
  {
    title: "Tools, fees, and help",
    source_system: "HHVC reference benchmark",
    reference_type: "support_hub",
    notes: "Reference-only benchmark for tools, payments, and support resources.",
    mapped_pattern: "Support hub",
    reference_map_id: REFERENCE_IA_MAP_ID
  }
];

const mapPageConcept = (row) => ({
  id: row.id,
  intentKey: row.intent_key,
  taskStatement: row.task_statement,
  canonicalTitle: row.canonical_title,
  contentType: row.content_type,
  audience: row.audience,
  serviceArea: row.service_area,
  status: row.status,
  summary: row.summary,
  parentConceptId: row.parent_concept_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  governanceFlags: Array.isArray(row.governance_flags) ? row.governance_flags : []
});

const mapIANode = (row) => ({
  id: row.id,
  conceptId: row.concept_id,
  iaMapId: row.ia_map_id,
  parentNodeId: row.parent_node_id,
  position: row.position,
  placementStatus: row.placement_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapPageArtifact = (row) => ({
  id: row.id,
  conceptId: row.concept_id,
  artifactKind: row.artifact_kind,
  source: row.source,
  title: row.title,
  contentType: row.content_type,
  bodyRaw: row.body_raw,
  bodyStructured: clone(row.body_structured || {}),
  workflowStatus: row.workflow_status,
  isCurrent: row.is_current,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  reviewStatus: row.review_status,
  inputs: clone(row.inputs || { topic: row.title || "", userType: row.audience || "", notes: "" }),
  karlConnected: row.karl_connected,
  karlEvaluation: clone(row.karl_evaluation || null),
  skeleton: !!row.skeleton,
  imported: !!row.imported,
  qualityGate: clone(row.quality_gate || null)
});

const mapArtifactVersion = (row, includeSnapshot = false) => {
  const base = {
    id: row.id,
    artifactId: row.artifact_id,
    versionNumber: row.version_number,
    changeType: row.change_type,
    notes: row.notes,
    createdAt: row.created_at
  };
  return includeSnapshot ? { ...base, snapshot: clone(row.snapshot) } : base;
};

const mapArtifactVariant = (row) => ({
  id: row.id,
  conceptId: row.concept_id,
  baseArtifactId: row.base_artifact_id,
  artifactId: row.artifact_id,
  variantLabel: row.variant_label,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapReferenceExample = (row) => ({
  id: row.id,
  title: row.title,
  sourceSystem: row.source_system,
  referenceType: row.reference_type,
  notes: row.notes,
  mappedPattern: row.mapped_pattern,
  referenceMapId: row.reference_map_id
});

const mapBuildQueueItem = (row) => ({
  id: row.id,
  conceptId: row.concept_id,
  artifactId: row.artifact_id,
  queueStatus: row.queue_status,
  priority: row.priority,
  requestedBy: row.requested_by,
  createdAt: row.created_at,
  topic: row.topic,
  audience: row.audience,
  errorMessage: row.error_message || null,
  karlGrade: row.karl_grade || null
});

const pageDraftFromArtifact = (artifact, currentVersionNumber = 0) => {
  const body = clone(artifact.bodyStructured || {});
  return {
    id: artifact.id,
    name: body.name || artifact.title || "",
    userType: body.userType || body.primaryUser || artifact.inputs?.userType || artifact.audience || "",
    userGoal: body.userGoal || "",
    purpose: body.purpose || body.primaryPurpose || "",
    pageType: pageTypeFromContentType(artifact.contentType),
    components: body.components || "",
    relationships: body.relationships || "",
    duplication: body.duplication || "",
    enforcement: body.enforcement || "",
    draft: body.draft || body.pageDraft || artifact.bodyRaw || "",
    integration: body.integration || "",
    valid: body.valid ?? true,
    raw: artifact.bodyRaw || "",
    createdAt: artifact.createdAt,
    karlConnected: artifact.karlConnected ?? false,
    karlEvaluation: artifact.karlEvaluation || undefined,
    skeleton: artifact.skeleton,
    imported: artifact.imported,
    currentVersionNumber: currentVersionNumber || undefined,
    reviewStatus: artifact.reviewStatus,
    qualityGate: artifact.qualityGate || undefined,
    inputs: artifact.inputs || { topic: artifact.title || "", userType: "", notes: "" }
  };
};

const conceptFromPlannedPage = (row) => {
  const title = row.name;
  const audience = row.user_type || "General public";
  const taskStatement = row.page_type === "Topic"
    ? `Choose the right next action from ${title}`
    : `Complete the task: ${title}`;
  return {
    canonical_title: title,
    task_statement: taskStatement,
    content_type: contentTypeFromPageType(row.page_type),
    audience,
    service_area: "hhvc",
    status: "canonical",
    summary: `Canonical concept for ${title}`,
    parent_concept_id: null,
    intent_key: buildIntentKey(taskStatement, audience, "hhvc")
  };
};

const emptyState = () => ({
  meta: {
    nextIds: {
      todos: 1,
      planned_pages: 1,
      user_preferences: 1,
      page_versions: 1,
      page_concepts: 1,
      ia_nodes: 1,
      artifact_versions: 1,
      artifact_variants: 1,
      reference_examples: 1,
      build_queue_items: 1
    }
  },
  pages: [],
  todos: [],
  planned_pages: [],
  user_preferences: [],
  page_versions: [],
  page_concepts: [],
  ia_nodes: [],
  page_artifacts: [],
  artifact_versions: [],
  artifact_variants: [],
  reference_examples: [],
  build_queue_items: []
});

const normalizeState = (state) => {
  const safe = state && typeof state === "object" ? state : {};
  const nextIds = safe.meta?.nextIds || {};
  const pages = Array.isArray(safe.pages) ? safe.pages : [];
  const todos = Array.isArray(safe.todos) ? safe.todos : [];
  const plannedPages = Array.isArray(safe.planned_pages) ? safe.planned_pages.map(normalizePlannedPage) : [];
  const userPreferences = Array.isArray(safe.user_preferences) ? safe.user_preferences : [];
  const pageVersions = Array.isArray(safe.page_versions) ? safe.page_versions : [];
  let pageConcepts = Array.isArray(safe.page_concepts) ? safe.page_concepts : [];
  let iaNodes = Array.isArray(safe.ia_nodes) ? safe.ia_nodes : [];
  let pageArtifacts = Array.isArray(safe.page_artifacts) ? safe.page_artifacts : [];
  let artifactVersions = Array.isArray(safe.artifact_versions) ? safe.artifact_versions : [];
  const artifactVariants = Array.isArray(safe.artifact_variants) ? safe.artifact_variants : [];
  let referenceExamples = Array.isArray(safe.reference_examples) ? safe.reference_examples : [];
  let buildQueueItems = Array.isArray(safe.build_queue_items) ? safe.build_queue_items : [];

  if (pageConcepts.length === 0 && plannedPages.length > 0) {
    const conceptIdByLegacyId = new Map();
    pageConcepts = plannedPages.map((row, index) => {
      const concept = conceptFromPlannedPage(row);
      const id = index + 1;
      conceptIdByLegacyId.set(row.id, id);
      return {
        id,
        ...concept,
        created_at: row.created_at,
        updated_at: row.created_at,
        governance_flags: validateConceptDraft({
          canonicalTitle: concept.canonical_title,
          taskStatement: concept.task_statement,
          contentType: concept.content_type
        })
      };
    });

    iaNodes = plannedPages.map((row, index) => ({
      id: index + 1,
      concept_id: conceptIdByLegacyId.get(row.id),
      ia_map_id: WORKING_IA_MAP_ID,
      parent_node_id: row.parent_id != null ? conceptIdByLegacyId.get(row.parent_id) || null : null,
      position: index,
      placement_status: row.parent_id == null ? "placed" : "placed",
      created_at: row.created_at,
      updated_at: row.created_at,
      legacy_planned_page_id: row.id,
      built_page_id: row.built_page_id || null
    }));
  }

  if (pageArtifacts.length === 0 && pages.length > 0) {
    const conceptByBuiltPageId = new Map(
      iaNodes
        .filter((node) => node.built_page_id)
        .map((node) => [node.built_page_id, node.concept_id])
    );
    pageArtifacts = pages.map((row) => {
      const data = clone(row.data || {});
      const conceptId = conceptByBuiltPageId.get(row.id) || null;
      return {
        id: row.id,
        concept_id: conceptId,
        artifact_kind: artifactKindFromPage(data),
        source: data.imported ? "import" : "generate",
        title: data.name || row.id,
        content_type: contentTypeFromPageType(data.pageType || ""),
        body_raw: data.raw || "",
        body_structured: data,
        workflow_status: artifactWorkflowFromPage(data),
        is_current: true,
        created_at: row.created_at || data.createdAt || new Date().toISOString(),
        updated_at: row.created_at || data.createdAt || new Date().toISOString(),
        review_status: data.reviewStatus || null,
        inputs: clone(data.inputs || { topic: data.name || row.id, userType: data.userType || "", notes: "" }),
        karl_connected: data.karlConnected ?? false,
        karl_evaluation: clone(data.karlEvaluation || null),
        skeleton: !!data.skeleton,
        imported: !!data.imported,
        quality_gate: clone(data.qualityGate || null)
      };
    });
  }

  if (artifactVersions.length === 0 && pageVersions.length > 0) {
    artifactVersions = pageVersions.map((row) => ({
      id: row.id,
      artifact_id: row.page_id,
      version_number: row.version_number,
      change_type: row.trigger === "manual" ? "edit" : row.trigger,
      snapshot: clone(row.data || null),
      notes: row.notes || null,
      created_at: row.created_at
    }));
  }

  if (referenceExamples.length === 0) {
    referenceExamples = DEFAULT_REFERENCE_EXAMPLES.map((row, index) => ({
      id: index + 1,
      ...row
    }));
  }

  if (buildQueueItems.length === 0 && todos.length > 0) {
    const conceptIdByLegacyPlannedId = new Map(
      iaNodes
        .filter((node) => node.legacy_planned_page_id != null)
        .map((node) => [node.legacy_planned_page_id, node.concept_id])
    );
    buildQueueItems = todos.map((row) => ({
      id: row.id,
      concept_id: row.planned_id != null ? conceptIdByLegacyPlannedId.get(Number(row.planned_id)) || null : null,
      artifact_id: row.built_page_id || null,
      queue_status: row.status || (row.done ? "done" : "queued"),
      priority: 50,
      requested_by: "legacy-migration",
      created_at: row.created_at || new Date().toISOString(),
      topic: row.topic,
      audience: row.user_type,
      error_message: row.error_message || null,
      karl_grade: row.karl_grade || null
    }));
  }

  return {
    meta: {
      nextIds: {
        todos: Number(nextIds.todos) || (Math.max(0, ...todos.map((row) => Number(row.id) || 0)) + 1),
        planned_pages: Number(nextIds.planned_pages) || (Math.max(0, ...plannedPages.map((row) => Number(row.id) || 0)) + 1),
        user_preferences: Number(nextIds.user_preferences) || (Math.max(0, ...userPreferences.map((row) => Number(row.id) || 0)) + 1),
        page_versions: Number(nextIds.page_versions) || (Math.max(0, ...pageVersions.map((row) => Number(row.id) || 0)) + 1),
        page_concepts: Number(nextIds.page_concepts) || (Math.max(0, ...pageConcepts.map((row) => Number(row.id) || 0)) + 1),
        ia_nodes: Number(nextIds.ia_nodes) || (Math.max(0, ...iaNodes.map((row) => Number(row.id) || 0)) + 1),
        artifact_versions: Number(nextIds.artifact_versions) || (Math.max(0, ...artifactVersions.map((row) => Number(row.id) || 0)) + 1),
        artifact_variants: Number(nextIds.artifact_variants) || (Math.max(0, ...artifactVariants.map((row) => Number(row.id) || 0)) + 1),
        reference_examples: Number(nextIds.reference_examples) || (Math.max(0, ...referenceExamples.map((row) => Number(row.id) || 0)) + 1),
        build_queue_items: Number(nextIds.build_queue_items) || (Math.max(0, ...buildQueueItems.map((row) => Number(row.id) || 0)) + 1)
      }
    },
    pages,
    todos,
    planned_pages: plannedPages,
    user_preferences: userPreferences,
    page_versions: pageVersions,
    page_concepts: pageConcepts,
    ia_nodes: iaNodes,
    page_artifacts: pageArtifacts,
    artifact_versions: artifactVersions,
    artifact_variants: artifactVariants,
    reference_examples: referenceExamples,
    build_queue_items: buildQueueItems
  };
};

const mapTodo = (row) => ({
  id: row.id,
  topic: row.topic,
  userType: row.user_type,
  done: row.done,
  status: row.status || "pending",
  errorMessage: row.error_message || null,
  builtPageId: row.built_page_id || null,
  karlGrade: row.karl_grade || null,
  plannedId: row.planned_id != null ? Number(row.planned_id) : null
});

const mapPlannedPage = (row) => ({
  id: row.id,
  name: row.name,
  pageType: row.page_type,
  userType: row.user_type,
  parentId: row.parent_id,
  builtPageId: row.built_page_id,
  createdAt: row.created_at
});

const mapPreference = (row) => ({
  id: row.id,
  preference: row.preference,
  source: row.source,
  pageId: row.page_id,
  createdAt: row.created_at
});

const mapVersion = (row, includeData = false) => {
  const base = {
    id: row.id,
    pageId: row.page_id,
    versionNumber: row.version_number,
    notes: row.notes,
    trigger: row.trigger,
    createdAt: row.created_at
  };
  return includeData ? { ...base, data: row.data } : base;
};

const applyPageListOptions = (
  page,
  { fields, includeDraft = true, includeRaw = true, includeDraftPreview = true, draftPreviewChars = 280 } = {}
) => {
  const next = clone(page);
  if (includeDraftPreview && typeof next.draft === "string") {
    next.draftPreview = next.draft.slice(0, Math.max(0, Number(draftPreviewChars) || 0));
  }
  if (!includeDraft) delete next.draft;
  if (!includeRaw) delete next.raw;
  if (!Array.isArray(fields) || fields.length === 0) return next;
  const selected = {};
  for (const field of fields) {
    if (Object.hasOwn(next, field)) selected[field] = next[field];
  }
  return selected;
};

export const formatPersistenceError = (error) => {
  if (!error) return "Unknown persistence error";

  const parts = [];
  if (error.message) parts.push(error.message);
  if (error.code) parts.push(`code=${error.code}`);

  if (Array.isArray(error.errors) && error.errors.length > 0) {
    parts.push(
      error.errors
        .map((entry) => entry?.message || [entry?.code, entry?.address, entry?.port].filter(Boolean).join(" "))
        .filter(Boolean)
        .join("; ")
    );
  }

  return parts.join(" | ") || String(error);
};

const createFileStore = async (filePath = DEFAULT_LOCAL_DB_PATH) => {
  const resolvedPath = resolve(filePath || DEFAULT_LOCAL_DB_PATH);
  await mkdir(dirname(resolvedPath), { recursive: true });

  let state = emptyState();
  let needsPersist = false;

  try {
    const parsed = JSON.parse(await readFile(resolvedPath, "utf8"));
    state = normalizeState(parsed);
    needsPersist = JSON.stringify(state) !== JSON.stringify(parsed);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  }

  if (needsPersist) {
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  }

  const persist = async () => {
    await writeFile(resolvedPath, JSON.stringify(state, null, 2));
  };

  const nextId = (key) => {
    const id = state.meta.nextIds[key] || 1;
    state.meta.nextIds[key] = id + 1;
    return id;
  };

  const findConceptById = (id) => state.page_concepts.find((row) => String(row.id) === String(id));
  const findArtifactById = (id) => state.page_artifacts.find((row) => String(row.id) === String(id));
  const currentArtifacts = () => state.page_artifacts.filter((row) => row.is_current !== false);
  const listCurrentPageDrafts = () => {
    const maxByArtifact = new Map();
    for (const r of state.artifact_versions) {
      const aid = r.artifact_id;
      const n = r.version_number;
      const prev = maxByArtifact.get(aid);
      if (prev == null || n > prev) maxByArtifact.set(aid, n);
    }
    return currentArtifacts().map((artifact) => pageDraftFromArtifact(mapPageArtifact(artifact), maxByArtifact.get(artifact.id) || 0));
  };
  const hydrateConceptFlags = (concept, excludeId) => {
    const validationFlags = validateConceptDraft({
      canonicalTitle: concept.canonical_title,
      taskStatement: concept.task_statement,
      contentType: concept.content_type
    });
    const duplicateFlags = findConceptConflicts(
      state.page_concepts.map(mapPageConcept),
      {
        canonicalTitle: concept.canonical_title,
        taskStatement: concept.task_statement,
        audience: concept.audience,
        serviceArea: concept.service_area
      },
      excludeId
    );
    return [...validationFlags, ...duplicateFlags];
  };

  return {
    mode: "file",
    location: resolvedPath,
    async listPreferences(pageId) {
      return state.user_preferences
        .filter((row) => (pageId ? row.page_id === pageId : row.page_id == null))
        .sort(byCreatedDesc)
        .map(mapPreference);
    },
    async createPreference(preference, source, pageId) {
      const row = {
        id: nextId("user_preferences"),
        preference,
        source,
        page_id: pageId ?? null,
        created_at: new Date().toISOString()
      };
      state.user_preferences.push(row);
      await persist();
      return mapPreference(row);
    },
    async deletePreference(id) {
      state.user_preferences = state.user_preferences.filter((row) => String(row.id) !== String(id));
      await persist();
    },
    async listPages(options = {}) {
      const {
        fields,
        includeDraft = true,
        includeRaw = true,
        includeDraftPreview = true,
        draftPreviewChars = 280,
        limit,
        offset = 0
      } = options;
      const pages = listCurrentPageDrafts()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((row) => applyPageListOptions(row, { fields, includeDraft, includeRaw, includeDraftPreview, draftPreviewChars }));
      const safeOffset = Math.max(0, Number(offset) || 0);
      if (!Number.isInteger(limit) || limit < 0) return pages.slice(safeOffset);
      return pages.slice(safeOffset, safeOffset + limit);
    },
    async getPage(id) {
      const row = findArtifactById(id);
      if (!row) return null;
      const maxVersion = state.artifact_versions
        .filter((entry) => String(entry.artifact_id) === String(row.id))
        .reduce((max, entry) => {
          const n = Number(entry.version_number) || 0;
          return n > max ? n : max;
        }, 0);
      const data = pageDraftFromArtifact(mapPageArtifact(row), maxVersion);
      return data;
    },
    async savePage(id, data) {
      const payload = stripEphemeralPageFields(data);
      const existing = findArtifactById(id);
      const existingConceptId = existing?.concept_id || null;
      const bodyStructured = clone(payload);
      const now = new Date().toISOString();
      if (existing) {
        existing.title = payload?.name || existing.title;
        existing.content_type = contentTypeFromPageType(payload?.pageType || pageTypeFromContentType(existing.content_type));
        existing.body_raw = payload?.raw || existing.body_raw;
        existing.body_structured = bodyStructured;
        existing.workflow_status = artifactWorkflowFromPage(payload);
        existing.artifact_kind = artifactKindFromPage(payload);
        existing.updated_at = now;
        existing.review_status = payload?.reviewStatus || null;
        existing.inputs = clone(payload?.inputs || existing.inputs || { topic: payload?.name || existing.title, userType: payload?.userType || "", notes: "" });
        existing.karl_connected = payload?.karlConnected ?? false;
        existing.karl_evaluation = clone(payload?.karlEvaluation || null);
        existing.skeleton = !!payload?.skeleton;
        existing.imported = !!payload?.imported;
        existing.quality_gate = clone(payload?.qualityGate || null);
        existing.concept_id = existingConceptId;
      } else {
        state.page_artifacts.push({
          id,
          concept_id: null,
          artifact_kind: artifactKindFromPage(payload),
          source: payload?.imported ? "import" : "generate",
          title: payload?.name || id,
          content_type: contentTypeFromPageType(payload?.pageType || ""),
          body_raw: payload?.raw || "",
          body_structured: bodyStructured,
          workflow_status: artifactWorkflowFromPage(payload),
          is_current: true,
          created_at: payload?.createdAt || now,
          updated_at: now,
          review_status: payload?.reviewStatus || null,
          inputs: clone(payload?.inputs || { topic: payload?.name || id, userType: payload?.userType || "", notes: "" }),
          karl_connected: payload?.karlConnected ?? false,
          karl_evaluation: clone(payload?.karlEvaluation || null),
          skeleton: !!payload?.skeleton,
          imported: !!payload?.imported,
          quality_gate: clone(payload?.qualityGate || null)
        });
      }
      await persist();
    },
    async deletePage(id) {
      state.page_artifacts = state.page_artifacts.filter((row) => row.id !== id);
      state.artifact_versions = state.artifact_versions.filter((row) => row.artifact_id !== id);
      await persist();
    },
    async listPageNames() {
      return state.page_artifacts.map((row) => ({ name: row.title || "" }));
    },
    async insertImportedPage(id, data, createdAt) {
      state.page_artifacts.push({
        id,
        concept_id: null,
        artifact_kind: "imported",
        source: "import",
        title: data?.name || id,
        content_type: contentTypeFromPageType(data?.pageType || ""),
        body_raw: data?.raw || "",
        body_structured: stripEphemeralPageFields(data),
        workflow_status: "in_review",
        is_current: true,
        created_at: createdAt || data?.createdAt || new Date().toISOString(),
        updated_at: createdAt || data?.createdAt || new Date().toISOString(),
        review_status: data?.reviewStatus || "pending",
        inputs: clone(data?.inputs || { topic: data?.name || id, userType: data?.userType || "", notes: "" }),
        karl_connected: data?.karlConnected ?? false,
        karl_evaluation: clone(data?.karlEvaluation || null),
        skeleton: !!data?.skeleton,
        imported: true,
        quality_gate: clone(data?.qualityGate || null)
      });
      await persist();
    },
    async updatePageReview(id, status) {
      const row = findArtifactById(id);
      if (!row) return null;
      row.review_status = status;
      row.workflow_status = status === "approved" ? "approved" : status === "rejected" ? "archived" : "in_review";
      if (row.body_structured && typeof row.body_structured === "object") {
        row.body_structured = {
          ...stripEphemeralPageFields(row.body_structured),
          reviewStatus: status
        };
      }
      row.updated_at = new Date().toISOString();
      await persist();
      return pageDraftFromArtifact(mapPageArtifact(row));
    },
    async listTodos() {
      return state.build_queue_items
        .slice()
        .sort(byCreatedAsc)
        .map((row) => ({
          id: row.id,
          topic: row.topic,
          userType: row.audience,
          done: row.queue_status === "done",
          status: row.queue_status === "queued" ? "pending" : row.queue_status,
          errorMessage: row.error_message || null,
          builtPageId: row.artifact_id || null,
          karlGrade: row.karl_grade || null,
          plannedId: row.concept_id != null ? Number(row.concept_id) : null
        }));
    },
    async createTodo(topic, userType, { plannedId } = {}) {
      const row = {
        id: nextId("build_queue_items"),
        concept_id: plannedId ?? null,
        artifact_id: null,
        queue_status: "queued",
        priority: 50,
        requested_by: "manual",
        created_at: new Date().toISOString(),
        topic,
        audience: userType,
        error_message: null,
        karl_grade: null
      };
      state.build_queue_items.push(row);
      await persist();
      return {
        id: row.id,
        topic: row.topic,
        userType: row.audience,
        done: false,
        status: "pending",
        errorMessage: null,
        builtPageId: null,
        karlGrade: null,
        plannedId: row.concept_id
      };
    },
    async updateTodo(id, done) {
      const row = state.build_queue_items.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      row.queue_status = done ? "done" : "queued";
      await persist();
      return {
        id: row.id,
        topic: row.topic,
        userType: row.audience,
        done,
        status: done ? "done" : "pending",
        errorMessage: row.error_message || null,
        builtPageId: row.artifact_id || null,
        karlGrade: row.karl_grade || null,
        plannedId: row.concept_id
      };
    },
    async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
      const row = state.build_queue_items.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      if (status !== undefined) row.queue_status = status === "pending" ? "queued" : status;
      if (errorMessage !== undefined) row.error_message = errorMessage;
      if (builtPageId !== undefined) row.artifact_id = builtPageId;
      if (karlGrade !== undefined) row.karl_grade = karlGrade;
      await persist();
      return {
        id: row.id,
        topic: row.topic,
        userType: row.audience,
        done: row.queue_status === "done",
        status: row.queue_status === "queued" ? "pending" : row.queue_status,
        errorMessage: row.error_message || null,
        builtPageId: row.artifact_id || null,
        karlGrade: row.karl_grade || null,
        plannedId: row.concept_id
      };
    },
    async deleteTodo(id) {
      state.build_queue_items = state.build_queue_items.filter((row) => String(row.id) !== String(id));
      await persist();
    },
    async listPlannedPages() {
      const nodeByConceptId = new Map(
        state.ia_nodes
          .filter((node) => node.ia_map_id === WORKING_IA_MAP_ID)
          .map((node) => [node.concept_id, node])
      );
      const builtArtifactByConceptId = new Map(
        state.page_artifacts
          .filter((artifact) => artifact.concept_id != null && artifact.is_current !== false)
          .map((artifact) => [artifact.concept_id, artifact.id])
      );
      return state.page_concepts
        .slice()
        .sort(byCreatedAsc)
        .map((concept) => {
          const node = nodeByConceptId.get(concept.id);
          return {
            id: concept.id,
            name: concept.canonical_title,
            pageType: pageTypeFromContentType(concept.content_type),
            userType: concept.audience,
            parentId: node?.parent_node_id || null,
            builtPageId: builtArtifactByConceptId.get(concept.id) || null,
            createdAt: concept.created_at,
            conceptId: concept.id,
            status: concept.status,
            objectRole: "concept",
            taskStatement: concept.task_statement,
            governanceFlags: concept.governance_flags || []
          };
        });
    },
    async getPlannedPage(id) {
      const concept = findConceptById(id);
      if (!concept) return null;
      const node = state.ia_nodes.find((entry) => String(entry.concept_id) === String(id) && entry.ia_map_id === WORKING_IA_MAP_ID);
      const artifact = state.page_artifacts.find((entry) => String(entry.concept_id) === String(id) && entry.is_current !== false);
      return {
        id: concept.id,
        name: concept.canonical_title,
        pageType: pageTypeFromContentType(concept.content_type),
        userType: concept.audience,
        parentId: node?.parent_node_id || null,
        builtPageId: artifact?.id || null,
        createdAt: concept.created_at,
        conceptId: concept.id,
        status: concept.status,
        objectRole: "concept",
        taskStatement: concept.task_statement,
        governanceFlags: concept.governance_flags || []
      };
    },
    async createPlannedPage(name, pageType, userType, parentId) {
      const now = new Date().toISOString();
      const concept = {
        id: nextId("page_concepts"),
        canonical_title: name,
        task_statement: pageType === "Topic" ? `Choose the right next action from ${name}` : `Complete the task: ${name}`,
        content_type: contentTypeFromPageType(pageType),
        audience: userType,
        service_area: "hhvc",
        status: "canonical",
        summary: `Canonical concept for ${name}`,
        parent_concept_id: parentId ?? null,
        intent_key: buildIntentKey(pageType === "Topic" ? `Choose the right next action from ${name}` : `Complete the task: ${name}`, userType, "hhvc"),
        created_at: now,
        updated_at: now,
        governance_flags: []
      };
      concept.governance_flags = hydrateConceptFlags(concept);
      if (concept.governance_flags.some((flag) => flag.severity === "error")) {
        throw new Error(concept.governance_flags.map((flag) => flag.message).join(" "));
      }
      state.page_concepts.push(concept);
      state.ia_nodes.push({
        id: nextId("ia_nodes"),
        concept_id: concept.id,
        ia_map_id: WORKING_IA_MAP_ID,
        parent_node_id: parentId ?? null,
        position: state.ia_nodes.filter((node) => node.ia_map_id === WORKING_IA_MAP_ID).length,
        placement_status: parentId == null ? "placed" : "placed",
        created_at: now,
        updated_at: now
      });
      await persist();
      return this.getPlannedPage(concept.id);
    },
    async updatePlannedPage(id, patch) {
      const row = findConceptById(id);
      if (!row) return null;
      if (patch.name !== undefined) row.canonical_title = patch.name;
      if (patch.pageType !== undefined) row.content_type = contentTypeFromPageType(patch.pageType);
      if (patch.userType !== undefined) row.audience = patch.userType;
      if (patch.parentId !== undefined) row.parent_concept_id = patch.parentId;
      row.intent_key = buildIntentKey(row.task_statement, row.audience, row.service_area);
      row.updated_at = new Date().toISOString();
      row.governance_flags = hydrateConceptFlags(row, Number(id));
      if (row.governance_flags.some((flag) => flag.severity === "error")) {
        throw new Error(row.governance_flags.map((flag) => flag.message).join(" "));
      }
      const node = state.ia_nodes.find((entry) => String(entry.concept_id) === String(id) && entry.ia_map_id === WORKING_IA_MAP_ID);
      if (node) {
        if (patch.parentId !== undefined) node.parent_node_id = patch.parentId;
        if (patch.builtPageId !== undefined && patch.builtPageId) {
          const artifact = findArtifactById(patch.builtPageId);
          if (artifact) artifact.concept_id = Number(id);
        }
        node.updated_at = new Date().toISOString();
      }
      await persist();
      return this.getPlannedPage(id);
    },
    async deletePlannedPage(id) {
      state.page_concepts = state.page_concepts.filter((row) => String(row.id) !== String(id));
      state.ia_nodes = state.ia_nodes
        .filter((row) => String(row.concept_id) !== String(id))
        .map((row) => (String(row.parent_node_id) === String(id) ? { ...row, parent_node_id: null } : row));
      await persist();
    },
    async saveVersion(pageId, data, notes, trigger) {
      const existing = state.artifact_versions.filter(r => r.artifact_id === pageId);
      const maxNum = existing.length > 0 ? Math.max(...existing.map(r => r.version_number)) : 0;
      const row = {
        id: nextId("artifact_versions"),
        artifact_id: pageId,
        version_number: maxNum + 1,
        snapshot: clone(data),
        notes: notes || null,
        change_type: trigger === "manual" ? "edit" : trigger,
        created_at: new Date().toISOString()
      };
      state.artifact_versions.push(row);
      const forPage = state.artifact_versions
        .filter(r => r.artifact_id === pageId)
        .sort((a, b) => a.version_number - b.version_number);
      if (forPage.length > PAGE_VERSION_RETENTION) {
        const toDrop = forPage.slice(0, forPage.length - PAGE_VERSION_RETENTION);
        const dropIds = new Set(toDrop.map((r) => r.id));
        state.artifact_versions = state.artifact_versions.filter((r) => !dropIds.has(r.id));
      }
      await persist();
    },
    async getVersions(pageId, { limit, includeData = false } = {}) {
      let versions = state.artifact_versions
        .filter(r => r.artifact_id === pageId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(r => ({
          id: r.id,
          pageId: r.artifact_id,
          versionNumber: r.version_number,
          notes: r.notes,
          trigger: r.change_type === "edit" ? "manual" : r.change_type,
          createdAt: r.created_at,
          ...(includeData ? { data: r.snapshot } : {})
        }));
      if (limit) versions = versions.slice(0, limit);
      return versions;
    },
    async getVersion(versionId) {
      const row = state.artifact_versions.find(r => String(r.id) === String(versionId));
      return row ? {
        id: row.id,
        pageId: row.artifact_id,
        versionNumber: row.version_number,
        notes: row.notes,
        trigger: row.change_type === "edit" ? "manual" : row.change_type,
        createdAt: row.created_at,
        data: row.snapshot
      } : null;
    },
    async listPageConcepts() {
      return state.page_concepts.slice().sort(byCreatedAsc).map(mapPageConcept);
    },
    async getPageConcept(id) {
      const row = findConceptById(id);
      return row ? mapPageConcept(row) : null;
    },
    async createPageConcept(payload) {
      const now = new Date().toISOString();
      const row = {
        id: nextId("page_concepts"),
        intent_key: buildIntentKey(payload.taskStatement, payload.audience, payload.serviceArea),
        task_statement: payload.taskStatement,
        canonical_title: payload.canonicalTitle,
        content_type: payload.contentType,
        audience: payload.audience,
        service_area: payload.serviceArea,
        status: payload.status || "proposed",
        summary: payload.summary || "",
        parent_concept_id: payload.parentConceptId ?? null,
        created_at: now,
        updated_at: now,
        governance_flags: []
      };
      row.governance_flags = hydrateConceptFlags(row);
      if (row.governance_flags.some((flag) => flag.severity === "error")) {
        throw new Error(row.governance_flags.map((flag) => flag.message).join(" "));
      }
      state.page_concepts.push(row);
      await persist();
      return mapPageConcept(row);
    },
    async updatePageConcept(id, patch) {
      const row = findConceptById(id);
      if (!row) return null;
      if (patch.taskStatement !== undefined) row.task_statement = patch.taskStatement;
      if (patch.canonicalTitle !== undefined) row.canonical_title = patch.canonicalTitle;
      if (patch.contentType !== undefined) row.content_type = patch.contentType;
      if (patch.audience !== undefined) row.audience = patch.audience;
      if (patch.serviceArea !== undefined) row.service_area = patch.serviceArea;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.summary !== undefined) row.summary = patch.summary;
      if (patch.parentConceptId !== undefined) row.parent_concept_id = patch.parentConceptId;
      row.intent_key = buildIntentKey(row.task_statement, row.audience, row.service_area);
      row.updated_at = new Date().toISOString();
      row.governance_flags = hydrateConceptFlags(row, Number(id));
      if (row.governance_flags.some((flag) => flag.severity === "error")) {
        throw new Error(row.governance_flags.map((flag) => flag.message).join(" "));
      }
      await persist();
      return mapPageConcept(row);
    },
    async listIANodes(mapId = WORKING_IA_MAP_ID) {
      return state.ia_nodes.filter((row) => row.ia_map_id === mapId).sort((a, b) => a.position - b.position).map(mapIANode);
    },
    async createIANode(payload) {
      const now = new Date().toISOString();
      const row = {
        id: nextId("ia_nodes"),
        concept_id: payload.conceptId,
        ia_map_id: payload.iaMapId || WORKING_IA_MAP_ID,
        parent_node_id: payload.parentNodeId ?? null,
        position: payload.position ?? state.ia_nodes.length,
        placement_status: payload.placementStatus || "placed",
        created_at: now,
        updated_at: now
      };
      state.ia_nodes.push(row);
      await persist();
      return mapIANode(row);
    },
    async updateIANode(id, patch) {
      const row = state.ia_nodes.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      if (patch.parentNodeId !== undefined) row.parent_node_id = patch.parentNodeId;
      if (patch.position !== undefined) row.position = patch.position;
      if (patch.placementStatus !== undefined) row.placement_status = patch.placementStatus;
      row.updated_at = new Date().toISOString();
      await persist();
      return mapIANode(row);
    },
    async listPageArtifacts() {
      return state.page_artifacts.slice().sort(byCreatedAsc).map(mapPageArtifact);
    },
    async getPageArtifact(id) {
      const row = findArtifactById(id);
      return row ? mapPageArtifact(row) : null;
    },
    async updatePageArtifact(id, patch) {
      const row = findArtifactById(id);
      if (!row) return null;
      if (patch.conceptId !== undefined) row.concept_id = patch.conceptId;
      if (patch.artifactKind !== undefined) row.artifact_kind = patch.artifactKind;
      if (patch.workflowStatus !== undefined) row.workflow_status = patch.workflowStatus;
      if (patch.isCurrent !== undefined) row.is_current = patch.isCurrent;
      row.updated_at = new Date().toISOString();
      await persist();
      return mapPageArtifact(row);
    },
    async listArtifactVariants() {
      return state.artifact_variants.slice().sort(byCreatedAsc).map(mapArtifactVariant);
    },
    async createArtifactVariant(payload) {
      const now = new Date().toISOString();
      const row = {
        id: nextId("artifact_variants"),
        concept_id: payload.conceptId,
        base_artifact_id: payload.baseArtifactId,
        artifact_id: payload.artifactId,
        variant_label: payload.variantLabel,
        reason: payload.reason || "",
        status: payload.status || "exploring",
        created_at: now,
        updated_at: now
      };
      state.artifact_variants.push(row);
      await persist();
      return mapArtifactVariant(row);
    },
    async listReferenceExamples() {
      return state.reference_examples.slice().sort((a, b) => a.id - b.id).map(mapReferenceExample);
    },
    async listBuildQueueItems() {
      return state.build_queue_items.slice().sort(byCreatedAsc).map(mapBuildQueueItem);
    },
    async createBuildQueueItem(payload) {
      const row = {
        id: nextId("build_queue_items"),
        concept_id: payload.conceptId ?? null,
        artifact_id: payload.artifactId ?? null,
        queue_status: payload.queueStatus || "queued",
        priority: payload.priority ?? 50,
        requested_by: payload.requestedBy || "manual",
        created_at: new Date().toISOString(),
        topic: payload.topic,
        audience: payload.audience,
        error_message: null,
        karl_grade: null
      };
      state.build_queue_items.push(row);
      await persist();
      return mapBuildQueueItem(row);
    },
    async updateBuildQueueItem(id, patch) {
      const row = state.build_queue_items.find((entry) => String(entry.id) === String(id));
      if (!row) return null;
      if (patch.conceptId !== undefined) row.concept_id = patch.conceptId;
      if (patch.artifactId !== undefined) row.artifact_id = patch.artifactId;
      if (patch.queueStatus !== undefined) row.queue_status = patch.queueStatus;
      if (patch.priority !== undefined) row.priority = patch.priority;
      if (patch.requestedBy !== undefined) row.requested_by = patch.requestedBy;
      if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
      if (patch.karlGrade !== undefined) row.karl_grade = patch.karlGrade;
      await persist();
      return mapBuildQueueItem(row);
    },
    async deleteBuildQueueItem(id) {
      state.build_queue_items = state.build_queue_items.filter((row) => String(row.id) !== String(id));
      await persist();
    }
  };
};

const initPostgres = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      topic TEXT NOT NULL,
      user_type TEXT NOT NULL,
      done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS error_message TEXT`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS built_page_id TEXT`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS karl_grade TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planned_pages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      page_type TEXT NOT NULL,
      user_type TEXT NOT NULL,
      parent_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL,
      built_page_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS planned_id INTEGER REFERENCES planned_pages(id) ON DELETE SET NULL`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id SERIAL PRIMARY KEY,
      preference TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      page_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS page_id TEXT
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_versions (
      id SERIAL PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      data JSONB NOT NULL,
      notes TEXT,
      trigger TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

const createPostgresStore = (pool) => ({
  mode: "postgres",
  async listPreferences(pageId) {
    const result = pageId
      ? await pool.query("SELECT * FROM user_preferences WHERE page_id = $1 ORDER BY created_at DESC", [pageId])
      : await pool.query("SELECT * FROM user_preferences WHERE page_id IS NULL ORDER BY created_at DESC");
    return result.rows.map(mapPreference);
  },
  async createPreference(preference, source, pageId) {
    const result = await pool.query(
      "INSERT INTO user_preferences (preference, source, page_id) VALUES ($1, $2, $3) RETURNING *",
      [preference, source, pageId ?? null]
    );
    return mapPreference(result.rows[0]);
  },
  async deletePreference(id) {
    await pool.query("DELETE FROM user_preferences WHERE id = $1", [id]);
  },
  async listPages(options = {}) {
    const {
      fields,
      includeDraft = true,
      includeRaw = true,
      includeDraftPreview = true,
      draftPreviewChars = 280,
      limit,
      offset = 0
    } = options;
    const safeOffset = Math.max(0, Number(offset) || 0);
    const limitClause = Number.isInteger(limit) && limit >= 0 ? " LIMIT $1 OFFSET $2" : " OFFSET $1";
    const params = Number.isInteger(limit) && limit >= 0 ? [limit, safeOffset] : [safeOffset];
    const result = await pool.query(`
      SELECT p.id AS page_id, p.data AS data, COALESCE(m.max_vn, 0)::int AS max_version
      FROM pages p
      LEFT JOIN (
        SELECT page_id, MAX(version_number) AS max_vn
        FROM page_versions
        GROUP BY page_id
      ) m ON m.page_id = p.id
      ORDER BY p.created_at ASC
      ${limitClause}
    `, params);
    return result.rows.map((row) => {
      const raw = row.data;
      const data = typeof raw === "string" ? JSON.parse(raw) : clone(raw);
      data.id = row.page_id;
      if (row.max_version > 0) data.currentVersionNumber = row.max_version;
      return applyPageListOptions(data, { fields, includeDraft, includeRaw, includeDraftPreview, draftPreviewChars });
    });
  },
  async getPage(id) {
    const result = await pool.query(
      `
      SELECT p.id AS page_id, p.data AS data, COALESCE(m.max_vn, 0)::int AS max_version
      FROM pages p
      LEFT JOIN (
        SELECT page_id, MAX(version_number) AS max_vn
        FROM page_versions
        GROUP BY page_id
      ) m ON m.page_id = p.id
      WHERE p.id = $1 OR (p.data->>'id') = $1
      LIMIT 1
      `,
      [id]
    );
    if (!result.rows[0]) return null;
    const raw = result.rows[0].data;
    const data = typeof raw === "string" ? JSON.parse(raw) : clone(raw);
    data.id = result.rows[0].page_id;
    if (result.rows[0].max_version > 0) data.currentVersionNumber = result.rows[0].max_version;
    return data;
  },
  async savePage(id, data) {
    const payload = stripEphemeralPageFields(data);
    await pool.query(
      "INSERT INTO pages (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2",
      [id, JSON.stringify(payload)]
    );
  },
  async deletePage(id) {
    await pool.query("DELETE FROM pages WHERE id = $1", [id]);
  },
  async listPageNames() {
    const result = await pool.query("SELECT data->>'name' AS name FROM pages");
    return result.rows;
  },
  async insertImportedPage(id, data, createdAt) {
    const payload = stripEphemeralPageFields(data);
    await pool.query(
      "INSERT INTO pages (id, data, created_at) VALUES ($1, $2, $3)",
      [id, JSON.stringify(payload), createdAt]
    );
  },
  async updatePageReview(id, status) {
    const result = await pool.query(
      "UPDATE pages SET data = data || $1::jsonb WHERE id = $2 RETURNING data",
      [JSON.stringify({ reviewStatus: status }), id]
    );
    return result.rows[0]?.data || null;
  },
  async listTodos() {
    const result = await pool.query("SELECT * FROM todos ORDER BY created_at ASC");
    return result.rows.map(mapTodo);
  },
  async createTodo(topic, userType, { plannedId } = {}) {
    const result =
      plannedId != null
        ? await pool.query(
            "INSERT INTO todos (topic, user_type, planned_id) VALUES ($1, $2, $3) RETURNING *",
            [topic, userType, plannedId]
          )
        : await pool.query("INSERT INTO todos (topic, user_type) VALUES ($1, $2) RETURNING *", [topic, userType]);
    return mapTodo(result.rows[0]);
  },
  async updateTodo(id, done) {
    const result = await pool.query(
      "UPDATE todos SET done = $1 WHERE id = $2 RETURNING *",
      [done, id]
    );
    return result.rows[0] ? mapTodo(result.rows[0]) : null;
  },
  async updateTodoQueue(id, { status, errorMessage, builtPageId, karlGrade }) {
    const columns = [];
    const values = [];
    let i = 1;
    if (status !== undefined) {
      columns.push(`status = $${i++}`);
      values.push(status);
    }
    if (errorMessage !== undefined) {
      columns.push(`error_message = $${i++}`);
      values.push(errorMessage);
    }
    if (builtPageId !== undefined) {
      columns.push(`built_page_id = $${i++}`);
      values.push(builtPageId);
    }
    if (karlGrade !== undefined) {
      columns.push(`karl_grade = $${i++}`);
      values.push(karlGrade);
    }
    if (columns.length === 0) return null;
    values.push(id);
    const result = await pool.query(
      `UPDATE todos SET ${columns.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0] ? mapTodo(result.rows[0]) : null;
  },
  async deleteTodo(id) {
    await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  },
  async listPlannedPages() {
    const result = await pool.query("SELECT * FROM planned_pages ORDER BY created_at ASC");
    return result.rows.map(mapPlannedPage);
  },
  async getPlannedPage(id) {
    const result = await pool.query("SELECT * FROM planned_pages WHERE id = $1", [id]);
    return result.rows[0] ? mapPlannedPage(result.rows[0]) : null;
  },
  async createPlannedPage(name, pageType, userType, parentId) {
    const result = await pool.query(
      "INSERT INTO planned_pages (name, page_type, user_type, parent_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, pageType, userType, parentId ?? null]
    );
    return mapPlannedPage(result.rows[0]);
  },
  async updatePlannedPage(id, patch) {
    const fields = [];
    const values = [];
    let index = 1;

    if (patch.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(patch.name);
    }
    if (patch.pageType !== undefined) {
      fields.push(`page_type = $${index++}`);
      values.push(patch.pageType);
    }
    if (patch.userType !== undefined) {
      fields.push(`user_type = $${index++}`);
      values.push(patch.userType);
    }
    if (patch.parentId !== undefined) {
      fields.push(`parent_id = $${index++}`);
      values.push(patch.parentId);
    }
    if (patch.builtPageId !== undefined) {
      fields.push(`built_page_id = $${index++}`);
      values.push(patch.builtPageId);
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
      `UPDATE planned_pages SET ${fields.join(", ")} WHERE id = $${index} RETURNING *`,
      values
    );
    return result.rows[0] ? mapPlannedPage(result.rows[0]) : null;
  },
  async deletePlannedPage(id) {
    await pool.query("DELETE FROM planned_pages WHERE id = $1", [id]);
  },
  async saveVersion(pageId, data, notes, trigger) {
    const next = await pool.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_num FROM page_versions WHERE page_id = $1`,
      [pageId]
    );
    const versionNumber = next.rows[0].next_num;
    await pool.query(
      `INSERT INTO page_versions (page_id, version_number, data, notes, trigger) VALUES ($1, $2, $3, $4, $5)`,
      [pageId, versionNumber, JSON.stringify(data), notes || null, trigger]
    );
    await pool.query(
      `DELETE FROM page_versions
       WHERE page_id = $1
         AND id NOT IN (
           SELECT id FROM page_versions WHERE page_id = $1
           ORDER BY version_number DESC LIMIT $2
         )`,
      [pageId, PAGE_VERSION_RETENTION]
    );
  },
  async getVersions(pageId, { limit, includeData = false } = {}) {
    const cols = includeData ? "*" : "id, page_id, version_number, notes, trigger, created_at";
    const limitClause = limit ? ` LIMIT ${parseInt(limit)}` : "";
    const result = await pool.query(
      `SELECT ${cols} FROM page_versions WHERE page_id = $1 ORDER BY created_at DESC${limitClause}`,
      [pageId]
    );
    return result.rows.map(row => ({
      id: row.id,
      pageId: row.page_id,
      versionNumber: row.version_number,
      notes: row.notes,
      trigger: row.trigger,
      createdAt: row.created_at,
      ...(includeData ? { data: row.data } : {})
    }));
  },
  async getVersion(versionId) {
    const result = await pool.query("SELECT * FROM page_versions WHERE id = $1", [versionId]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      pageId: row.page_id,
      versionNumber: row.version_number,
      notes: row.notes,
      trigger: row.trigger,
      createdAt: row.created_at,
      data: row.data
    };
  }
});

export const createPersistence = async ({
  databaseUrl = process.env.DATABASE_URL,
  fallbackMode = process.env.DB_FALLBACK_MODE,
  localPath = process.env.LOCAL_DB_PATH
} = {}) => {
  if (fallbackMode === "file" || !databaseUrl?.trim()) {
    const store = await createFileStore(localPath);
    console.warn(`Using file-backed persistence at ${store.location}`);
    return store;
  }

  let effectiveDatabaseUrl = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);
    const sslMode = parsed.searchParams.get("sslmode");
    const useLibpqCompat = parsed.searchParams.get("uselibpqcompat");
    if (
      (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") &&
      useLibpqCompat !== "true"
    ) {
      parsed.searchParams.set("sslmode", "verify-full");
      effectiveDatabaseUrl = parsed.toString();
    }
  } catch {
    // Keep the original value if DATABASE_URL is not a fully parseable URL.
  }

  const pool = new Pool({
    connectionString: effectiveDatabaseUrl,
    connectionTimeoutMillis: 3000
  });

  try {
    await initPostgres(pool);
    console.log("Database tables ready");
    return createPostgresStore(pool);
  } catch (error) {
    console.error("DB init error:", formatPersistenceError(error));
    await pool.end().catch(() => {});
    const store = await createFileStore(localPath);
    console.warn(`Postgres unavailable, using file-backed persistence at ${store.location}`);
    return store;
  }
};
