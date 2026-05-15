import {
  PEST_KW,
  REPORT_TRANSACTION_BEFORE_311_BODY,
  REPORT_TRANSACTION_POST_CTA_ROUTING_BODY
} from "./constants";
import { ParseStructuredResult, ParsedPageFields, RelMap, StructuredPageOutput, PageDraft, VerificationState } from "./types";

export const isPest = (t: string): boolean => {
  return PEST_KW.some(k => t.toLowerCase().includes(k));
};

export const clean = (s?: string): string => {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_{2}/g, "")
    .replace(/_/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/`/g, "")
    .replace(/^\s*[-–]\s*/gm, "")
    .trim();
};


export const parsePage = (raw: string): ParsedPageFields => {
  const stripped = raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/_{2}/g, "").replace(/`/g, "");

  const get = (startMarker: string, endMarker: string) => {
    const regex = new RegExp(`${startMarker}[:\\s]*([\\s\\S]*?)(?=${endMarker}|$)`, "i");
    const match = stripped.match(regex);
    return match ? match[1].trim() : "";
  };

  const draftMatch = stripped.match(/PAGE DRAFT[\s\S]*?\n([\s\S]*?)(?=INTEGRATION NOTES:|$)/i);
  const name = clean(get("PAGE NAME:", "PRIMARY USER:"));
  const pageType = clean(get("PAGE TYPE:", "RECOMMENDED COMPONENTS:"));
  const draft = draftMatch ? draftMatch[1].trim() : "";

  return {
    raw,
    name,
    userType: clean(get("PRIMARY USER:", "USER GOAL:")),
    userGoal: clean(get("USER GOAL:", "PRIMARY PURPOSE:")),
    purpose: clean(get("PRIMARY PURPOSE:", "PAGE TYPE:")),
    pageType,
    components: get("RECOMMENDED COMPONENTS:", "SYSTEM RELATIONSHIPS:"),
    relationships: get("SYSTEM RELATIONSHIPS:", "DUPLICATION RISKS:"),
    duplication: get("DUPLICATION RISKS:", "ENFORCEMENT CHECK:"),
    enforcement: get("ENFORCEMENT CHECK:", "PAGE DRAFT"),
    draft,
    integration: get("INTEGRATION NOTES:", "ZZZEND"),
    valid: !!(name && pageType && draft)
  };
};

const safeArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(v => clean(String(v))).filter(Boolean) : [];

const looksLikeObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateStructuredShape = (value: unknown): value is StructuredPageOutput => {
  if (!looksLikeObject(value) || !looksLikeObject(value.page)) return false;
  const page = value.page as Record<string, unknown>;
  const rel = page.systemRelationships;
  const enforce = page.enforcementCheck;
  return (
    typeof page.name === "string" &&
    typeof page.primaryUser === "string" &&
    typeof page.userGoal === "string" &&
    typeof page.primaryPurpose === "string" &&
    typeof page.pageType === "string" &&
    Array.isArray(page.recommendedComponents) &&
    looksLikeObject(rel) &&
    typeof (rel as Record<string, unknown>).parent === "string" &&
    typeof (rel as Record<string, unknown>).siblings === "string" &&
    typeof (rel as Record<string, unknown>).children === "string" &&
    typeof (rel as Record<string, unknown>).entryPoints === "string" &&
    typeof (rel as Record<string, unknown>).nextSteps === "string" &&
    Array.isArray(page.duplicationRisks) &&
    looksLikeObject(enforce) &&
    Array.isArray((enforce as Record<string, unknown>).verifiable) &&
    Array.isArray((enforce as Record<string, unknown>).unclearOrNotEnforceable) &&
    typeof page.pageDraft === "string" &&
    Array.isArray(page.integrationNotes)
  );
};

const extractJsonObjectText = (raw: string): string | null => {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
};

