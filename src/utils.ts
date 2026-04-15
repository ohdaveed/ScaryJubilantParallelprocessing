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

const API_BASE = "/api";

export const pagesApi = {
  list: async (): Promise<import("./types").PageDraft[]> => {
    const res = await fetch(`${API_BASE}/pages`);
    if (!res.ok) throw new Error(`Failed to load pages: ${res.status}`);
    const data = await res.json();
    return data.pages || [];
  },
  save: async (id: string, page: import("./types").PageDraft): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data: page })
    });
    if (!res.ok) throw new Error(`Failed to save page: ${res.status}`);
  },
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete page: ${res.status}`);
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
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
  list: async (): Promise<import("./types").UserPreference[]> => {
    const res = await fetch(`${API_BASE}/preferences`);
    if (!res.ok) throw new Error(`Failed to load preferences: ${res.status}`);
    const data = await res.json();
    return data.preferences || [];
  },
  create: async (preference: string, source: string = "manual"): Promise<import("./types").UserPreference> => {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference, source })
    });
    if (!res.ok) throw new Error(`Failed to create preference: ${res.status}`);
    return res.json();
  },
  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/preferences/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete preference: ${res.status}`);
  }
};

export const improveStructure = async (raw: string, preferences: string[]): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE}/improve-structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, preferences })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.improved || null;
  } catch {
    return null;
  }
};

export const skeletonToPageDraft = (tmpl: import("./types").SkeletonTemplate): import("./types").PageDraft => {
  const parentLine = tmpl.parentName
    ? `Parent: ${tmpl.parentName}`
    : "Parent: Healthy Housing and Vector Control (Topic)";
  const relatedList = (tmpl.related || []).map(r => `- ${r}`).join("\n");
  const sectionBlocks = tmpl.sections.map(s =>
    `Section heading: ${s.heading}\nSection body: ${s.body}`
  ).join("\n\n");
  const calloutBlocks = (tmpl.callouts || []).map(c => `Callout: ${c}`).join("\n\n");
  const ctaBlock = tmpl.cta ? `\nButton link: ${tmpl.cta}\n` : "";

  const raw = `PAGE NAME:\n${tmpl.name}\n\nPRIMARY USER:\n${tmpl.userType}\n\nUSER GOAL:\n[To be generated]\n\nPRIMARY PURPOSE:\n${tmpl.summary}\n\nPAGE TYPE:\n${tmpl.pageType}\n\nRECOMMENDED COMPONENTS:\n- Section\n- Callout\n- Text${tmpl.cta ? "\n- Button link" : ""}\n\nSYSTEM RELATIONSHIPS:\n${parentLine}\nSiblings: [To be determined]\nChildren: [To be determined]\nEntry Points: [To be determined]\nNext Steps: [To be determined]\n\nDUPLICATION RISKS:\n- [To be checked during generation]\n\nENFORCEMENT CHECK:\n- What can be verified: [To be checked during generation]\n- What is unclear or not enforceable: [To be checked during generation]\n\nPAGE DRAFT\n\n# ${tmpl.serviceTitle}\n\nDescription: ${tmpl.summary}\n\n## What to know\n${sectionBlocks}\n\n${calloutBlocks ? calloutBlocks + "\n\n" : ""}## What to do\n${ctaBlock}\nPhone number: 311\n\n## Related\n${relatedList}\n\nINTEGRATION NOTES:\n- Content Title: ${tmpl.contentTitle}\n- Hub: ${tmpl.hub}\n- This is a skeleton draft. Generate with AI to fill in the content.`;

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

export const driveApi = {
  listFiles: async (): Promise<import("./types").DriveFile[]> => {
    const res = await fetch(`${API_BASE}/drive/files`);
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = await res.json();
    return data.files || [];
  },
  readFile: async (fileId: string): Promise<{ id: string; name: string; mimeType: string; content: string }> => {
    const res = await fetch(`${API_BASE}/drive/files/${encodeURIComponent(fileId)}`);
    if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
    return res.json();
  }
};

export const lsLegacy = {
  listPageKeys: (): string[] =>
    Object.keys(localStorage).filter(k => k.startsWith("hhvc:") && k !== "hhvc:todos"),
  getPage: (key: string): string | null => localStorage.getItem(key),
  removePage: (key: string): void => { localStorage.removeItem(key); },
  getTodos: (): string | null => localStorage.getItem("hhvc:todos"),
  removeTodos: (): void => { localStorage.removeItem("hhvc:todos"); }
};
