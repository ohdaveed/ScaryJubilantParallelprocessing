import { SITEMAP_SKELETON, REPORT_TRANSACTION_BEFORE_311_BODY, REPORT_TRANSACTION_POST_CTA_ROUTING_BODY } from "../constants";
import type {
  ArtifactVariant,
  BuildQueueItem,
  IANode,
  KarlEvaluation,
  PageArtifact,
  PageConcept,
  PageDraft,
  PlannedPage,
  PageVersion,
  ReferenceExample,
  TodoItem,
  UserPreference
} from "../types";
import { clean, lsLegacy, parseRel } from "./core";
import { apiFetch } from "./apiFetch";
import {
  artifactRoleLabel,
  artifactWorkflowLabel,
  contentTypeFromPageType,
  contentTypeLabel,
  normalizeTitleForComparison
} from "./contentModel";
import { parsePage, parseStructuredPage } from "./parsing";

const API_BASE = "/api";

const toPageSummary = (page: Partial<PageDraft>): PageDraft => {
  const fallbackDraft = typeof page.draft === "string" && page.draft.length > 0
    ? page.draft
    : (typeof page.draftPreview === "string" ? page.draftPreview : "");
  return {
    id: page.id || "",
    name: page.name || "",
    userType: page.userType || "",
    userGoal: page.userGoal || "",
    purpose: page.purpose || "",
    pageType: page.pageType || "",
    components: page.components || "",
    relationships: page.relationships || "",
    duplication: page.duplication || "",
    enforcement: page.enforcement || "",
    draft: fallbackDraft,
    draftPreview: typeof page.draftPreview === "string" ? page.draftPreview : fallbackDraft,
    integration: page.integration || "",
    valid: page.valid ?? true,
    raw: page.raw || "",
    createdAt: page.createdAt || "",
    karlConnected: page.karlConnected ?? false,
    karlEvaluation: page.karlEvaluation,
    skeleton: page.skeleton,
    imported: page.imported,
    currentVersionNumber: page.currentVersionNumber,
    version: page.version,
    reviewStatus: page.reviewStatus,
    qualityGate: page.qualityGate,
    inputs: page.inputs || { topic: page.name || "", userType: page.userType || "", notes: "" },
    contentHydrated: page.contentHydrated ?? false
  };
};

export const pagesApi = {
  list: async (): Promise<PageDraft[]> => {
    const summaryFields = ["id", "name", "pageType", "userType", "createdAt", "reviewStatus", "currentVersionNumber", "draftPreview", "karlConnected", "karlEvaluation", "qualityGate"].join(",");
    const res = await apiFetch(`${API_BASE}/pages?fields=${encodeURIComponent(summaryFields)}&includeDraft=false&includeRaw=false&includeDraftPreview=true`);
    if (!res.ok) throw new Error(`Failed to load pages: ${res.status}`);
    const data = await res.json();
    return (data.pages || []).map((p: Partial<PageDraft>) => toPageSummary(p));
  },
  get: async (id: string): Promise<PageDraft> => {
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = new Error(`Failed to load page: ${res.status}`) as Error & { httpStatus?: number };
      err.httpStatus = res.status;
      throw err;
    }
    const data = await res.json();
    return {
      ...toPageSummary(data),
      draft: data?.draft || "",
      raw: data?.raw || "",
      contentHydrated: true
    };
  },
  save: async (id: string, page: PageDraft, version?: { notes: string; trigger: "generate" | "refine" | "restore" | "manual" }): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data: page, ...(version ? { versionNotes: version.notes, versionTrigger: version.trigger } : {}) })
    });
    if (!res.ok) throw new Error(`Failed to save page: ${res.status}`);
  },
  delete: async (id: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete page: ${res.status}`);
  },
  updateReview: async (id: string, status: string): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(id)}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update review status: ${res.status}`);
  }
};