export const structuredToRawPage = (structured: StructuredPageOutput): string => {
  const page = structured.page;
  const components = safeArray(page.recommendedComponents);
  const dupes = safeArray(page.duplicationRisks);
  const verifiable = safeArray(page.enforcementCheck?.verifiable);
  const unclear = safeArray(page.enforcementCheck?.unclearOrNotEnforceable);
  const notes = safeArray(page.integrationNotes);

  const componentBlock = components.length ? components.map(c => `- ${c}`).join("\n") : "- Section";
  const dupesBlock = dupes.length ? dupes.map(d => `- ${d}`).join("\n") : "- None identified";
  const verifiableBlock = verifiable.length ? verifiable.map(v => `- ${v}`).join("\n") : "- None provided";
  const unclearBlock = unclear.length ? unclear.map(v => `- ${v}`).join("\n") : "- None provided";
  const notesBlock = notes.length ? notes.map(n => `- ${n}`).join("\n") : "- None provided";

  return `PAGE NAME:
${clean(page.name)}

PRIMARY USER:
${clean(page.primaryUser)}

USER GOAL:
${clean(page.userGoal)}

PRIMARY PURPOSE:
${clean(page.primaryPurpose)}

PAGE TYPE:
${clean(page.pageType)}

RECOMMENDED COMPONENTS:
${componentBlock}

SYSTEM RELATIONSHIPS:
Parent: ${clean(page.systemRelationships?.parent)}
Siblings: ${clean(page.systemRelationships?.siblings)}
Children: ${clean(page.systemRelationships?.children)}
Entry Points: ${clean(page.systemRelationships?.entryPoints)}
Next Steps: ${clean(page.systemRelationships?.nextSteps)}

DUPLICATION RISKS:
${dupesBlock}

ENFORCEMENT CHECK:
- What can be verified:
${verifiableBlock}
- What is unclear or not enforceable:
${unclearBlock}

PAGE DRAFT

${(page.pageDraft || "").trim()}

INTEGRATION NOTES:
${notesBlock}`;
};

export const parseStructuredPage = (raw: string): ParseStructuredResult => {
  const jsonCandidate = extractJsonObjectText(raw);
  if (!jsonCandidate) {
    const hasJsonAttempt = raw.indexOf("{") >= 0;
    return {
      rawText: raw,
      parsed: null,
      parseError: hasJsonAttempt
        ? { code: "invalid_json", message: "Malformed JSON object found in model response." }
        : { code: "missing_json_object", message: "No JSON object found in model response." }
    };
  }

  try {
    const parsedJson = JSON.parse(jsonCandidate) as unknown;
    if (!validateStructuredShape(parsedJson)) {
      return {
        rawText: raw,
        parsed: null,
        parseError: { code: "schema_invalid", message: "JSON found but does not match required schema." }
      };
    }
    if (!parsedJson.page.name || !parsedJson.page.pageDraft) {
      return {
        rawText: raw,
        parsed: null,
        parseError: { code: "missing_required_fields", message: "JSON is missing required page name or draft fields." }
      };
    }
    const materializedRaw = structuredToRawPage(parsedJson);
    return { rawText: materializedRaw, parsed: parsePage(materializedRaw), parseError: null };
  } catch {
    return {
      rawText: raw,
      parsed: null,
      parseError: { code: "invalid_json", message: "JSON object extraction succeeded but parsing failed." }
    };
  }
};

export const parseRel = (rel: string): RelMap => {
  const get = (label: string) => {
    const match = (rel || "").match(new RegExp(`${label}:([^\\n]*)`, "i"));
    return match ? clean(match[1]) : "";
  };

  return {
    parent: get("Parent"),
    siblings: get("Siblings"),
    children: get("Children"),
    entry: get("Entry Points"),
    next: get("Next Steps")
  };
};

type DraftSection =
  | { type: "title"; title: string; lines: string[] }
  | { type: "section"; title: string; lines: string[] }
  | { type: "summary"; title: string; text: string; lines: string[] };

/** Replace the PAGE DRAFT body in a full raw page string; keeps INTEGRATION NOTES and all prior sections intact. */
export const replacePageDraftInRaw = (raw: string, newDraft: string): string => {
  const normalized = newDraft.replace(/\r\n/g, "\n").trimEnd();
  const headerMatch = raw.match(/\bPAGE DRAFT\b(\s*\n+)/i);
  if (!headerMatch || headerMatch.index === undefined) return raw;
  const draftBodyStart = headerMatch.index + headerMatch[0].length;
  const tail = raw.slice(draftBodyStart);
  const integMatch = tail.match(/\n\s*INTEGRATION NOTES:/i);
  if (integMatch && integMatch.index !== undefined) {
    const draftBodyEnd = draftBodyStart + integMatch.index;
    return `${raw.slice(0, draftBodyStart)}${normalized}${raw.slice(draftBodyEnd)}`;
  }
  return `${raw.slice(0, draftBodyStart)}${normalized}\n`;
};

