import type { ParsedPageFields, ParseErrorDetail, ParseStructuredResult, PageDraft, RelMap, StructuredPageOutput } from "../types";
import { clean } from "./core";

const safeArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => clean(String(v))).filter(Boolean) : [];

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
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
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

export const structuredToRawPage = (structured: StructuredPageOutput): string => {
  const page = structured.page;
  const components = safeArray(page.recommendedComponents);
  const dupes = safeArray(page.duplicationRisks);
  const verifiable = safeArray(page.enforcementCheck?.verifiable);
  const unclear = safeArray(page.enforcementCheck?.unclearOrNotEnforceable);
  const notes = safeArray(page.integrationNotes);

  const componentBlock = components.length ? components.map((c) => `- ${c}`).join("\n") : "- Section";
  const dupesBlock = dupes.length ? dupes.map((d) => `- ${d}`).join("\n") : "- None identified";
  const verifiableBlock = verifiable.length ? verifiable.map((v) => `- ${v}`).join("\n") : "- None provided";
  const unclearBlock = unclear.length ? unclear.map((v) => `- ${v}`).join("\n") : "- None provided";
  const notesBlock = notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- None provided";

  return `PAGE NAME:\n${clean(page.name)}\n\nPRIMARY USER:\n${clean(page.primaryUser)}\n\nUSER GOAL:\n${clean(page.userGoal)}\n\nPRIMARY PURPOSE:\n${clean(page.primaryPurpose)}\n\nPAGE TYPE:\n${clean(page.pageType)}\n\nRECOMMENDED COMPONENTS:\n${componentBlock}\n\nSYSTEM RELATIONSHIPS:\nParent: ${clean(page.systemRelationships?.parent)}\nSiblings: ${clean(page.systemRelationships?.siblings)}\nChildren: ${clean(page.systemRelationships?.children)}\nEntry Points: ${clean(page.systemRelationships?.entryPoints)}\nNext Steps: ${clean(page.systemRelationships?.nextSteps)}\n\nDUPLICATION RISKS:\n${dupesBlock}\n\nENFORCEMENT CHECK:\n- What can be verified:\n${verifiableBlock}\n- What is unclear or not enforceable:\n${unclearBlock}\n\nPAGE DRAFT\n\n${(page.pageDraft || "").trim()}\n\nINTEGRATION NOTES:\n${notesBlock}`;
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

export const parseDraftSections = (draft: string) => {
  const lines = draft.split("\n");
  const sections: Array<{ type: string; title?: string; text?: string; lines: string[] }> = [];
  let current: { type: string; title?: string; text?: string; lines: string[] } | null = null;

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
