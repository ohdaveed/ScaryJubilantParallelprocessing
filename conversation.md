## provide the code in a folder

**TL;DR:** Here is the complete, refactored HHVC tool organized into a standard React project directory. You can drop these files directly into a modern React environment (like Vite or Next.js) to run the application.

### Directory Structure

```text
hhvc-tool/
├── src/
│   ├── components/
│   │   └── ui.tsx
│   ├── constants.ts
│   ├── types.ts
│   ├── utils.ts
│   └── App.tsx

```

---

### `src/types.ts`

This file contains all the TypeScript interfaces to enforce strict data structures across the application.

```typescript
export interface PageDraft {
  id: string;
  name: string;
  userType: string;
  userGoal: string;
  purpose: string;
  pageType: string;
  components: string;
  relationships: string;
  duplication: string;
  enforcement: string;
  draft: string;
  integration: string;
  valid: boolean;
  raw: string;
  createdAt: string;
  karlConnected: boolean;
  inputs: {
    topic: string;
    userType: string;
    notes: string;
  };
}

export interface SuggestedPage {
  topic: string;
  userType: string;
  pageType: string;
}

export interface Milestone {
  pct: number;
  label: string;
}

export interface ComponentStyle {
  accent: string;
  bg: string;
  icon: string;
}

export interface RelMap {
  parent: string;
  siblings: string;
  children: string;
  entry: string;
  next: string;
}

export interface TodoItem {
  id: number;
  topic: string;
  userType: string;
  done: boolean;
}

```

---

### `src/constants.ts`

This file isolates all the configuration data, magic strings, and styling maps.

```typescript
import { SuggestedPage, Milestone, ComponentStyle } from "./types";

export const SYSTEM_PROMPT = `You are an SF.gov content system and UX design agent for the San Francisco Department of Public Health (SFDPH) Healthy Housing & Vector Control (HHVC).

Your job is to design ONE page at a time while ensuring it fits into a connected HHVC service system.

NON-NEGOTIABLE RULES:
- Each page must have ONE primary purpose
- Use plain language (5th–6th grade level)
- Use action-oriented language (tell the user what to do)
- Always include "What happens next"
- Avoid institutional language
- Do NOT invent legal requirements or timelines
- Flag anything that is not enforceable or verifiable during inspection
- NEVER use markdown formatting (no asterisks, no bold, no underscores, no hyphens as bullets). Plain text only in all fields.

TENANT RESPONSIBILITIES (always include on any page where tenants are the primary or secondary user):
The following are ALWAYS the tenant's responsibility:
- Controlling humidity inside their unit
- Housekeeping (cleanliness, clutter, sanitation)
- Proper food storage
- Communicating the problem to their landlord in writing
- Granting access to their unit for inspection or repairs
- Waiting 72 hours after notifying their landlord before contacting the city

CRITICAL PAGE TYPE RULES:
- You are NOT allowed to use "Hub page"
- Use "Topic page" instead of hub
- ALL pest-related pages MUST be Transaction pages
- Transaction pages MUST: 1) Direct users to 311 2) Include a clear explanation of how 311 works

PAGE TYPE OPTIONS: Topic page, Transaction page, Guidance page, Issue page, Enforcement page, Support page
COMPONENT LIBRARY: Action-first title, Short summary, What you can do now, Primary CTA block, When to use this page, Signs/examples, Responsibilities section, Step-by-step process, What happens next, Related pages, Warning/alert, Checklist, FAQ
TITLE RULE: First person tense only. Never use "your".
SUMMARY RULE: SEO-optimized, under 150 characters. No markdown.

OUTPUT FORMAT — return EXACTLY this structure. No markdown. No asterisks. No bold. Plain text only:

PAGE NAME:
[page name]

PRIMARY USER:
[who]

USER GOAL:
[what]

PRIMARY PURPOSE:
[one clear purpose]

PAGE TYPE:
[one type from the list above]

RECOMMENDED COMPONENTS:
- component name only, no formatting
- component name only

SYSTEM RELATIONSHIPS:
Parent: [value]
Siblings: [value]
Children: [value]
Entry Points: [value]
Next Steps: [value]

DUPLICATION RISKS:
- plain text only

ENFORCEMENT CHECK:
- What can be verified: plain text
- What is unclear or not enforceable: plain text

PAGE DRAFT

# [First-person plain text title, no markdown]

Summary: [SEO plain text under 150 chars]

## What you can do now
- plain text item
- plain text item

## When to use this page
Plain text paragraph.

## Report the problem (311)
Plain text only. Required for transaction pages.

## [Main section heading, plain text]
Plain text content.

## Responsibilities
Plain text list. Required when tenant is primary or secondary user.

## What happens next
Plain text paragraph.

## Related pages
- plain text page name
- plain text page name