export const parseDraftSections = (draft: string): DraftSection[] => {
  const lines = draft.split("\n");
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;

  for (const line of lines) {
    const l = clean(line);
    if (line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { type: "title", title: l, lines: [] };
    } else if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { type: "section", title: l, lines: [] };
    } else if (line.toLowerCase().startsWith("summary:")) {
      if (current) sections.push(current);
      current = { type: "summary", title: "", text: clean(line.replace(/^summary:/i, "").trim()), lines: [] };
    } else {
      if (!current) current = { type: "section", title: "", lines: [] };
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
};

const API_BASE = "/api";

const toPageSummary = (page: Partial<import("./types").PageDraft>): import("./types").PageDraft => {
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
  list: async (): Promise<import("./types").PageDraft[]> => {
    const summaryFields = [
      "id",
      "name",
      "pageType",
      "userType",
      "createdAt",
      "reviewStatus",
      "currentVersionNumber",
      "draftPreview"
    ].join(",");
    const res = await fetch(`${API_BASE}/pages?fields=${encodeURIComponent(summaryFields)}&includeDraft=false&includeRaw=false&includeDraftPreview=true`);
    if (!res.ok) throw new Error(`Failed to load pages: ${res.status}`);
    const data = await res.json();
    return (data.pages || []).map((p: Partial<import("./types").PageDraft>) => toPageSummary(p));
  },
  get: async (id: string): Promise<import("./types").PageDraft> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(id)}`);
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
  save: async (id: string, page: import("./types").PageDraft, version?: { notes: string; trigger: "generate" | "refine" | "restore" | "manual" }): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        data: page,
        ...(version ? { versionNotes: version.notes, versionTrigger: version.trigger } : {})
      })
    });
    if (!res.ok) throw new Error(`Failed to save page: ${res.status}`);
  },
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete page: ${res.status}`);
  },
  updateReview: async (id: string, status: import("./types").ReviewStatus): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(id)}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to update review status: ${res.status}`);
  }
};

export const runKarlEvaluation = async (page: {
  name: string;
  pageType: string;
  draft: string;
  userType: string;
}): Promise<import("./types").KarlEvaluation | null> => {
  try {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageName: page.name,
        pageType: page.pageType,
        draft: page.draft,
        userType: page.userType
      })
    });
    if (!res.ok) {
      console.error("Karl evaluation request failed:", res.status);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Karl evaluation error:", error);
    return null;
  }
};

export const fetchKarlRemediation = async (payload: {
  raw: string;
  pageType: string;
  evaluation: import("./types").KarlEvaluation;
}): Promise<{ consulted: boolean; guidance: string[]; error: string | null }> => {
  try {
    const res = await fetch(`${API_BASE}/karl-remediate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      return {
        consulted: false,
        guidance: [],
        error: `Karl remediation failed: ${res.status}`
      };
    }

    return res.json();
  } catch (error) {
    return {
      consulted: false,
      guidance: [],
      error: error instanceof Error ? error.message : "Karl remediation failed"
    };
  }
};

const QUALITY_GATE_MIN_SCORE: Record<string, number> = {
  "Transaction": 85,
  "Step by step": 82,
  "Information": 80,
  "Topic": 78,
  "Resource Collection": 78,
  "Campaign": 78
};

export const evaluateQualityGate = (
  pageType: string,
  evaluation: import("./types").KarlEvaluation | null
): { status: "pass" | "review_required"; reasons: string[] } => {
  if (!evaluation) {
    return {
      status: "review_required",
      reasons: ["Quality evaluation is unavailable. Manual review is required."]
    };
  }

  if (evaluation.parseError) {
    return {
      status: "review_required",
      reasons: [evaluation.parseFailureReason || "Evaluator parse failure. Manual review is required."]
    };
  }

  const minScore = QUALITY_GATE_MIN_SCORE[pageType] ?? 80;
  const reasons: string[] = [];
  if (evaluation.score < minScore) reasons.push(`Score ${evaluation.score} is below minimum ${minScore} for ${pageType}.`);
  if (evaluation.failed.length > 0) reasons.push(`${evaluation.failed.length} evaluator checks failed.`);

  return {
    status: reasons.length === 0 ? "pass" : "review_required",
    reasons: reasons.length === 0 ? ["Meets automatic quality gate."] : reasons
  };
};

export const VERIFICATION_FILTERS: ReadonlyArray<{ id: VerificationState | "all"; label: string }> = [
  { id: "all", label: "All verification states" },
  { id: "verified", label: "Verified" },
  { id: "review_required", label: "Needs manual review" },
  { id: "import_pending_review", label: "Import pending review" },
  { id: "import_approved", label: "Import approved" },
  { id: "import_rejected", label: "Import rejected" },
  { id: "not_checked", label: "Not checked" }
];

