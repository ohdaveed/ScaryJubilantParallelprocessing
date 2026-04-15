import { SECTION_STYLES, PEST_KW } from "./constants";
import { RelMap } from "./types";

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

export const getSectionStyle = (title: string) => {
  const t = title.toLowerCase();
  for (const [key, style] of Object.entries(SECTION_STYLES)) {
    if (t.includes(key)) return style;
  }
  return null;
};

export const parsePage = (raw: string) => {
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

export const storage = {
  get: (key: string): Promise<{ value: string } | null> => {
    const val = localStorage.getItem(key);
    return Promise.resolve(val !== null ? { value: val } : null);
  },
  set: (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  delete: (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
  list: (prefix: string): Promise<{ keys: string[] }> => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return Promise.resolve({ keys });
  }
};