INTEGRATION NOTES:
- plain text only`;

export const PAGE_TYPES = ["Transaction page", "Topic page", "Guidance page", "Issue page", "Enforcement page", "Support page"];
export const USER_TYPES = ["Resident / tenant", "Property owner / landlord", "Business owner", "HHVC staff", "General public"];
export const PEST_KW = ["rodent", "rat", "mouse", "mice", "cockroach", "roach", "flea", "mosquito", "fly", "flies", "bed bug", "bedbug", "tick", "ant", "wasp", "bee", "pest"];

export const TYPE_META: Record<string, { fill: string; stroke: string; text: string; dot: string }> = {
  "Transaction page": { fill: "#E6F1FB", stroke: "#185FA5", text: "#0C447C", dot: "#378ADD" },
  "Topic page":       { fill: "#EAF3DE", stroke: "#3B6D11", text: "#27500A", dot: "#639922" },
  "Guidance page":    { fill: "#FAEEDA", stroke: "#854F0B", text: "#633806", dot: "#BA7517" },
  "Issue page":       { fill: "#FCEBEB", stroke: "#A32D2D", text: "#791F1F", dot: "#E24B4A" },
  "Enforcement page": { fill: "#EEEDFE", stroke: "#3C3489", text: "#26215C", dot: "#7F77DD" },
  "Support page":     { fill: "#E1F5EE", stroke: "#0F6E56", text: "#04342C", dot: "#1D9E75" }
};

export const SECTION_STYLES: Record<string, ComponentStyle> = {
  "what you can do now": { accent: "#185FA5", bg: "#E6F1FB", icon: "arrow" },
  "report the problem":  { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "311":                 { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "responsibilities":    { accent: "#854F0B", bg: "#FAEEDA", icon: "list" },
  "what happens next":   { accent: "#3C3489", bg: "#EEEDFE", icon: "clock" },
  "related pages":       { accent: "#5F5E5A", bg: "#F1EFE8", icon: "link" },
  "when to use":         { accent: "#A32D2D", bg: "#FCEBEB", icon: "info" },
  "warning":             { accent: "#A32D2D", bg: "#FCEBEB", icon: "info" },
  "signs":               { accent: "#185FA5", bg: "#E6F1FB", icon: "info" },
  "checklist":           { accent: "#0F6E56", bg: "#E1F5EE", icon: "list" },
  "step":                { accent: "#3C3489", bg: "#EEEDFE", icon: "arrow" },
  "faq":                 { accent: "#5F5E5A", bg: "#F1EFE8", icon: "info" },
};

export const SUGGESTED_PAGES: SuggestedPage[] = [
  { topic: "Report rats in my building", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Report cockroaches in my unit", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix mold in my rental", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Understand my rights as a tenant", userType: "Resident / tenant", pageType: "Topic page" },
  { topic: "What landlords must fix in my home", userType: "Resident / tenant", pageType: "Guidance page" },
  { topic: "Request a housing inspection", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Report bed bugs in my home", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix a water leak in my rental", userType: "Property owner / landlord", pageType: "Guidance page" },
  { topic: "Understand landlord pest control duties", userType: "Property owner / landlord", pageType: "Guidance page" },
  { topic: "Appeal a housing violation notice", userType: "Property owner / landlord", pageType: "Transaction page" },
  { topic: "Report mosquitoes near my home", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Get help with lead paint in my home", userType: "Resident / tenant", pageType: "Support page" },
  { topic: "Understand HHVC enforcement process", userType: "General public", pageType: "Topic page" },
  { topic: "Report fleas in my building", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix heating problems in my rental", userType: "Resident / tenant", pageType: "Transaction page" },
];

export const MILESTONE_DOTS: Milestone[] = [
  { pct: 15, label: "Connecting" },
  { pct: 30, label: "Karl docs" },
  { pct: 50, label: "Standards" },
  { pct: 80, label: "Drafting" },
  { pct: 100, label: "Done" },
];

```

---

### `src/utils.ts`

All the parsing, string manipulation, and matching logic.

```typescript
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

export const parseDraftSections = (draft: string) => {
  const lines = draft.split("\n");
  const sections: any[] = [];
  let current: any = null;
  
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

```

---

### `src/components/ui.tsx`

This file contains the reusable, stateless UI elements.