export const todosApi = {
  list: async (): Promise<TodoItem[]> => {
    const res = await apiFetch(`${API_BASE}/todos`);
    if (!res.ok) throw new Error(`Failed to load todos: ${res.status}`);
    const data = await res.json();
    return data.todos || [];
  },
  create: async (topic: string, userType: string, opts?: { plannedId?: number }): Promise<TodoItem> => {
    const res = await apiFetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, userType, ...(opts?.plannedId != null ? { plannedId: opts.plannedId } : {}) })
    });
    if (!res.ok) throw new Error(`Failed to create todo: ${res.status}`);
    return res.json();
  },
  toggle: async (id: number, done: boolean): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done })
    });
    if (!res.ok) throw new Error(`Failed to update todo: ${res.status}`);
  },
  updateQueue: async (id: number, fields: { status: string; errorMessage?: string | null; builtPageId?: string | null; karlGrade?: string | null }): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields)
    });
    if (!res.ok) throw new Error(`Failed to update todo queue status: ${res.status}`);
  },
  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/todos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete todo: ${res.status}`);
  }
};

export const plannedPagesApi = {
  list: async (): Promise<PlannedPage[]> => {
    const res = await apiFetch(`${API_BASE}/planned-pages`);
    if (!res.ok) throw new Error(`Failed to load planned pages: ${res.status}`);
    const data = await res.json();
    return data.plannedPages || [];
  },
  create: async (name: string, pageType: string, userType: string, parentId?: number | null): Promise<PlannedPage> => {
    const res = await apiFetch(`${API_BASE}/planned-pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pageType, userType, parentId: parentId || null })
    });
    if (!res.ok) throw new Error(`Failed to create planned page: ${res.status}`);
    return res.json();
  },
  update: async (id: number, updates: Partial<{ name: string; pageType: string; userType: string; parentId: number | null; builtPageId: string | null }>): Promise<PlannedPage> => {
    const res = await apiFetch(`${API_BASE}/planned-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed to update planned page: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/planned-pages/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete planned page: ${res.status}`);
  }
};

export const pageConceptsApi = {
  list: async (): Promise<PageConcept[]> => {
    const res = await apiFetch(`${API_BASE}/page-concepts`);
    if (!res.ok) throw new Error(`Failed to load page concepts: ${res.status}`);
    const data = await res.json();
    return data.concepts || [];
  },
  create: async (payload: Omit<PageConcept, "id" | "intentKey" | "createdAt" | "updatedAt" | "governanceFlags">): Promise<PageConcept> => {
    const res = await apiFetch(`${API_BASE}/page-concepts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to create page concept: ${res.status}`);
    }
    return res.json();
  },
  update: async (id: number, patch: Partial<Omit<PageConcept, "id" | "intentKey" | "createdAt" | "updatedAt">>): Promise<PageConcept> => {
    const res = await apiFetch(`${API_BASE}/page-concepts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to update page concept: ${res.status}`);
    }
    return res.json();
  }
};

export const iaNodesApi = {
  list: async (mapId?: string): Promise<IANode[]> => {
    const qs = mapId ? `?mapId=${encodeURIComponent(mapId)}` : "";
    const res = await apiFetch(`${API_BASE}/ia-nodes${qs}`);
    if (!res.ok) throw new Error(`Failed to load IA nodes: ${res.status}`);
    const data = await res.json();
    return data.nodes || [];
  }
};