export const getVerificationState = (page: PageDraft): VerificationState => {
  if (page.imported) {
    if (page.reviewStatus === "approved") return "import_approved";
    if (page.reviewStatus === "rejected") return "import_rejected";
    return "import_pending_review";
  }
  if (page.qualityGate?.status === "review_required") return "review_required";
  if (page.karlEvaluation) return "verified";
  return "not_checked";
};

export const getVerificationLabel = (state: VerificationState): string => {
  switch (state) {
    case "verified":
      return "verified";
    case "review_required":
      return "needs review";
    case "import_pending_review":
      return "import: pending";
    case "import_approved":
      return "import: approved";
    case "import_rejected":
      return "import: rejected";
    default:
      return "not checked";
  }
};

export interface ExportReadiness {
  managerApproved: boolean;
  standardsPass: boolean;
  karlBlockersCount: number;
  headerStatusText: string;
  readinessText: string;
  showKarlBlockers: boolean;
}

export const getExportReadiness = (page: PageDraft | null): ExportReadiness => {
  if (!page) {
    return {
      managerApproved: false,
      standardsPass: false,
      karlBlockersCount: 0,
      headerStatusText: "Not a published candidate",
      readinessText: "Submit for manager approval to publish",
      showKarlBlockers: false
    };
  }

  const managerApproved = page.reviewStatus === "approved";
  const karlBlockersCount = page.karlEvaluation?.failed?.length ?? 0;
  const standardsPass = page.qualityGate?.status === "pass" && karlBlockersCount === 0;

  if (!managerApproved) {
    return {
      managerApproved,
      standardsPass,
      karlBlockersCount,
      headerStatusText: "Not a published candidate",
      readinessText: "Submit for manager approval to publish",
      showKarlBlockers: false
    };
  }

  if (standardsPass) {
    return {
      managerApproved,
      standardsPass,
      karlBlockersCount,
      headerStatusText: "Published candidate",
      readinessText: "Standards pass (preview disabled for now)",
      showKarlBlockers: false
    };
  }

  return {
    managerApproved,
    standardsPass,
    karlBlockersCount,
    headerStatusText: "Published candidate",
    readinessText: "Export blocked: fix Karl issues first",
    showKarlBlockers: karlBlockersCount > 0
  };
};

const OVERLAP_STOPWORDS = new Set([
  "a", "an", "the",
  "my", "your", "their", "our", "his", "her", "its",
  "of", "for", "to", "in", "on", "at", "by", "with",
  "and", "or",
  "is", "are", "was", "were"
]);

export const overlapTitleKey = (raw: string): string => {
  return clean(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !OVERLAP_STOPWORDS.has(token))
    .join(" ")
    .trim();
};

export const findOverlappingPageIds = (pages: PageDraft[]): Set<string> => {
  const byTitle = new Map<string, string[]>();
  for (const page of pages) {
    const key = overlapTitleKey(page.name);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (existing) existing.push(page.id);
    else byTitle.set(key, [page.id]);
  }
  const overlapIds = new Set<string>();
  byTitle.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => overlapIds.add(id));
  });
  return overlapIds;
};

export const plannedPagesApi = {
  list: async (): Promise<import("./types").PlannedPage[]> => {
    const res = await fetch(`${API_BASE}/planned-pages`);
    if (!res.ok) throw new Error(`Failed to load planned pages: ${res.status}`);
    const data = await res.json();
    return data.plannedPages || [];
  },
  create: async (name: string, pageType: string, userType: string, parentId?: number | null): Promise<import("./types").PlannedPage> => {
    const res = await fetch(`${API_BASE}/planned-pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pageType, userType, parentId: parentId || null })
    });
    if (!res.ok) throw new Error(`Failed to create planned page: ${res.status}`);
    return res.json();
  },
  update: async (id: number, updates: Partial<{ name: string; pageType: string; userType: string; parentId: number | null; builtPageId: string | null }>): Promise<import("./types").PlannedPage> => {
    const res = await fetch(`${API_BASE}/planned-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed to update planned page: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/planned-pages/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete planned page: ${res.status}`);
  }
};

export const preferencesApi = {
  list: async (pageId?: string | null): Promise<import("./types").UserPreference[]> => {
    const url = pageId ? `${API_BASE}/preferences?page_id=${encodeURIComponent(pageId)}` : `${API_BASE}/preferences`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load preferences: ${res.status}`);
    const data = await res.json();
    return data.preferences || [];
  },
  create: async (preference: string, source: string = "manual", pageId?: string | null): Promise<import("./types").UserPreference> => {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference, source, page_id: pageId || null })
    });
    if (!res.ok) throw new Error(`Failed to create preference: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/preferences/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete preference: ${res.status}`);
  }
};