```tsx
import React, { useState } from "react";
import { TYPE_META, MILESTONE_DOTS } from "../constants";
import { clean, parseRel } from "../utils";

export const Badge: React.FC<{ type: string; small?: boolean }> = ({ type, small }) => {
  const t = clean(type);
  const c = TYPE_META[t] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };
  
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: small ? 10 : 11,
      fontWeight: 500, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20,
      background: c.fill, color: c.text, border: `1px solid ${c.stroke}`,
      whiteSpace: "nowrap", lineHeight: 1.4
    }}>
      {t || "—"}
    </span>
  );
};

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <p style={{
    fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 6px", ...style
  }}>
    {children}
  </p>
);

export const Divider: React.FC<{ m?: string }> = ({ m = "16px 0" }) => (
  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: m }} />
);

export const iStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: "100%", padding: "8px 11px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)",
  color: "var(--color-text-primary)", boxSizing: "border-box", transition: "border-color 0.15s",
  outline: "none", ...extra
});

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Btn: React.FC<BtnProps> = ({ children, variant = "ghost", size = "sm", fullWidth, style = {}, ...props }) => {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-sans)", cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--border-radius-md)", fontWeight: size === "lg" ? 500 : 400,
    transition: "all 0.12s ease", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 6, border: "none", outline: "none",
    ...(fullWidth ? { width: "100%" } : {}), ...style
  };
  
  const sizes = {
    sm: { fontSize: 12, padding: "5px 12px" },
    md: { fontSize: 13, padding: "7px 16px" },
    lg: { fontSize: 14, padding: "11px 20px" }
  };
  
  const variants = {
    primary: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" },
    ghost: { background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)" },
    danger: { background: "transparent", color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger)" },
  };

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...(props.disabled ? { opacity: 0.4 } : {}) }}
      onMouseEnter={e => { if (!props.disabled) { e.currentTarget.style.opacity = "0.72"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      {...props}
    >
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{label}</label>
      {hint && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; onClick?: () => void; selected?: boolean; style?: React.CSSProperties }> = ({ children, onClick, selected, style = {} }) => {
  const [hov, setHov] = useState(false);
  return (
    <div 
      onClick={onClick} 
      onMouseEnter={() => onClick && setHov(true)} 
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--color-background-primary)",
        border: `0.5px solid ${selected ? "var(--color-border-primary)" : hov && onClick ? "var(--color-border-secondary)" : "var(--color-border-tertiary)"}`,
        borderRadius: "var(--border-radius-lg)", padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s,transform 0.12s",
        transform: hov && onClick ? "translateY(-1px)" : "none",
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const ComponentChips: React.FC<{ components: string }> = ({ components }) => {
  if (!components) return null;
  const items = components.split("\n").map(l => clean(l.replace(/^[-•]\s*/, ""))).filter(s => s.length > 2);
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>Recommended components</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {items.map(c => <span key={c} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>{c}</span>)}
      </div>
    </div>
  );
};

export const RelPanel: React.FC<{ rel: string }> = ({ rel }) => {
  const r = parseRel(rel);
  const rows = [["Parent", r.parent], ["Siblings", r.siblings], ["Children", r.children], ["Entry points", r.entry], ["Next steps", r.next]].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", marginBottom: 16 }}>
      <Label>System relationships</Label>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 10, marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: "var(--color-text-tertiary)", minWidth: 84, flexShrink: 0 }}>{k}</span>
          <span style={{ color: "var(--color-text-primary)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
};

export const KarlStatus: React.FC<{ status: string }> = ({ status }) => {
  const states: any = {
    idle:       { dot: "#B4B2A9", label: "Karl not connected", bg: "var(--color-background-secondary)" },
    connecting: { dot: "#BA7517", label: "Connecting to Karl…", bg: "#FAEEDA" },
    active:     { dot: "#1D9E75", label: "Karl connected", bg: "#E1F5EE" },
    fallback:   { dot: "#E24B4A", label: "Karl unavailable — using base standards", bg: "#FCEBEB" },
  };
  const s = states[status] || states.idle;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: "var(--border-radius-md)", background: s.bg, marginBottom: 14 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, animation: status === "connecting" ? "pulse 1.2s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
    </div>
  );
};

export const SectionIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: any = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" fill="none" />,
    list: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
    clock: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
    info: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  };
  return <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>{icons[type] || icons.info}</svg>;
};

export const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => {
  const eased = progress < 80 ? progress : 80 + (progress - 80) * 1.8;
  const clamped = Math.min(100, eased);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{Math.round(progress)}%</span>
      </div>
      <div style={{ height: 3, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "var(--color-text-primary)", width: `${clamped}%`, transition: progress === 100 ? "width 0.15s ease" : "width 0.45s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        {MILESTONE_DOTS.map(step => {
          const active = progress >= step.pct;
          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 5, opacity: active ? 1 : 0.3, transition: "opacity 0.3s" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--color-text-primary)" : "var(--color-border-secondary)", transition: "background 0.3s ease" }} />
              <span style={{ fontSize: 11, color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)", transition: "color 0.3s ease" }}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

```

---

### `src/App.tsx`

The primary application root that integrates the state and the sub-components. *Note: To ensure a 1-to-1 conversion, I've left the complex feature components (like DraftRenderer, SystemMap, etc.) bundled in this file, but they are clearly separated above the main `App` export.*

```tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { PageDraft, TodoItem } from "./types";
import { USER_TYPES, PAGE_TYPES, SYSTEM_PROMPT, SUGGESTED_PAGES, TYPE_META } from "./constants";
import { clean, isPest, parsePage, parseRel, parseDraftSections, getSectionStyle } from "./utils";
import { Badge, Label, Divider, Btn, Card, Field, ComponentChips, RelPanel, KarlStatus, ProgressBar, SectionIcon, iStyle } from "./components/ui";

// --- FEATURE COMPONENTS ---

function renderLines(lines: string[]) {
  const cleaned = lines.map(l => clean(l));
  const paras = cleaned.filter(l => l && !l.startsWith("- ") && !l.startsWith("• "));
  const bullets = cleaned.filter(l => {
    const orig = lines[cleaned.indexOf(l)] || "";
    return orig.startsWith("- ") || orig.startsWith("• ") || l.startsWith("- ");
  }).map(l => l.replace(/^[-•]\s*/, ""));

  return (
    <>
      {paras.map((p, i) => <p key={i} style={{ fontSize: 13, margin: "0 0 6px", lineHeight: 1.7, color: "var(--color-text-primary)" }}>{p}</p>)}
      {bullets.length > 0 && <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
        {bullets.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, fontSize: 13, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-text-tertiary)", flexShrink: 0, marginTop: 7 }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>}
    </>
  );
}

function DraftRenderer({ draft }: { draft: string }) {
  if (!draft) return <p style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}>No draft content.</p>;
  const sections = parseDraftSections(draft);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map((sec, i) => {
        if (sec.type === "title") return (
          <div key={i} style={{ marginBottom: 4 }}>
            <h2 style={{ fontSize: 24, fontWeight: 500, margin: "0 0 6px", letterSpacing: "-0.4px", lineHeight: 1.2, color: "var(--color-text-primary)" }}>{sec.title}</h2>
            {sec.lines.filter((l: string) => clean(l)).map((l: string, j: number) => <p key={j} style={{ fontSize: 14, margin: "0 0 4px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{clean(l)}</p>)}
          </div>
        );
        if (sec.type === "summary") return (
          <div key={i} style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", borderLeft: "3px solid var(--color-border-secondary)" }}>
            <Label style={{ margin: "0 0 4px" }}>SEO summary</Label>
            <p style={{ fontSize: 13, margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.65, fontStyle: "italic" }}>{sec.text}</p>
          </div>
        );
        const style = getSectionStyle(sec.title);
        const hasContent = sec.lines.some((l: string) => clean(l));
        if (!sec.title && !hasContent) return null;
        
        if (style) return (
          <div key={i} style={{ borderRadius: "var(--border-radius-lg)", border: `0.5px solid ${style.accent}33`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: style.bg, borderBottom: `0.5px solid ${style.accent}22`, color: style.accent }}>
              <SectionIcon type={style.icon} />
              <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.01em" }}>{sec.title}</span>
            </div>
            <div style={{ padding: "13px 14px", background: "var(--color-background-primary)" }}>
              {hasContent ? renderLines(sec.lines) : <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0, fontStyle: "italic" }}>—</p>}
            </div>
          </div>
        );
        
        return (
          <div key={i} style={{ borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            {sec.title && <div style={{ padding: "8px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{sec.title}</span>
            </div>}
            <div style={{ padding: "13px 14px", background: "var(--color-background-primary)" }}>
              {hasContent ? renderLines(sec.lines) : <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: 0, fontStyle: "italic" }}>—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StreamRenderer({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.75, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
      {text.split("\n").map((line, i) => {
        const isH = /^(PAGE NAME:|PRIMARY USER:|PAGE TYPE:|USER GOAL:|PRIMARY PURPOSE:|SYSTEM RELATIONSHIPS:|ENFORCEMENT CHECK:|INTEGRATION NOTES:|PAGE DRAFT|RECOMMENDED COMPONENTS:|DUPLICATION RISKS:)/.test(line);
        const isDH = /^#{1,3} /.test(line);
        const isKarl = /^\[Querying Karl/.test(line);
        return <div key={i} style={{ color: isKarl ? "#185FA5" : isH || isDH ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: isH ? 500 : 400, fontStyle: isKarl ? "italic" : "normal", background: isKarl ? "#E6F1FB" : undefined, padding: isKarl ? "2px 6px" : undefined, borderRadius: isKarl ? 4 : undefined, marginBottom: isKarl ? "4px" : undefined }}>{line || " "}</div>;
      })}
      <span style={{ display: "inline-block", width: 6, height: 13, background: "var(--color-text-secondary)", marginLeft: 2, verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />
    </div>
  );
}

function SuccessState({ page, onView }: { page: PageDraft; onView: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 24px", textAlign: "center", gap: 18, animation: "fadeUp 0.35s ease forwards" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--color-background-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11" /></svg>
      </div>
      <div style={{ maxWidth: 280 }}>
        <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 6px", color: "var(--color-text-primary)" }}>{clean(page?.name) || "Page generated"}</p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>Checked against Karl content standards and SF.gov best practices.</p>
      </div>
      <Badge type={clean(page?.pageType)} />
      <Btn onClick={onView} variant="primary" size="md">View page →</Btn>
    </div>
  );
}

function SystemMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  const W = 680, H = 400;
  if (!pages.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 10, color: "var(--color-text-tertiary)" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /></svg>
      <span style={{ fontSize: 13 }}>Generate pages to populate the map</span>
    </div>
  );
  
  const topic = pages.filter(p => clean(p.pageType) === "Topic page");
  const others = pages.filter(p => clean(p.pageType) !== "Topic page");
  const nodes: any[] = [];
  
  topic.forEach((p, i) => { const a = (2 * Math.PI * i / Math.max(topic.length, 1)) - Math.PI / 2; nodes.push({ id: p.id, name: clean(p.name) || "Untitled", type: clean(p.pageType), x: W / 2 + 70 * Math.cos(a), y: H / 2 + 50 * Math.sin(a), tier: 0 }); });
  others.forEach((p, i) => { const a = (2 * Math.PI * i / Math.max(others.length, 1)) - Math.PI / 2; nodes.push({ id: p.id, name: clean(p.name) || "Untitled", type: clean(p.pageType), x: W / 2 + 185 * Math.cos(a), y: H / 2 + 165 * Math.sin(a), tier: 1 }); });
  
  const edges: any[] = [], orphans = new Set(pages.map(p => p.id));
  pages.forEach(p => { 
    const rel = parseRel(p.relationships || ""); 
    const txt = [rel.parent, rel.siblings, rel.children].join(" ").toLowerCase(); 
    pages.forEach(q => { 
      if (p.id === q.id) return; 
      const qn = (clean(q.name) || "").toLowerCase(); 
      if (qn.length > 4 && txt.includes(qn.slice(0, Math.min(10, qn.length)))) { edges.push([p.id, q.id]); orphans.delete(p.id); orphans.delete(q.id); } 
    }); 
  });
  
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#B4B2A9" /></marker></defs>
      {edges.map(([a, b], i) => { const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b); if (!na || !nb) return null; return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#D3D1C7" strokeWidth="1" markerEnd="url(#arr)" />; })}
      {nodes.map(n => { 
        const c = TYPE_META[n.type] || { fill: "#F1EFE8", stroke: "#888", text: "#444" }; 
        const isOrphan = orphans.has(n.id) && pages.length > 1; 
        const label = n.name.length > 20 ? n.name.slice(0, 18) + "…" : n.name; 
        const rx = n.tier === 0 ? 72 : 62, ry = n.tier === 0 ? 26 : 22;
        return <g key={n.id} onClick={() => onSelect(n.id)} style={{ cursor: "pointer" }}><ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={isOrphan ? "var(--color-background-secondary)" : c.fill} stroke={isOrphan ? "#B4B2A9" : c.stroke} strokeWidth={n.tier === 0 ? "2" : "1.5"} strokeDasharray={isOrphan ? "4,3" : "none"} /><text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={n.tier === 0 ? 12 : 11} fontWeight={n.tier === 0 ? "500" : "400"} fill={isOrphan ? "#888780" : c.text}>{label}</text></g>;
      })}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#B4B2A9">{pages.length} page{pages.length !== 1 ? "s" : ""} · click to open</text>
    </svg>
  );
}

function TodoPanel({ pages, onGenerate }: { pages: PageDraft[]; onGenerate: (topic: string, userType: string) => void }) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newUT, setNewUT] = useState(USER_TYPES[0]);
  const [adding, setAdding] = useState(false);
  
  useEffect(() => { (window as any).storage?.get("hhvc:todos").then((r: any) => { if (r?.value) try { setTodos(JSON.parse(r.value)); } catch {} }).catch(() => {}); }, []);
  
  const save = async (u: TodoItem[]) => { setTodos(u); await (window as any).storage?.set("hhvc:todos", JSON.stringify(u)).catch(() => {}); };
  
  const builtNames = new Set(pages.map(p => (clean(p.name) || "").toLowerCase()));
  const suggested = SUGGESTED_PAGES.filter(s => !builtNames.has(s.topic.toLowerCase()) && !todos.some(t => t.topic.toLowerCase() === s.topic.toLowerCase()));
  
  const addTodo = () => { if (!newTopic.trim()) return; save([...todos, { id: Date.now(), topic: newTopic.trim(), userType: newUT, done: false }]); setNewTopic(""); setAdding(false); };
  const toggle = (id: number) => save(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: number) => save(todos.filter(t => t.id !== id));
  const addSug = (s: any) => save([...todos, { id: Date.now(), topic: s.topic, userType: s.userType, done: false }]);
  
  const pending = todos.filter(t => !t.done), done = todos.filter(t => t.done);
  
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Label style={{ margin: 0 }}>Pages to build</Label>
        {pending.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontWeight: 500 }}>{pending.length}</span>}
      </div>
      
      {pending.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7, padding: "9px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
          <button onClick={() => toggle(t.id)} aria-label="Mark done" style={{ marginTop: 2, width: 15, height: 15, borderRadius: 3, border: "1.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", flexShrink: 0, padding: 0, outline: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 2px", lineHeight: 1.4, color: "var(--color-text-primary)" }}>{t.topic}</p>
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{t.userType}</p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <Btn onClick={() => onGenerate(t.topic, t.userType)} variant="primary" size="sm">Build</Btn>
            <Btn onClick={() => remove(t.id)} variant="ghost" size="sm" style={{ padding: "5px 7px", border: "none", color: "var(--color-text-tertiary)" }}>✕</Btn>
          </div>
        </div>
      ))}
      
      {done.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", opacity: 0.4 }}>
          <button onClick={() => toggle(t.id)} aria-label="Unmark" style={{ width: 15, height: 15, borderRadius: 3, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", flexShrink: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
          </button>
          <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-tertiary)", textDecoration: "line-through", flex: 1 }}>{t.topic}</p>
          <Btn onClick={() => remove(t.id)} variant="ghost" size="sm" style={{ padding: "4px 6px", border: "none", color: "var(--color-text-tertiary)" }}>✕</Btn>
        </div>
      ))}
      
      {adding ? (
        <div style={{ marginBottom: 10, padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", marginTop: 4 }}>
          <input style={{ ...iStyle(), marginBottom: 6, fontSize: 12 }} placeholder="Page topic…" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} autoFocus />
          <select style={{ ...iStyle({ fontSize: 12 }), marginBottom: 8 }} value={newUT} onChange={e => setNewUT(e.target.value)}>
            {USER_TYPES.map(u => <option key={u}>{u}</option>)}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn onClick={addTodo} variant="primary" size="sm">Add</Btn>
            <Btn onClick={() => { setAdding(false); setNewTopic(""); }} variant="ghost" size="sm">Cancel</Btn>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ width: "100%", padding: "8px 0", fontSize: 12, border: "0.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", marginTop: 4, transition: "border-color 0.15s,color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-primary)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
          + Add page
        </button>
      )}
      
      {suggested.length > 0 && (
        <>
          <Divider m="14px 0 10px" />
          <Label>Suggested</Label>
          {suggested.slice(0, 5).map((s, i) => {
            const c = TYPE_META[s.pageType] || { fill: "#F1EFE8", text: "#444", stroke: "#888" };
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 8px", borderRadius: "var(--border-radius-md)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, margin: "0 0 4px", lineHeight: 1.3, color: "var(--color-text-primary)" }}>{s.topic}</p>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: c.fill, color: c.text, border: `0.5px solid ${c.stroke}` }}>{s.pageType}</span>
                </div>
                <Btn onClick={() => addSug(s)} variant="ghost" size="sm">+ Add</Btn>
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}

// --- MAIN APP COMPONENT ---

export default function App() {
  const [tab, setTab] = useState("builder");
  const [topic, setTopic] = useState("");
  const [userType, setUserType] = useState(USER_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [karlStatus, setKarlStatus] = useState("idle");
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [selected, setSelected] = useState<PageDraft | null>(null);
  const [justGenerated, setJustGenerated] = useState<PageDraft | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortNewest, setSortNewest] = useState(true);
  const [error, setError] = useState("");
  const [parseWarn, setParseWarn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [topicTouched, setTopicTouched] = useState(false);
  const streamRef = useRef("");
  const lastInput = useRef<any>({});

  useEffect(() => {
    (window as any).storage?.list("hhvc:").then((r: any) => {
      if (r?.keys?.length) { 
        Promise.all(r.keys.filter((k: string) => k !== "hhvc:todos").map((k: string) => (window as any).storage.get(k)))
          .then(res => { 
            setPages(res.filter(Boolean).map((r2: any) => { try { return JSON.parse(r2.value); } catch { return null; } }).filter(Boolean)); 
          }); 
      }
    }).catch(() => {});
  }, []);

  const adv = (pct: number, lbl: string) => { setProgress(pct); setProgressLabel(lbl); };

  const generate = useCallback(async (ov: any = {}) => {
    const t = ov.topic || topic; if (!t.trim()) { setTopicTouched(true); return; }
    setLoading(true); setStreaming(true); setShowSuccess(false); setStreamText(""); setError(""); setParseWarn(false); setSelected(null);
    setKarlStatus("connecting");
    adv(0, "Connecting to Karl docs…");
    streamRef.current = ""; lastInput.current = { topic: t, userType: ov.userType || userType, notes: ov.notes || notes };
    const pestNote = isPest(t) ? " Note: pest-related — MUST be Transaction page." : "";
    const msg = `Design a page for: "${t}"\nPrimary user: ${ov.userType || userType}${(ov.notes || notes) ? `\nContext: ${ov.notes || notes}` : ""}${pestNote}`;
    let karlHit = false;
    
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, stream: true, system: SYSTEM_PROMPT, messages: [{ role: "user", content: msg }], mcp_servers: [{ type: "url", url: "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/~gitbook/mcp", name: "karl-docs" }] }) });
      const reader = res.body!.getReader(); const dec = new TextDecoder();
      let charCount = 0;
      adv(15, "Querying Karl content standards…");
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6); if (d === "[DONE]") continue;
          try {
            const j = JSON.parse(d);
            if (j.type === "content_block_start" && j.content_block?.type === "tool_use") {
              karlHit = true; setKarlStatus("active"); adv(30, "Reading Karl docs…");
              setStreamText(s => s + `[Querying Karl docs: ${j.content_block.name}…]\n`);
            }
            if (j.type === "content_block_stop" && streamRef.current.length === 0) { adv(50, "Applying SF.gov standards…"); }
            if (j.type === "content_block_delta" && j.delta?.type === "text_delta") {
              streamRef.current += j.delta.text; setStreamText(s => s + j.delta.text);
              charCount += j.delta.text.length;
              const pct = Math.min(97, 50 + Math.round((charCount / 2200) * 47));
              const lbl = pct < 65 ? "Drafting page structure…" : pct < 80 ? "Writing page content…" : pct < 90 ? "Adding compliance checks…" : "Finalizing page…";
              adv(pct, lbl);
            }
          } catch {}
        }
      }
      if (!karlHit) setKarlStatus("fallback");
      adv(100, "Done");
      const parsed = parsePage(streamRef.current);
      if (!parsed.valid) setParseWarn(true);
      const id = `hhvc:${Date.now()}`;
      const page: PageDraft = { ...parsed, id, createdAt: new Date().toISOString(), inputs: lastInput.current, karlConnected: karlHit } as PageDraft;
      await (window as any).storage?.set(id, JSON.stringify(page));
      setPages(prev => [...prev, page]);
      setJustGenerated(page);
      setStreaming(false);
      setTimeout(() => setShowSuccess(true), 150);
      setTopic(""); setNotes(""); setTopicTouched(false);
    } catch { setError("Generation failed. Check your connection and try again."); setStreaming(false); setKarlStatus("fallback"); }
    setLoading(false);
  }, [topic, userType, notes]);

  const regenerate = useCallback((p: PageDraft) => { if (p?.inputs) generate({ topic: p.inputs.topic, userType: p.inputs.userType, notes: p.inputs.notes }); }, [generate]);
  const deletePage = async (id: string) => { await (window as any).storage?.delete(id).catch(() => {}); setPages(p => p.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); };
  const selectById = (id: string) => { const p = pages.find(x => x.id === id); if (p) { setSelected(p); setShowSuccess(false); setTab("builder"); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleDownload = (text: string, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click(); };

  const filtered = pages.filter(p => { const ms = !search || (clean(p.name) || "").toLowerCase().includes(search.toLowerCase()) || (p.draft || "").toLowerCase().includes(search.toLowerCase()); return ms && (filterType === "All" || clean(p.pageType) === filterType); });
  const sorted = sortNewest ? [...filtered].reverse() : filtered;
  const topicError = topicTouched && !topic.trim();

  const Tab = ({ id, label, badge }: { id: string; label: string; badge?: number }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} aria-current={active ? "page" : undefined}
        style={{ padding: "10px 18px", fontSize: 13, fontWeight: active ? 500 : 400, color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)", background: "transparent", border: "none", borderBottom: active ? "2px solid var(--color-text-primary)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s, border-color 0.15s", outline: "none" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--color-text-primary)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--color-text-secondary)"; }}
      >
        {label}
        {badge ? <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontWeight: 500, lineHeight: 1.4 }}>{badge}</span> : null}
      </button>
    );
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0.5rem 0 2rem" }}>
      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        *:focus-visible { outline: 2px solid var(--color-border-info) !important; outline-offset: 2px; }
      `}</style>
      <h2 className="sr-only">HHVC SF.gov content design tool</h2>

      <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 20, display: "flex" }}>
        <Tab id="builder" label="Page builder" />
        <Tab id="map" label="System map" />
        <Tab id="library" label="Library" badge={pages.length} />
      </div>

      {tab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
          <Card style={{ padding: "18px 16px" }}>
            <Label>New page</Label>
            <KarlStatus status={karlStatus} />

            <Field label="Topic" hint={isPest(topic) ? "→ Transaction page" : ""}>
              <input style={{ ...iStyle(), borderColor: topicError ? "var(--color-border-danger)" : "var(--color-border-secondary)" }}
                placeholder="e.g. Report rats in my building" value={topic}
                onChange={e => { setTopic(e.target.value); setTopicTouched(false); }}
                onBlur={() => setTopicTouched(true)}
                onKeyDown={e => e.key === "Enter" && !loading && generate()}
                onFocus={e => e.target.style.borderColor = "var(--color-border-primary)"}
                aria-label="Page topic" aria-invalid={topicError} />
              {topicError && <p style={{ fontSize: 11, color: "var(--color-text-danger)", margin: "4px 0 0" }} role="alert">Please enter a page topic.</p>}
            </Field>

            <Field label="Primary user">
              <select style={iStyle()} value={userType} onChange={e => setUserType(e.target.value)}>
                {USER_TYPES.map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>

            <Field label="Context" hint="optional">
              <textarea style={{ ...iStyle({ height: 88, resize: "vertical" }) }} value={notes} onChange={e => setNotes(e.target.value)} aria-label="Additional context"
                placeholder={`Optional — include any of:\n• Parent/sibling pages that exist\n• SF Health Code sections that apply\n• Enforcement limits inspectors face\n• Overlapping DBI or other city pages\n• Audience nuance (SROs, Section 8…)\n• Urgency level (active vs. prevention)\n• Specific CTAs that must appear`} />
            </Field>

            <Btn onClick={() => generate()} disabled={loading} variant="primary" size="lg" fullWidth style={{ marginTop: 4 }}>
              {loading ? "Generating…" : "Generate page"}
            </Btn>
            {error && <p style={{ fontSize: 12, color: "var(--color-text-danger)", marginTop: 8, marginBottom: 0 }} role="alert">{error}</p>}

            {pages.length > 0 && (
              <>
                <Divider m="18px 0 14px" />
                <Label>Recent</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {pages.slice(-6).reverse().map(p => {
                    const c = TYPE_META[clean(p.pageType)] || { dot: "#888" };
                    const isSel = selected?.id === p.id && !showSuccess;
                    return (
                      <button key={p.id} onClick={() => { setSelected(p); setShowSuccess(false); }} aria-label={`Open ${clean(p.name)}`}
                        style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: isSel ? "var(--color-background-secondary)" : "transparent", border: isSel ? "0.5px solid var(--color-border-secondary)" : "0.5px solid transparent", borderRadius: "var(--border-radius-md)", cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.1s", outline: "none" }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: isSel ? 500 : 400, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clean(p.name) || "Untitled"}</span>
                        {!p.karlConnected && <span title="Generated without Karl docs" style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FAEEDA", color: "#854F0B", flexShrink: 0 }}>no Karl</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Card>

          <Card style={{ padding: "22px 26px", minHeight: 480 }}>
            {streaming && (
              <div>
                <ProgressBar progress={progress} label={progressLabel} />
                <Divider m="0 0 18px" />
                <StreamRenderer text={streamText} />
              </div>
            )}

            {!streaming && showSuccess && justGenerated && <SuccessState page={justGenerated} onView={() => { setSelected(justGenerated); setShowSuccess(false); }} />}

            {!streaming && !showSuccess && parseWarn && (
              <div role="alert" style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ fontSize: 13, color: "var(--color-text-warning)", margin: 0 }}>Some fields may be incomplete.</p>
                <Btn onClick={() => selected && regenerate(selected)} variant="ghost" size="sm" style={{ borderColor: "var(--color-border-warning)", color: "var(--color-text-warning)" }}>Retry</Btn>
              </div>
            )}

            {!streaming && !showSuccess && selected && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 10px", letterSpacing: "-0.3px", color: "var(--color-text-primary)" }}>{clean(selected.name) || "Untitled"}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Badge type={clean(selected.pageType)} />
                      {selected.karlConnected
                        ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#E1F5EE", color: "#0F6E56", border: "0.5px solid #5DCAA5" }}>Karl verified</span>
                        : <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #EF9F27" }}>Base standards only</span>
                      }
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn onClick={() => handleCopy(selected.raw)} variant="ghost" size="sm">{copied ? "Copied ✓" : "Copy"}</Btn>
                    <Btn onClick={() => handleDownload(selected.raw, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + ".txt")} variant="ghost" size="sm">Download</Btn>
                    <Btn onClick={() => regenerate(selected)} disabled={loading} variant="ghost" size="sm">Regenerate</Btn>
                    <Btn onClick={() => deletePage(selected.id)} variant="danger" size="sm">Delete</Btn>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginBottom: 20 }}>
                  {[["User", selected.userType], ["Goal", selected.userGoal], ["Purpose", selected.purpose]].map(([k, v]) => (
                    <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px 12px" }}>
                      <Label style={{ margin: "0 0 3px" }}>{k}</Label>
                      <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5, color: "var(--color-text-primary)" }}>{clean(v as string) || "—"}</p>
                    </div>
                  ))}
                </div>

                <ComponentChips components={selected.components} />
                <RelPanel rel={selected.relationships} />
                <Divider />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Label style={{ margin: 0 }}>Page draft</Label>
                  <Btn onClick={() => handleDownload(selected.draft, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + "-draft.txt")} variant="ghost" size="sm">Export draft</Btn>
                </div>
                <DraftRenderer draft={selected.draft} />

                {selected.enforcement && <><Divider /><Label>Enforcement check</Label><pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.7, fontFamily: "var(--font-mono)" }}>{clean(selected.enforcement)}</pre></>}
                {selected.integration && <><Divider /><Label>Integration notes</Label><pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.7, fontFamily: "var(--font-mono)" }}>{clean(selected.integration)}</pre></>}
              </div>
            )}

            {!streaming && !showSuccess && !selected && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 360, gap: 12, color: "var(--color-text-tertiary)" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" /></svg>
                <p style={{ fontSize: 13, margin: 0, textAlign: "center", maxWidth: 200, lineHeight: 1.6 }}>Enter a topic in the form to generate your first page</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "map" && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
          <div>
            <Card style={{ padding: "16px 20px", marginBottom: 14 }}>
              <SystemMap pages={pages} onSelect={selectById} />
            </Card>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {PAGE_TYPES.map(t => { const c = TYPE_META[t]; return <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: c.fill, color: c.text, border: `1px solid ${c.stroke}` }}>{t}</span>; })}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px dashed var(--color-border-secondary)" }}>orphan</span>
            </div>
          </div>
          <TodoPanel pages={pages} onGenerate={(t, u) => { setTopic(t); setUserType(u); setTab("builder"); }} />
        </div>
      )}

      {tab === "library" && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...iStyle({ maxWidth: 220 }) }} placeholder="Search pages…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search pages" />
            <select style={{ ...iStyle({ maxWidth: 170 }) }} value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="Filter by page type">
              <option>All</option>
              {PAGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <Btn onClick={() => setSortNewest(s => !s)} variant="ghost" size="sm">{sortNewest ? "Newest first" : "Oldest first"}</Btn>
            {pages.length > 0 && <Btn onClick={() => handleDownload(pages.map(p => p.raw).join("\n\n---\n\n"), "hhvc-pages-export.txt")} variant="ghost" size="sm">Export all</Btn>}
          </div>
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>
              <p style={{ fontSize: 13, margin: 0 }}>{pages.length === 0 ? "No pages yet — generate one in the builder." : "No pages match your filter."}</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
            {sorted.map(p => {
              const c = TYPE_META[clean(p.pageType)] || { dot: "#888" };
              return (
                <Card key={p.id} onClick={() => { setSelected(p); setShowSuccess(false); setTab("builder"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                    <Badge type={clean(p.pageType)} small />
                    {!p.karlConnected && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FAEEDA", color: "#854F0B", marginLeft: "auto" }}>no Karl</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4, color: "var(--color-text-primary)" }}>{clean(p.name) || "Untitled"}</p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>{(clean(p.userGoal) || "").slice(0, 70)}{(clean(p.userGoal) || "").length > 70 ? "…" : ""}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

```

