import {
  PEST_KW,
  REPORT_TRANSACTION_BEFORE_311_BODY,
  REPORT_TRANSACTION_POST_CTA_ROUTING_BODY
} from "./constants";
import { ParseStructuredResult, ParsedPageFields, RelMap, StructuredPageOutput } from "./types";

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

export const pagesApi = {
  list: async (): Promise<import("./types").PageDraft[]> => {
    const res = await fetch(`${API_BASE}/pages`);
    if (!res.ok) throw new Error(`Failed to load pages: ${res.status}`);
    const data = await res.json();
    return data.pages || [];
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

export const todosApi = {
  list: async (): Promise<import("./types").TodoItem[]> => {
    const res = await fetch(`${API_BASE}/todos`);
    if (!res.ok) throw new Error(`Failed to load todos: ${res.status}`);
    const data = await res.json();
    return data.todos || [];
  },
  create: async (topic: string, userType: string): Promise<import("./types").TodoItem> => {
    const res = await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, userType })
    });
    if (!res.ok) throw new Error(`Failed to create todo: ${res.status}`);
    return res.json();
  },
  toggle: async (id: number, done: boolean): Promise<void> => {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done })
    });
    if (!res.ok) throw new Error(`Failed to update todo: ${res.status}`);
  },
  updateQueue: async (id: number, fields: {
    status: import("./types").TodoStatus;
    errorMessage?: string | null;
    builtPageId?: string | null;
    karlGrade?: string | null;
  }): Promise<void> => {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields)
    });
    if (!res.ok) throw new Error(`Failed to update todo queue status: ${res.status}`);
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/todos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete todo: ${res.status}`);
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
  const parentLine = tmpl.parentName
    ? `Parent: ${tmpl.parentName}`
    : "Parent: Healthy housing and pests (Topic)";
  const isReportTransaction = tmpl.pageType === "Transaction" && /^report\s/i.test(tmpl.name);
  const relatedList = (tmpl.related || []).map(r => `- ${r}`).join("\n");
  const sectionBlocks = tmpl.sections.map(s =>
    `Section heading: ${s.heading}\nSection body: ${s.body}`
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

  const raw = `PAGE NAME:\n${tmpl.name}\n\nPRIMARY USER:\n${tmpl.userType}\n\nUSER GOAL:\n[To be generated]\n\nPRIMARY PURPOSE:\n${tmpl.summary}\n\nPAGE TYPE:\n${tmpl.pageType}\n\nRECOMMENDED COMPONENTS:\n- Section\n- Callout\n- Text${tmpl.cta || isReportTransaction ? "\n- Button link" : ""}${isReportTransaction ? "\n- Action link\n- Phone number" : ""}\n\nSYSTEM RELATIONSHIPS:\n${parentLine}\nSiblings: [To be determined]\nChildren: [To be determined]\nEntry Points: [To be determined]\nNext Steps: [To be determined]\n\nDUPLICATION RISKS:\n- [To be checked during generation]\n\nENFORCEMENT CHECK:\n- What can be verified: [To be checked during generation]\n- What is unclear or not enforceable: [To be checked during generation]\n\nPAGE DRAFT\n\n# ${tmpl.serviceTitle}\n\nDescription: ${tmpl.summary}\n\n## What to know\n${sectionBlocks}\n\n${calloutBlocks ? calloutBlocks + "\n\n" : ""}## What to do\n${reportWhatToDoBlock}## Related\n${relatedList}\n\nINTEGRATION NOTES:\n- Content Title: ${tmpl.contentTitle}\n- Hub: ${tmpl.hub}\n- This is a skeleton draft. Generate with AI to fill in the content.`;

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