export const versionsApi = {
  list: async (pageId: string, opts: { limit?: number; includeData?: boolean } = {}): Promise<import("./types").PageVersion[]> => {
    const params = new URLSearchParams();
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.includeData) params.set("includeData", "true");
    const qs = params.toString() ? `?${params}` : "";
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions${qs}`);
    if (!res.ok) throw new Error(`Failed to load versions: ${res.status}`);
    const data = await res.json();
    return data.versions || [];
  },
  get: async (pageId: string, versionId: number): Promise<import("./types").PageVersion> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/versions/${versionId}`);
    if (!res.ok) throw new Error(`Failed to load version: ${res.status}`);
    return res.json();
  },
  restore: async (pageId: string, versionId: number): Promise<import("./types").PageDraft> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(pageId)}/restore/${versionId}`, { method: "POST" });
    if (!res.ok) throw new Error(`Failed to restore version: ${res.status}`);
    const body = await res.json();
    return body.data;
  }
};

export const improveStructure = async (
  raw: string,
  preferences: string[],
  evaluationFeedback?: import("./types").KarlEvaluation | null
): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE}/improve-structure`, {
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

export const skeletonToPageDraft = (tmpl: import("./types").SkeletonTemplate): import("./types").PageDraft => {
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
  const normalizeSectionBody = (body: string, heading: string) =>
    body.includes("[Content to be generated]") ? sectionFallback(heading) : body;
  const relatedList = (tmpl.related || []).map(r => `- ${r}`).join("\n");
  const sectionBlocks = tmpl.sections.map(s =>
    `Section heading: ${s.heading}\nSection body: ${normalizeSectionBody(s.body, s.heading)}`
  ).join("\n\n");
  const calloutBlocks = (tmpl.callouts || []).map(c => `Callout: ${c}`).join("\n\n");
  const ctaLabel = tmpl.cta || "Report to 311";
  const ctaBlock = tmpl.cta ? `\nButton link: ${tmpl.cta}\n` : "";

  const reportWhatToDoBlock = isReportTransaction
    ? `Section heading: Before you report to 311
Section body: ${REPORT_TRANSACTION_BEFORE_311_BODY}
Button link: ${ctaLabel}
Action link: Report to 311 https://sf311.org
Phone number: 311

Section heading: What happens after you use 311
Section body: ${REPORT_TRANSACTION_POST_CTA_ROUTING_BODY}

`
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
  } as import("./types").PageDraft;
};

export const lsLegacy = {
  listPageKeys: (): string[] =>
    Object.keys(localStorage).filter(k => k.startsWith("hhvc:") && k !== "hhvc:todos"),
  getPage: (key: string): string | null => localStorage.getItem(key),
  removePage: (key: string): void => { localStorage.removeItem(key); },
  getTodos: (): string | null => localStorage.getItem("hhvc:todos"),
  removeTodos: (): void => { localStorage.removeItem("hhvc:todos"); }
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatVersionOrMonth(page: { version?: string; created_at?: string; createdAt?: string }): string {
  if (page.version && page.version.trim() !== '') {
    return page.version;
  }
  const dateStr = page.created_at || page.createdAt || '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function sanitizeFilename(filename: string): string {
  const sanitized = filename.replace(/[\\/"*?<>|:]/g, '').replace(/\s+/g, ' ').trim();
  return sanitized || 'untitled';
}

export async function generateZip(
  files: Array<{ blob: Blob; filename: string }>
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const { blob, filename } of files) {
    const arrayBuffer = await blob.arrayBuffer();
    zip.file(filename, arrayBuffer);
  }
  return zip.generateAsync({ type: 'blob' });
}

export async function renderPageAsPNG(
  page: { name: string; version?: string; created_at?: string; createdAt?: string },
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');
  const { toBlob } = await import('html-to-image');
  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.png`;
  const blob = await toBlob(element);
  if (!blob) throw new Error('Failed to render page as PNG');
  return { blob, filename };
}

export async function renderPageAsPDF(
  page: { name: string; version?: string; created_at?: string; createdAt?: string },
  elementId: string
): Promise<{ blob: Blob; filename: string }> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const version = formatVersionOrMonth(page);
  const filename = `${sanitizeFilename(page.name)}_${version}.pdf`;
  const canvas = await html2canvas(element);
  if (canvas.width === 0 || canvas.height === 0) throw new Error('Element rendered to empty canvas');
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgWidth = 190;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
  const pdfArrayBuffer = pdf.output('arraybuffer');
  const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
  return { blob: pdfBlob, filename };
}