export const pageArtifactsApi = {
  list: async (): Promise<PageArtifact[]> => {
    const res = await apiFetch(`${API_BASE}/page-artifacts`);
    if (!res.ok) throw new Error(`Failed to load page artifacts: ${res.status}`);
    const data = await res.json();
    return data.artifacts || [];
  },
  promote: async (artifactId: string, conceptId: number): Promise<PageArtifact> => {
    const res = await apiFetch(`${API_BASE}/page-artifacts/${encodeURIComponent(artifactId)}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conceptId })
    });
    if (!res.ok) throw new Error(`Failed to promote artifact: ${res.status}`);
    return res.json();
  }
};

export const artifactVariantsApi = {
  list: async (): Promise<ArtifactVariant[]> => {
    const res = await apiFetch(`${API_BASE}/artifact-variants`);
    if (!res.ok) throw new Error(`Failed to load artifact variants: ${res.status}`);
    const data = await res.json();
    return data.variants || [];
  },
  create: async (payload: Omit<ArtifactVariant, "id" | "createdAt" | "updatedAt">): Promise<ArtifactVariant> => {
    const res = await apiFetch(`${API_BASE}/artifact-variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to create artifact variant: ${res.status}`);
    return res.json();
  }
};

export const referenceExamplesApi = {
  list: async (): Promise<ReferenceExample[]> => {
    const res = await apiFetch(`${API_BASE}/reference-examples`);
    if (!res.ok) throw new Error(`Failed to load reference examples: ${res.status}`);
    const data = await res.json();
    return data.references || [];
  }
};

export const buildQueueApi = {
  list: async (): Promise<BuildQueueItem[]> => {
    const res = await apiFetch(`${API_BASE}/build-queue`);
    if (!res.ok) throw new Error(`Failed to load build queue: ${res.status}`);
    const data = await res.json();
    return data.items || [];
  },
  create: async (payload: Omit<BuildQueueItem, "id" | "createdAt" | "errorMessage" | "karlGrade">): Promise<BuildQueueItem> => {
    const res = await apiFetch(`${API_BASE}/build-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed to create build queue item: ${res.status}`);
    return res.json();
  },
  update: async (id: number, patch: Partial<BuildQueueItem> & { errorMessage?: string | null; karlGrade?: string | null }): Promise<BuildQueueItem> => {
    const res = await apiFetch(`${API_BASE}/build-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(`Failed to update build queue item: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/build-queue/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete build queue item: ${res.status}`);
  }
};

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

export const buildArtifactSearchHints = (artifacts: PageArtifact[], concepts: PageConcept[]) => {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  return artifacts.map((artifact) => {
    const concept = artifact.conceptId != null ? conceptById.get(artifact.conceptId) : undefined;
    return {
      artifactId: artifact.id,
      title: artifact.title,
      titleKey: normalizeTitleForComparison(artifact.title),
      role: artifactRoleLabel(artifact.artifactKind),
      workflow: artifactWorkflowLabel(artifact.workflowStatus),
      conceptTitle: concept?.canonicalTitle || null,
      contentTypeLabel: contentTypeLabel(artifact.contentType)
    };
  });
};

export const findPossibleConceptDuplicates = (concepts: PageConcept[], title: string) => {
  const titleKey = normalizeTitleForComparison(title);
  return concepts.filter((concept) => normalizeTitleForComparison(concept.canonicalTitle).includes(titleKey));
};

export const preferencesApi = {
  list: async (pageId?: string | null): Promise<UserPreference[]> => {
    const url = pageId ? `${API_BASE}/preferences?page_id=${encodeURIComponent(pageId)}` : `${API_BASE}/preferences`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error(`Failed to load preferences: ${res.status}`);
    const data = await res.json();
    return data.preferences || [];
  },
  create: async (preference: string, source: string = "manual", pageId?: string | null): Promise<UserPreference> => {
    const res = await apiFetch(`${API_BASE}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference, source, page_id: pageId || null })
    });
    if (!res.ok) throw new Error(`Failed to create preference: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await apiFetch(`${API_BASE}/preferences/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete preference: ${res.status}`);
  }
};

export const versionsApi = {
  list: async (pageId: string, opts: { limit?: number; includeData?: boolean } = {}): Promise<PageVersion[]> => {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.includeData) params.set("includeData", "true");
    const qs = params.toString() ? `?${params}` : "";
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions${qs}`);
    if (!res.ok) throw new Error(`Failed to load versions: ${res.status}`);
    const data = await res.json();
    return data.versions || [];
  },
  get: async (pageId: string, versionId: number): Promise<PageVersion> => {
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions/${versionId}`);
    if (!res.ok) throw new Error(`Failed to load version: ${res.status}`);
    return res.json();
  },
  restore: async (pageId: string, versionId: number): Promise<PageDraft> => {
    const res = await apiFetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/restore/${versionId}`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to restore version: ${res.status}`);
    const body = await res.json();
    return body.data;
  }
};

export const runKarlEvaluation = async (page: { name: string; pageType: string; draft: string; userType: string }): Promise<KarlEvaluation | null> => {
  try {
    const res = await apiFetch(`${API_BASE}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageName: page.name, pageType: page.pageType, draft: page.draft, userType: page.userType })
    });
    if (!res.ok) {
      console.error("Karl evaluation request failed:", res.status);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("Karl evaluation error:", error);
    return null;
  }
};

export const fetchKarlRemediation = async (payload: { raw: string; pageType: string; evaluation: KarlEvaluation }): Promise<{ consulted: boolean; guidance: string[]; error: string | null }> => {
  try {
    const res = await apiFetch(`${API_BASE}/karl-remediate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return { consulted: false, guidance: [], error: `Karl remediation failed: ${res.status}` };
    }
    return res.json();
  } catch (error) {
    return { consulted: false, guidance: [], error: error instanceof Error ? error.message : "Karl remediation failed" };
  }
};

export const improveStructure = async (
  raw: string,
  preferences: string[],
  evaluationFeedback?: KarlEvaluation | null
): Promise<string | null> => {
  try {
    const res = await apiFetch(`${API_BASE}/improve-structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, preferences, evaluationFeedback })
    });
    if (!res.ok) {
      console.error("Structure improvement failed:", res.status);
      return null;
    }
    const data = await res.json();
    return data.improved || null;
  } catch (error) {
    console.error("Structure improvement error:", error);
    return null;
  }
};

const QUALITY_GATE_MIN_SCORE: Record<string, number> = {
  Transaction: 85,
  "Step by step": 82,
  Information: 80,
  Topic: 78,
  "Resource Collection": 78,
  Campaign: 78
};

export const evaluateQualityGate = (pageType: string, evaluation: KarlEvaluation | null): { status: "pass" | "review_required"; reasons: string[] } => {
  if (!evaluation) {
    return { status: "review_required", reasons: ["Quality evaluation is unavailable. Manual review is required."] };
  }
  if (evaluation.parseError) {
    return { status: "review_required", reasons: [evaluation.parseFailureReason || "Evaluator parse failure. Manual review is required."] };
  }
  const minScore = QUALITY_GATE_MIN_SCORE[pageType] ?? 80;
  const reasons: string[] = [];
  if (evaluation.score < minScore) reasons.push(`Score ${evaluation.score} is below minimum ${minScore} for ${pageType}.`);
  if (evaluation.failed.length > 0) reasons.push(`${evaluation.failed.length} evaluator checks failed.`);
  return { status: reasons.length === 0 ? "pass" : "review_required", reasons: reasons.length === 0 ? ["Meets automatic quality gate."] : reasons };
};

export const skeletonToPageDraft = (tmpl: (typeof SITEMAP_SKELETON)[number]): PageDraft => {
  const parentLine = "Parent: Healthy housing and pests (Topic)";
  const isReportTransaction = tmpl.pageType === "Transaction" && /^report\s/i.test(tmpl.name);
  const sectionFallback = (heading: string) => {
    const key = heading.toLowerCase();
    if (key.includes("what to report")) return "Describe what you saw, where it is, and when it started. Include photos when possible.";
    if (key.includes("what happens after reporting")) return "311 routes your report to HHVC. Staff review the details and contact you with next steps when needed.";
    if (key.includes("what happens after 311")) return "311 sends eligible reports to HHVC for review, inspection planning, and follow-up guidance.";
    if (key.includes("choose your report")) return "Pick the page that matches your issue so you can submit the right 311 request quickly.";
    if (key.includes("report, fix, and prevent")) return "Use report pages for active problems, fix pages for notices and inspections, and prevention pages for home care steps.";
    if (key.includes("find services and tools")) return "Use this hub for inspector lookup, fee payment, practical guides, and HHVC contact options.";
    if (key.includes("inspection process")) return "Inspectors review visible health risks, document findings, and explain required corrections.";
    if (key.includes("follow-up process")) return "Follow-up visits confirm repairs and record whether the case can close or needs more action.";
    if (key.includes("required tenant actions")) return "Allow access, share details accurately, and keep copies of requests you send to your landlord.";
    if (key.includes("required owner actions")) return "Fix cited conditions by the deadline, document repairs, and coordinate access with tenants.";
    if (key.includes("show what was fixed")) return "Bring repair records, receipts, and photos so staff can verify completed work.";
    if (key.includes("what to do if issues remain")) return "Report unresolved items clearly and ask what evidence is needed for the next follow-up.";
    if (key.includes("when fees apply")) return "Reinspection fees may apply when extra visits are required to verify unresolved violations.";
    if (key.includes("how fees are handled")) return "Always use the current official fee page and keep payment confirmations for your records.";
    if (key.includes("choose prevention by problem")) return "Start with the guide that matches your issue, then follow the simple home prevention steps.";
    if (key.includes("when to report")) return "If prevention steps do not help or risks grow, use the matching report page and contact 311.";
    if (key.includes("available services")) return "Find workshop requests, surveillance reporting, and program support services in this section.";
    if (key.includes("program information")) return "Learn how HHVC responds to complaints and what inspection services are in scope.";
    if (key.includes("property lookup tools")) return "Use official lookup tools to review violations history and related public records.";
    if (key.includes("inspector lookup")) return "Find your neighborhood inspector contact so you can route non-urgent questions correctly.";
    if (key.includes("from report to enforcement")) return "After a report, HHVC may inspect, issue notices, and schedule follow-up visits until conditions improve.";
    if (key.includes("tenant and owner roles")) return "Tenants support access and communication; owners complete repairs and document compliance.";
    if (key.includes("save your case details")) return "Keep your case number, dates, and photos together so inspection follow-up is easier.";
    if (key.includes("prepare the inspection area")) return "Clear access to affected rooms so inspectors can verify visible conditions quickly.";
    if (key.includes("enforcement outcomes")) return "If conditions remain unresolved, you may receive additional notices or hearing instructions.";
    if (key.includes("how to avoid enforcement")) return "Respond early, complete repairs, and document progress before follow-up deadlines.";
    return "Use this section to explain the user’s next clear action in plain language.";
  };
  const normalizeSectionBody = (body: string, heading: string) => (body.includes("[Content to be generated]") ? sectionFallback(heading) : body);
  const relatedList = (tmpl.related || []).map((r) => `- ${r}`).join("\n");
  const sectionBlocks = tmpl.sections.map((s) => `Section heading: ${s.heading}\nSection body: ${normalizeSectionBody(s.body, s.heading)}`).join("\n\n");
  const calloutBlocks = (tmpl.callouts || []).map((c) => `Callout: ${c}`).join("\n\n");
  const ctaLabel = tmpl.cta || "Report to 311";
  const ctaBlock = tmpl.cta ? `\nButton link: ${tmpl.cta}\n` : "";

  const reportWhatToDoBlock = isReportTransaction
    ? `Section heading: Before you report to 311\nSection body: ${REPORT_TRANSACTION_BEFORE_311_BODY}\nButton link: ${ctaLabel}\nAction link: Report to 311 https://sf311.org\nPhone number: 311\n\nSection heading: What happens after you use 311\nSection body: ${REPORT_TRANSACTION_POST_CTA_ROUTING_BODY}\n\n`
    : ctaBlock;

  const raw = `PAGE NAME:\n${tmpl.name}\n\nPRIMARY USER:\n${tmpl.userType}\n\nUSER GOAL:\nComplete the main task for this page quickly.\n\nPRIMARY PURPOSE:\n${tmpl.summary}\n\nPAGE TYPE:\n${tmpl.pageType}\n\nRECOMMENDED COMPONENTS:\n- Section\n- Callout\n- Text${tmpl.cta || isReportTransaction ? "\n- Button link" : ""}${isReportTransaction ? "\n- Action link\n- Phone number" : ""}\n\nSYSTEM RELATIONSHIPS:\n${parentLine}\nSiblings: See related pages below.\nChildren: None by default.\nEntry Points: SF.gov search and HHVC hub navigation.\nNext Steps: Follow linked report, prevention, or support pages.\n\nDUPLICATION RISKS:\n- Check overlap with existing HHVC pages before publish.\n\nENFORCEMENT CHECK:\n- What can be verified: visible conditions, submitted reports, and documented repairs.\n- What is unclear or not enforceable: assumptions without inspection evidence.\n\nPAGE DRAFT\n\n# ${tmpl.serviceTitle}\n\nDescription: ${tmpl.summary}\n\n## What to know\n${sectionBlocks}\n\n${calloutBlocks ? calloutBlocks + "\n\n" : ""}## What to do\n${reportWhatToDoBlock}## Related\n${relatedList}\n\nINTEGRATION NOTES:\n- Content Title: ${tmpl.contentTitle}\n- Hub: ${tmpl.hub}\n- Seed draft generated with concrete starter copy for all sections.`;

  const parsed = parsePage(raw);
  return {
    ...parsed,
    id: `skeleton_${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    createdAt: new Date().toISOString(),
    karlConnected: false,
    skeleton: true,
    inputs: { topic: tmpl.name, userType: tmpl.userType, notes: `Hub: ${tmpl.hub}` }
  } as PageDraft;
};
