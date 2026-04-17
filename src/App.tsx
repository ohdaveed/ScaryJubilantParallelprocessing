import React, { useState, useEffect, useRef, useCallback } from "react";
import { PageDraft, TodoItem, KarlEvaluation, PlannedPage, UserPreference } from "./types";
import { USER_TYPES, PAGE_TYPES, SYSTEM_PROMPT, SUGGESTED_PAGES, TYPE_META, SITEMAP_SKELETON } from "./constants";
import { clean, isPest, parsePage, parseRel, pagesApi, todosApi, plannedPagesApi, preferencesApi, improveStructure, runKarlEvaluation, lsLegacy, driveApi, skeletonToPageDraft } from "./utils";
import { DriveFile } from "./types";
import { Badge, Label, Divider, Btn, Card, Field, ComponentChips, RelPanel, KarlStatus, KarlEvalPanel, ProgressBar, iStyle } from "./components/ui";
import { SfGovPagePreview } from "./components/SfGovPreview";



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

function EvaluatingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 24px", textAlign: "center", gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1.2s linear infinite" }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 16, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Evaluating against Karl standards</p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>Checking SF.gov best practices and content standards…</p>
      </div>
    </div>
  );
}

function SuccessState({ page, onView }: { page: PageDraft; onView: () => void }) {
  const ev = page.karlEvaluation;
  const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };
  const gradeBg: Record<string, string> = { A: "#E1F5EE", B: "#E6F1FB", C: "#FAEEDA", D: "#FCEBEB", F: "#FCEBEB" };
  const grade = ev?.grade || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: 16, animation: "fadeUp 0.35s ease forwards" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--color-background-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11" /></svg>
      </div>
      <div style={{ maxWidth: 300 }}>
        <p style={{ fontSize: 17, fontWeight: 500, margin: "0 0 6px", color: "var(--color-text-primary)" }}>{clean(page?.name) || "Page generated"}</p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>Page draft created and evaluated against Karl content standards.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Badge type={clean(page?.pageType)} />
        {ev && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: gradeBg[grade] || "#F1EFE8", border: `1px solid ${gradeColor[grade] || "#888"}40` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: gradeColor[grade] || "#444" }}>{grade}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{ev.score}/100</span>
          </div>
        )}
      </div>

      {ev && (
        <div style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
          <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>{ev.summary}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ev.passed.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#E1F5EE", color: "#0F6E56", border: "0.5px solid #0F6E5630" }}>✓ {ev.passed.length} passed</span>}
              {ev.warnings.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #854F0B30" }}>⚠ {ev.warnings.length} warnings</span>}
              {ev.failed.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #A32D2D30" }}>✗ {ev.failed.length} failed</span>}
            </div>
          </div>
        </div>
      )}

      <Btn onClick={onView} variant="primary" size="md">View full page →</Btn>
    </div>
  );
}

function SystemMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  const W = 680, H = 400;
  if (!pages.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 12, color: "var(--color-text-tertiary)" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /></svg>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No pages yet</p>
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>Generate pages in the Builder tab to populate the system map.</p>
      </div>
    </div>
  );

  const topic = pages.filter(p => clean(p.pageType) === "Topic page");
  const others = pages.filter(p => clean(p.pageType) !== "Topic page");
  type MapNode = { id: string; name: string; type: string; x: number; y: number; tier: number };
  type MapEdge = [string, string];
  const nodes: MapNode[] = [];

  topic.forEach((p, i) => { const a = (2 * Math.PI * i / Math.max(topic.length, 1)) - Math.PI / 2; nodes.push({ id: p.id, name: clean(p.name) || "Untitled", type: clean(p.pageType), x: W / 2 + 70 * Math.cos(a), y: H / 2 + 50 * Math.sin(a), tier: 0 }); });
  others.forEach((p, i) => { const a = (2 * Math.PI * i / Math.max(others.length, 1)) - Math.PI / 2; nodes.push({ id: p.id, name: clean(p.name) || "Untitled", type: clean(p.pageType), x: W / 2 + 185 * Math.cos(a), y: H / 2 + 165 * Math.sin(a), tier: 1 }); });

  const edges: MapEdge[] = [], orphans = new Set(pages.map(p => p.id));
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

function PlanDiagram({ planned, pages, onSelectPlanned }: { planned: PlannedPage[]; pages: PageDraft[]; onSelectPlanned: (p: PlannedPage) => void }) {
  const W = 680, H = 400;
  if (!planned.length) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 12, color: "var(--color-text-tertiary)" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /></svg>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No planned pages yet</p>
        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>Add pages using the form to sketch your site architecture.</p>
      </div>
    </div>
  );

  const builtPageIds = new Set(pages.map(p => p.id));

  type PlanNode = { id: number; name: string; type: string; x: number; y: number; built: boolean; parentId: number | null };
  type PlanEdge = [number, number];

  const roots = planned.filter(p => !p.parentId);
  const children = planned.filter(p => p.parentId);

  const nodes: PlanNode[] = [];
  roots.forEach((p, i) => {
    const a = (2 * Math.PI * i / Math.max(roots.length, 1)) - Math.PI / 2;
    const r = roots.length === 1 ? 0 : 80;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a) * 0.7, built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });
  children.forEach((p, i) => {
    const a = (2 * Math.PI * i / Math.max(children.length, 1)) - Math.PI / 2;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + 185 * Math.cos(a), y: H / 2 + 165 * Math.sin(a), built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });

  const edges: PlanEdge[] = [];
  planned.forEach(p => {
    if (p.parentId) edges.push([p.parentId, p.id]);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><marker id="plan-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#B4B2A9" /></marker></defs>
      {edges.map(([a, b], i) => { const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b); if (!na || !nb) return null; return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#D3D1C7" strokeWidth="1" markerEnd="url(#plan-arr)" />; })}
      {nodes.map(n => {
        const c = TYPE_META[n.type] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };
        const label = n.name.length > 20 ? n.name.slice(0, 18) + "\u2026" : n.name;
        const isRoot = !n.parentId;
        const rx = isRoot ? 72 : 62, ry = isRoot ? 26 : 22;
        return (
          <g key={n.id} onClick={() => { const pp = planned.find(p => p.id === n.id); if (pp) onSelectPlanned(pp); }} style={{ cursor: "pointer" }}>
            <ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={n.built ? c.fill : "var(--color-background-primary)"} stroke={c.stroke} strokeWidth={isRoot ? "2" : "1.5"} strokeDasharray={n.built ? "none" : "5,3"} />
            {n.built && <ellipse cx={n.x} cy={n.y} rx={rx - 3} ry={ry - 3} fill="none" stroke={c.stroke} strokeWidth="0.5" opacity="0.3" />}
            <text x={n.x} y={n.y + (n.built ? 2 : 5)} textAnchor="middle" fontSize={isRoot ? 12 : 11} fontWeight={isRoot ? "500" : "400"} fill={c.text}>{label}</text>
            {n.built && <text x={n.x} y={n.y + (isRoot ? 16 : 14)} textAnchor="middle" fontSize="8" fill="#0F6E56" fontWeight="500">BUILT</text>}
          </g>
        );
      })}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#B4B2A9">{planned.length} planned · {nodes.filter(n => n.built).length} built · click to manage</text>
    </svg>
  );
}

function PlanSidebar({ planned, pages, selectedPlanned, onSelectPlanned, onAdd, onDelete, onGenerate, onViewPage }: {
  planned: PlannedPage[];
  pages: PageDraft[];
  selectedPlanned: PlannedPage | null;
  onSelectPlanned: (p: PlannedPage | null) => void;
  onAdd: (name: string, pageType: string, userType: string, parentId: number | null) => void;
  onDelete: (id: number) => void;
  onGenerate: (p: PlannedPage) => void;
  onViewPage: (pageId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pageType, setPageType] = useState(PAGE_TYPES[0]);
  const [ut, setUt] = useState(USER_TYPES[0]);
  const [parentId, setParentId] = useState<number | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), pageType, ut, parentId);
    setName(""); setPageType(PAGE_TYPES[0]); setUt(USER_TYPES[0]); setParentId(null); setAdding(false);
  };

  const builtPage = selectedPlanned?.builtPageId ? pages.find(p => p.id === selectedPlanned.builtPageId) : null;

  return (
    <Card style={{ padding: "16px 18px" }}>
      {selectedPlanned ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <Label style={{ margin: 0 }}>Planned page</Label>
            <button onClick={() => onSelectPlanned(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-tertiary)", padding: "2px 4px" }}>&larr; Back</button>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 10px", color: "var(--color-text-primary)", lineHeight: 1.3 }}>{selectedPlanned.name}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge type={selectedPlanned.pageType} small />
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>User: {selectedPlanned.userType}</p>
            {selectedPlanned.parentId && (
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Parent: {planned.find(p => p.id === selectedPlanned.parentId)?.name || "Unknown"}</p>
            )}
          </div>
          {builtPage ? (
            <div>
              <div style={{ padding: "10px 12px", background: "#E1F5EE", borderRadius: "var(--border-radius-md)", border: "0.5px solid #0F6E5630", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "#0F6E56", margin: 0, fontWeight: 500 }}>Page has been generated</p>
                {builtPage.karlEvaluation && (
                  <p style={{ fontSize: 11, color: "#0F6E56", margin: "4px 0 0" }}>Grade {builtPage.karlEvaluation.grade} &middot; {builtPage.karlEvaluation.score}/100</p>
                )}
              </div>
              <Btn onClick={() => onViewPage(builtPage.id)} variant="primary" size="md" fullWidth>View page &rarr;</Btn>
            </div>
          ) : (
            <Btn onClick={() => onGenerate(selectedPlanned)} variant="primary" size="md" fullWidth>Generate content &rarr;</Btn>
          )}
          <Divider m="14px 0" />
          <Btn onClick={() => onDelete(selectedPlanned.id)} variant="danger" size="sm">Delete from plan</Btn>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Label style={{ margin: 0 }}>Site plan</Label>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{planned.length} page{planned.length !== 1 ? "s" : ""}</span>
          </div>

          {planned.map(p => {
            const c = TYPE_META[p.pageType] || { fill: "#F1EFE8", stroke: "#888", text: "#444", dot: "#888" };
            const isBuilt = !!p.builtPageId && pages.some(pg => pg.id === p.builtPageId);
            return (
              <button key={p.id} onClick={() => onSelectPlanned(p)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: "var(--border-radius-md)", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", marginBottom: 3, transition: "background 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot || c.stroke, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.4, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                {isBuilt && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E1F5EE", color: "#0F6E56", fontWeight: 500 }}>built</span>}
              </button>
            );
          })}

          {adding ? (
            <div style={{ marginTop: 8, padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)" }}>
              <input style={{ ...iStyle(), marginBottom: 6, fontSize: 12 }} placeholder="Page name…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
              <select style={{ ...iStyle({ fontSize: 12 }), marginBottom: 6 }} value={pageType} onChange={e => setPageType(e.target.value)}>
                {PAGE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select style={{ ...iStyle({ fontSize: 12 }), marginBottom: 6 }} value={ut} onChange={e => setUt(e.target.value)}>
                {USER_TYPES.map(u => <option key={u}>{u}</option>)}
              </select>
              <select style={{ ...iStyle({ fontSize: 12 }), marginBottom: 8 }} value={parentId ?? ""} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">No parent</option>
                {planned.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn onClick={handleAdd} variant="primary" size="sm">Add</Btn>
                <Btn onClick={() => { setAdding(false); setName(""); }} variant="ghost" size="sm">Cancel</Btn>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              style={{ width: "100%", padding: "8px 0", fontSize: 12, border: "0.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", marginTop: 6, transition: "border-color 0.15s,color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-primary)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
              + Add planned page
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function TodoPanel({ pages, onGenerate }: { pages: PageDraft[]; onGenerate: (topic: string, userType: string) => void }) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newUT, setNewUT] = useState(USER_TYPES[0]);
  const [adding, setAdding] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);

  useEffect(() => {
    todosApi.list()
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoadingTodos(false));
  }, []);

  const builtNames = new Set(pages.map(p => (clean(p.name) || "").toLowerCase()));
  const suggested = SUGGESTED_PAGES.filter(s => !builtNames.has(s.topic.toLowerCase()) && !todos.some(t => t.topic.toLowerCase() === s.topic.toLowerCase()));

  const addTodo = async () => {
    if (!newTopic.trim()) return;
    try {
      const created = await todosApi.create(newTopic.trim(), newUT);
      setTodos(prev => [...prev, created]);
      setNewTopic(""); setAdding(false);
    } catch {}
  };

  const toggle = async (id: number, currentDone: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !currentDone } : t));
    try { await todosApi.toggle(id, !currentDone); } catch {}
  };

  const remove = async (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    try { await todosApi.delete(id); } catch {}
  };

  const addSug = async (s: { topic: string; userType: string; pageType: string }) => {
    try {
      const created = await todosApi.create(s.topic, s.userType);
      setTodos(prev => [...prev, created]);
    } catch {}
  };

  const pending = todos.filter(t => !t.done), done = todos.filter(t => t.done);

  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Label style={{ margin: 0 }}>Pages to build</Label>
        {pending.length > 0 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontWeight: 500 }}>{pending.length}</span>}
      </div>

      {loadingTodos && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 8px", textAlign: "center" }}>Loading…</p>}

      {!loadingTodos && pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: "center", padding: "14px 0 10px", color: "var(--color-text-tertiary)" }}>
          <p style={{ fontSize: 12, margin: "0 0 4px" }}>No pages queued</p>
          <p style={{ fontSize: 11, margin: 0 }}>Add topics below or pick from suggestions</p>
        </div>
      )}

      {pending.map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7, padding: "9px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
          <button onClick={() => toggle(t.id, t.done)} aria-label="Mark done" style={{ marginTop: 2, width: 15, height: 15, borderRadius: 3, border: "1.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", flexShrink: 0, padding: 0, outline: "none" }} />
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
          <button onClick={() => toggle(t.id, t.done)} aria-label="Unmark" style={{ width: 15, height: 15, borderRadius: 3, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", cursor: "pointer", flexShrink: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}>
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

export default function App() {
  const [tab, setTab] = useState("builder");
  const [topic, setTopic] = useState("");
  const [userType, setUserType] = useState(USER_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [karlStatus, setKarlStatus] = useState("idle");
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [selected, setSelected] = useState<PageDraft | null>(null);
  const [justGenerated, setJustGenerated] = useState<PageDraft | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortNewest, setSortNewest] = useState(true);
  const [error, setError] = useState("");
  const [parseWarn, setParseWarn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [topicTouched, setTopicTouched] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [newPref, setNewPref] = useState("");
  const [screenshots, setScreenshots] = useState<{ name: string; base64: string; mimeType: string }[]>([]);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveError, setDriveError] = useState("");
  const [driveOpen, setDriveOpen] = useState(false);
  const [selectedDriveIds, setSelectedDriveIds] = useState<Set<string>>(new Set());
  const [driveContents, setDriveContents] = useState<Record<string, string>>({});
  const [driveLoadingIds, setDriveLoadingIds] = useState<Set<string>>(new Set());
  const [plannedPages, setPlannedPages] = useState<PlannedPage[]>([]);
  const [plannedLoading, setPlannedLoading] = useState(true);
  const [selectedPlanned, setSelectedPlanned] = useState<PlannedPage | null>(null);
  const [mapMode, setMapMode] = useState<"plan" | "view">("plan");
  const [pendingPlannedId, setPendingPlannedId] = useState<number | null>(null);
  const [pendingPageType, setPendingPageType] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const streamRef = useRef("");
  const lastInput = useRef<{ topic: string; userType: string; notes: string }>({ topic: "", userType: "", notes: "" });

  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        const dbPages = await pagesApi.list();

        const lsPageKeys = lsLegacy.listPageKeys();
        const migrated: PageDraft[] = [];
        for (const k of lsPageKeys) {
          try {
            const val = lsLegacy.getPage(k);
            if (val) {
              const p = JSON.parse(val) as PageDraft;
              const newId = p.id.startsWith("hhvc:") ? `page_${p.id.slice(5)}` : p.id;
              const updated = { ...p, id: newId };
              await pagesApi.save(newId, updated);
              migrated.push(updated);
              lsLegacy.removePage(k);
            }
          } catch {}
        }

        const lsTodosRaw = lsLegacy.getTodos();
        if (lsTodosRaw) {
          try {
            const lsTodos = JSON.parse(lsTodosRaw) as TodoItem[];
            let allOk = true;
            for (const t of lsTodos) {
              try { await todosApi.create(t.topic, t.userType); }
              catch { allOk = false; }
            }
            if (allOk) lsLegacy.removeTodos();
          } catch {}
        }

        setPages([...dbPages, ...migrated]);
      } catch (err) {
        console.error("Failed to load pages:", err);
      }
      setPagesLoading(false);
    };
    loadAndMigrate();
  }, []);

  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    plannedPagesApi.list()
      .then(async (existing) => {
        if (existing.length > 0) {
          setPlannedPages(existing);
          return;
        }
        setSeeding(true);
        try {
          const hubRoots: Record<string, number> = {};
          const rootTemplates = SITEMAP_SKELETON.filter(t => !t.parentName);
          for (const tmpl of rootTemplates) {
            const created = await plannedPagesApi.create(tmpl.name, tmpl.pageType, tmpl.userType, null);
            hubRoots[tmpl.name] = created.id;
          }
          const childTemplates = SITEMAP_SKELETON.filter(t => t.parentName);
          for (const tmpl of childTemplates) {
            const parentId = hubRoots[tmpl.parentName!] || null;
            await plannedPagesApi.create(tmpl.name, tmpl.pageType, tmpl.userType, parentId);
          }
          const seeded = await plannedPagesApi.list();
          setPlannedPages(seeded);

          const skeletons = SITEMAP_SKELETON.map(tmpl => skeletonToPageDraft(tmpl));
          for (const skel of skeletons) {
            try { await pagesApi.save(skel.id, skel); } catch {}
          }
          setPages(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newSkels = skeletons.filter(s => !existingIds.has(s.id));
            return [...prev, ...newSkels];
          });

          for (const pp of seeded) {
            const matchingSkel = skeletons.find(s => s.inputs.topic === pp.name);
            if (matchingSkel) {
              try { await plannedPagesApi.update(pp.id, { builtPageId: matchingSkel.id }); } catch {}
            }
          }
          const finalPlanned = await plannedPagesApi.list();
          setPlannedPages(finalPlanned);
        } catch {
          setPlannedPages([]);
        }
        setSeeding(false);
      })
      .catch(() => { setPlannedPages([]); setSeeding(false); })
      .finally(() => setPlannedLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPlanned) {
      const updated = plannedPages.find(p => p.id === selectedPlanned.id);
      if (!updated) setSelectedPlanned(null);
      else if (updated.builtPageId !== selectedPlanned.builtPageId) setSelectedPlanned(updated);
    }
  }, [plannedPages, selectedPlanned]);

  useEffect(() => {
    driveApi.listFiles()
      .then(files => setDriveFiles(files))
      .catch(err => setDriveError(err.message || "Could not load Drive files"))
      .finally(() => setDriveLoading(false));
    preferencesApi.list()
      .then(prefs => setPreferences(prefs))
      .catch(() => {});
  }, []);

  const toggleDriveFile = async (file: DriveFile) => {
    const id = file.id;
    const next = new Set(selectedDriveIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectedDriveIds(next);
    } else {
      next.add(id);
      setSelectedDriveIds(next);
      if (!driveContents[id]) {
        setDriveLoadingIds(prev => new Set(prev).add(id));
        try {
          const { content } = await driveApi.readFile(id);
          setDriveContents(prev => ({ ...prev, [id]: content }));
        } catch {
          next.delete(id);
          setSelectedDriveIds(new Set(next));
        } finally {
          setDriveLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
      }
    }
  };

  const adv = (pct: number, lbl: string) => { setProgress(pct); setProgressLabel(lbl); };

  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
  const MAX_SCREENSHOTS = 3;

  const handleImageFiles = useCallback((fileList: File[]) => {
    const valid = fileList.filter(f => ALLOWED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_SIZE);
    setScreenshots(prev => {
      const remaining = MAX_SCREENSHOTS - prev.length;
      if (remaining <= 0) return prev;
      valid.slice(0, remaining).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          setScreenshots(p => p.length < MAX_SCREENSHOTS ? [...p, { name: file.name, base64, mimeType: file.type }] : p);
        };
        reader.readAsDataURL(file);
      });
      return prev;
    });
  }, []);

  const browseForImages = useCallback(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ALLOWED_IMAGE_TYPES.join(",");
    inp.multiple = true;
    inp.onchange = () => handleImageFiles(Array.from(inp.files || []));
    inp.click();
  }, [handleImageFiles]);

  const linkPlannedPage = useCallback(async (plannedId: number, builtPageId: string) => {
    try {
      const updated = await plannedPagesApi.update(plannedId, { builtPageId });
      setPlannedPages(prev => prev.map(p => p.id === plannedId ? updated : p));
    } catch {}
  }, []);

  const generate = useCallback(async (ov: Partial<{ topic: string; userType: string; notes: string; pageType: string; replaceSkeletonId: string }> = {}) => {
    const t = ov.topic || topic; if (!t.trim()) { setTopicTouched(true); return; }
    setLoading(true); setStreaming(true); setEvaluating(false); setShowSuccess(false); setStreamText(""); setError(""); setParseWarn(false); setSelected(null);
    setKarlStatus("connecting");
    adv(0, "Connecting to Karl docs…");
    streamRef.current = ""; lastInput.current = { topic: t, userType: ov.userType || userType, notes: ov.notes || notes };
    const pestNote = isPest(t) ? " Note: pest-related — MUST be Transaction page." : "";
    const effectivePageType = ov.pageType || pendingPageType;
    const pageTypeHint = effectivePageType ? `\nPage type: ${effectivePageType} (use this specific Karl content type)` : "";
    const prefHints = preferences.length > 0
      ? `\n\nUSER PREFERENCES (important — apply these to your design):\n${preferences.map(p => `- ${p.preference}`).join("\n")}`
      : "";
    const skeletonPage = ov.replaceSkeletonId ? pages.find(p => p.id === ov.replaceSkeletonId) : null;
    const skeletonContext = skeletonPage
      ? `\n\nBELOW IS A SKELETON DRAFT WITH PLACEHOLDERS. You MUST preserve the skeleton's structure (headings, sections, CTA, related pages, Content Title, hub assignment) while replacing all "[Content to be generated]" placeholders with real, complete content. Keep the same Service Title, Summary, and section headings unless you have a strong reason to improve them.\n\nSKELETON DRAFT:\n${skeletonPage.raw}`
      : "";
    const msg = `Design a page for: "${t}"\nPrimary user: ${ov.userType || userType}${pageTypeHint}${(ov.notes || notes) ? `\nContext: ${ov.notes || notes}` : ""}${pestNote}${prefHints}${skeletonContext}`;
    let karlHit = false;

    const driveContext = selectedDriveIds.size > 0
      ? [...selectedDriveIds]
          .filter(id => driveContents[id])
          .map(id => {
            const file = driveFiles.find(f => f.id === id);
            return `=== ${file?.name || id} ===\n${driveContents[id]}`;
          })
          .join("\n\n")
      : undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: msg }],
          mcp_servers: [{ type: "url", url: "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/~gitbook/mcp", name: "karl-docs" }],
          ...(driveContext ? { driveContext } : {}),
          ...(screenshots.length > 0 ? { images: screenshots.map(s => ({ base64: s.base64, mimeType: s.mimeType })) } : {})
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

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
              const pct = Math.min(88, 50 + Math.round((charCount / 2200) * 38));
              const lbl = pct < 65 ? "Drafting page structure…" : pct < 75 ? "Writing page content…" : pct < 85 ? "Adding compliance checks…" : "Finalizing page…";
              adv(pct, lbl);
            }
          } catch {}
        }
      }
      if (!karlHit) setKarlStatus("fallback");

      let parsed = parsePage(streamRef.current);
      if (!parsed.valid) setParseWarn(true);
      const id = ov.replaceSkeletonId || `page_${Date.now()}`;

      setStreaming(false);
      setEvaluating(true);
      adv(88, "Improving page structure…");

      const prefTexts = preferences.map(p => p.preference);
      const improved = await improveStructure(streamRef.current, prefTexts);
      if (improved) {
        const improvedParsed = parsePage(improved);
        if (improvedParsed.valid) {
          parsed = improvedParsed;
        }
      }

      let page: PageDraft = { ...parsed, id, createdAt: new Date().toISOString(), inputs: lastInput.current, karlConnected: karlHit } as PageDraft;

      adv(93, "Evaluating against Karl standards…");

      const evaluation = await runKarlEvaluation({
        name: page.name,
        pageType: page.pageType,
        draft: page.draft,
        userType: page.userType
      });

      if (evaluation) {
        page = { ...page, karlEvaluation: evaluation };
      }

      adv(100, "Done");
      setEvaluating(false);

      try {
        await pagesApi.save(id, page);
      } catch {
        setError("Page generated but could not be saved to the database. Refresh to retry.");
      }
      if (ov.replaceSkeletonId) {
        setPages(prev => prev.map(p => p.id === ov.replaceSkeletonId ? page : p));
      } else {
        setPages(prev => [...prev, page]);
      }
      setJustGenerated(page);
      setTimeout(() => setShowSuccess(true), 150);

      const plannedIdToLink = pendingPlannedId
        || plannedPages.find(pp => pp.builtPageId === ov.replaceSkeletonId && ov.replaceSkeletonId)?.id
        || plannedPages.find(pp => !pp.builtPageId && pp.name.toLowerCase() === t.trim().toLowerCase())?.id
        || null;
      if (plannedIdToLink) {
        linkPlannedPage(plannedIdToLink, id);
      }
      setPendingPlannedId(null);
      setPendingPageType("");

      setTopic(""); setNotes(""); setTopicTouched(false); setScreenshots([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Generation failed: ${msg}`);
      setStreaming(false); setEvaluating(false); setKarlStatus("fallback");
    }
    setLoading(false);
  }, [topic, userType, notes, selectedDriveIds, driveContents, driveFiles, plannedPages, linkPlannedPage, pendingPlannedId, pendingPageType, preferences, pages, screenshots]);

  const regenerate = useCallback((p: PageDraft) => { if (p?.inputs) generate({ topic: p.inputs.topic, userType: p.inputs.userType, notes: p.inputs.notes }); }, [generate]);

  const refine = useCallback(async () => {
    if (!selected || !refineInput.trim()) return;
    const instruction = refineInput.trim();
    setRefineInput("");
    setLoading(true); setStreaming(true); setEvaluating(false); setShowSuccess(false);
    setStreamText(""); setError(""); setParseWarn(false);
    streamRef.current = "";
    adv(0, "Sending revision request…");

    const msg = `Here is the current HHVC SF.gov page draft to revise:\n\n${selected.raw}\n\nPlease make this specific change: ${instruction}\n\nReturn the COMPLETE revised page in exactly the same format, preserving all sections not being changed.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: msg }],
          mcp_servers: [{ type: "url", url: "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/~gitbook/mcp", name: "karl-docs" }]
        })
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader(); const dec = new TextDecoder();
      let charCount = 0;
      adv(15, "Revising page content…");
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6); if (d === "[DONE]") continue;
          try {
            const j = JSON.parse(d);
            if (j.type === "content_block_delta" && j.delta?.type === "text_delta") {
              streamRef.current += j.delta.text; setStreamText(s => s + j.delta.text);
              charCount += j.delta.text.length;
              const pct = Math.min(88, 15 + Math.round((charCount / 2200) * 73));
              adv(pct, pct < 45 ? "Revising structure…" : pct < 70 ? "Updating content…" : "Finalizing revisions…");
            }
          } catch {}
        }
      }

      const parsed = parsePage(streamRef.current);
      if (!parsed.valid) setParseWarn(true);
      setStreaming(false); setEvaluating(true);
      adv(93, "Re-evaluating against Karl standards…");

      const evaluation = await runKarlEvaluation({ name: parsed.name, pageType: parsed.pageType, draft: parsed.draft, userType: parsed.userType });
      const updated: PageDraft = { ...selected, ...parsed, id: selected.id, createdAt: selected.createdAt, inputs: selected.inputs, ...(evaluation ? { karlEvaluation: evaluation } : {}) };

      adv(100, "Done"); setEvaluating(false);
      try { await pagesApi.save(selected.id, updated); } catch { setError("Revised but could not save."); }
      setPages(prev => prev.map(p => p.id === selected.id ? updated : p));
      setSelected(updated);

      preferencesApi.create(instruction, "refine")
        .then(pref => setPreferences(prev => [pref, ...prev]))
        .catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Refinement failed: ${msg}`);
      setStreaming(false); setEvaluating(false);
    }
    setLoading(false);
  }, [selected, refineInput]);

  const deletePage = async (id: string) => { await pagesApi.delete(id).catch(() => {}); setPages(p => p.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); };
  const selectById = (id: string) => { const p = pages.find(x => x.id === id); if (p) { setSelected(p); setShowSuccess(false); setTab("builder"); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleDownload = (text: string, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click(); };

  const addPlannedPage = async (name: string, pageType: string, userType: string, parentId: number | null) => {
    try {
      const created = await plannedPagesApi.create(name, pageType, userType, parentId);
      setPlannedPages(prev => [...prev, created]);
    } catch {}
  };

  const deletePlannedPage = async (id: number) => {
    setPlannedPages(prev => prev
      .filter(p => p.id !== id)
      .map(p => p.parentId === id ? { ...p, parentId: null } : p)
    );
    setSelectedPlanned(null);
    try { await plannedPagesApi.delete(id); } catch {}
  };

  const generateFromPlanned = (p: PlannedPage) => {
    setTopic(p.name);
    setUserType(p.userType);
    setPendingPlannedId(p.id);
    setPendingPageType(p.pageType);
    setTab("builder");
  };

  const filtered = pages.filter(p => { const ms = !search || (clean(p.name) || "").toLowerCase().includes(search.toLowerCase()) || (p.draft || "").toLowerCase().includes(search.toLowerCase()); return ms && (filterType === "All" || clean(p.pageType) === filterType); });
  const sorted = sortNewest ? [...filtered].reverse() : filtered;
  const topicError = topicTouched && !topic.trim();

  const Tab = ({ id, label, badge }: { id: string; label: string; badge?: number }) => {
    const active = tab === id;
    return (
      <button onClick={() => setTab(id)} aria-current={active ? "page" : undefined}
        style={{
          fontSize: 13, fontWeight: active ? 500 : 400,
          color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          background: "none", border: "none", cursor: "pointer",
          padding: "8px 2px", borderBottom: `2px solid ${active ? "var(--color-text-primary)" : "transparent"}`,
          transition: "color 0.15s, border-color 0.15s", position: "relative", display: "inline-flex", alignItems: "center", gap: 6
        }}>
        {label}
        {badge !== undefined && badge > 0 && (
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: active ? "var(--color-text-primary)" : "var(--color-background-secondary)", color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)" }}>{badge}</span>
        )}
      </button>
    );
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await pagesApi.import();
      setImportResult(result);
      // Refresh page list
      const updated = await pagesApi.list();
      setPages(updated);
    } catch (err) {
      console.error("Import error:", err);
      setImportResult({ inserted: -1, skipped: 0 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 64px", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: "-0.3px", color: "var(--color-text-primary)" }}>HHVC Page Builder</h1>
          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>SF.gov · Healthy Housing & Vector Control</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>Design SF.gov-compliant content pages for Healthy Housing & Vector Control.</p>
      </div>

      <div style={{ display: "flex", gap: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 24 }}>
        <Tab id="builder" label="Builder" />
        <Tab id="library" label="Library" badge={pages.length} />
        <Tab id="map" label="System Map" />
      </div>

      {tab === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: sidebarOpen ? "300px 1fr" : "40px 1fr", gap: sidebarOpen ? 16 : 8, alignItems: "start", transition: "grid-template-columns 0.25s ease, gap 0.25s ease" }}>
          <div style={{ position: "relative", overflow: "hidden" }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              style={{
                position: sidebarOpen ? "absolute" : "relative",
                top: sidebarOpen ? 8 : 0,
                right: sidebarOpen ? 8 : undefined,
                zIndex: 2,
                width: sidebarOpen ? 24 : 36,
                height: sidebarOpen ? 24 : 36,
                borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                color: "var(--color-text-tertiary)",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-primary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.color = "var(--color-text-tertiary)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarOpen ? "none" : "rotate(180deg)", transition: "transform 0.2s" }}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {sidebarOpen && <>
            <Card style={{ padding: "18px 20px", marginBottom: 12 }}>
              <KarlStatus status={karlStatus} />
              <Field label="Topic" hint={topicError ? "Required" : undefined}>
                <textarea
                  style={{ ...iStyle({ minHeight: 70, resize: "vertical", fontSize: 13, borderColor: topicError ? "var(--color-border-danger)" : undefined }), lineHeight: 1.6 }}
                  placeholder="Describe the page topic…"
                  value={topic}
                  onChange={e => { setTopic(e.target.value); setTopicTouched(true); }}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
                />
                {topicError && <p style={{ fontSize: 11, color: "var(--color-text-danger)", margin: "3px 0 0" }}>Enter a topic to continue</p>}
              </Field>
              <Field label="Primary user">
                <select style={iStyle()} value={userType} onChange={e => setUserType(e.target.value)}>
                  {USER_TYPES.map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Context / notes" hint="Optional">
                <input style={iStyle()} placeholder="Add context or requirements…" value={notes} onChange={e => setNotes(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} />
              </Field>
              <div style={{ marginBottom: 8 }}>
                <Label style={{ marginBottom: 6, fontSize: 11 }}>Screenshots <span style={{ fontWeight: 400, color: "var(--color-text-tertiary)" }}>(optional, up to 3)</span></Label>
                <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = "#185FA5"; e.currentTarget.style.background = "#E6F1FB"; }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation();
                    e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.background = "var(--color-background-secondary)";
                    handleImageFiles(Array.from(e.dataTransfer.files));
                  }}
                  onClick={() => { if (screenshots.length < MAX_SCREENSHOTS) browseForImages(); }}
                  style={{ padding: screenshots.length > 0 ? "8px" : "14px 8px", border: "1.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", cursor: screenshots.length >= 3 ? "default" : "pointer", textAlign: "center", transition: "border-color 0.15s, background 0.15s" }}
                >
                  {screenshots.length === 0 && (
                    <div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 4 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, lineHeight: 1.4 }}>Drop images here or click to browse</p>
                      <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0", opacity: 0.7 }}>PNG, JPG, WEBP &middot; max 4MB each</p>
                    </div>
                  )}
                  {screenshots.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }} onClick={e => e.stopPropagation()}>
                      {screenshots.map((s, i) => (
                        <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: "var(--border-radius-md)", overflow: "hidden", border: "0.5px solid var(--color-border-secondary)" }}>
                          <img src={`data:${s.mimeType};base64,${s.base64}`} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            onClick={e => { e.stopPropagation(); setScreenshots(prev => prev.filter((_, idx) => idx !== i)); }}
                            style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          >&#10005;</button>
                        </div>
                      ))}
                      {screenshots.length < MAX_SCREENSHOTS && (
                        <div
                          onClick={() => browseForImages()}
                          style={{ width: 64, height: 64, borderRadius: "var(--border-radius-md)", border: "1.5px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 20, fontWeight: 300 }}
                        >+</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {pendingPageType && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "6px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <Badge type={pendingPageType} small />
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", flex: 1 }}>from plan</span>
                  <button onClick={() => { setPendingPageType(""); setPendingPlannedId(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--color-text-tertiary)", padding: "2px 4px" }}>&#10005;</button>
                </div>
              )}
              <Btn onClick={() => generate()} variant="primary" size="md" fullWidth disabled={loading}>
                {loading ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…") : `Generate page${selectedDriveIds.size > 0 || screenshots.length > 0 ? ` (${[selectedDriveIds.size > 0 ? `${selectedDriveIds.size} doc${selectedDriveIds.size !== 1 ? "s" : ""}` : "", screenshots.length > 0 ? `${screenshots.length} image${screenshots.length !== 1 ? "s" : ""}` : ""].filter(Boolean).join(", ")})` : ""}`}
              </Btn>
            </Card>

            <Card style={{ padding: "14px 16px", marginBottom: 12 }}>
              <button
                onClick={() => setDriveOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)" }}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  <Label style={{ margin: 0, cursor: "pointer" }}>Reference documents</Label>
                  {selectedDriveIds.size > 0 && (
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#185FA5", color: "#fff", fontWeight: 500 }}>{selectedDriveIds.size}</span>
                  )}
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)", transform: driveOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {driveOpen && (
                <div style={{ marginTop: 12 }}>
                  {driveLoading && <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0, textAlign: "center" }}>Loading Drive files…</p>}
                  {driveError && !driveLoading && (
                    <p style={{ fontSize: 11, color: "#791F1F", margin: 0, lineHeight: 1.5 }}>Could not load Drive files: {driveError}</p>
                  )}
                  {!driveLoading && !driveError && driveFiles.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0, textAlign: "center" }}>No files found in folder.</p>
                  )}
                  {!driveLoading && driveFiles.map(file => {
                    const selected = selectedDriveIds.has(file.id);
                    const loading = driveLoadingIds.has(file.id);
                    const isDoc = file.mimeType.includes("google-apps") || file.mimeType.includes("text") || file.mimeType.includes("pdf") || file.mimeType.includes("word");
                    return (
                      <button
                        key={file.id}
                        onClick={() => !loading && toggleDriveFile(file)}
                        disabled={loading}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: "var(--border-radius-md)", background: selected ? "#E6F1FB" : "transparent", border: `0.5px solid ${selected ? "#185FA5" : "transparent"}`, cursor: loading ? "default" : "pointer", textAlign: "left", marginBottom: 3, transition: "background 0.12s" }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${selected ? "#185FA5" : "var(--color-border-secondary)"}`, background: selected ? "#185FA5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                          {selected && <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>}
                        </div>
                        <span style={{ fontSize: 11, color: selected ? "#0C447C" : "var(--color-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>{file.name}</span>
                        {loading && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>…</span>}
                        {!isDoc && !loading && <span style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>binary</span>}
                      </button>
                    );
                  })}
                  {selectedDriveIds.size > 0 && (
                    <button
                      onClick={() => setSelectedDriveIds(new Set())}
                      style={{ marginTop: 6, fontSize: 11, color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: "3px 0" }}>
                      Clear selection
                    </button>
                  )}
                  <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "8px 0 0", lineHeight: 1.5 }}>
                    Selected documents are included as context when generating pages.
                  </p>
                </div>
              )}
            </Card>

            <Card style={{ padding: "14px 16px", marginBottom: 12 }}>
              <Label style={{ marginBottom: 8 }}>Preferences</Label>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                The agent remembers these when generating and improving pages.
              </p>
              {preferences.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 5, padding: "5px 8px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-primary)", flex: 1, lineHeight: 1.5 }}>{p.preference}</span>
                  <span style={{ fontSize: 9, color: "var(--color-text-tertiary)", flexShrink: 0, marginTop: 2 }}>{p.source}</span>
                  <button
                    onClick={async () => { await preferencesApi.delete(p.id).catch(() => {}); setPreferences(prev => prev.filter(x => x.id !== p.id)); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0, lineHeight: 1 }}
                    title="Remove preference"
                  >&#10005;</button>
                </div>
              ))}
              {preferences.length === 0 && (
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px", fontStyle: "italic" }}>No preferences yet. Add one below or refine a page to teach the agent.</p>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  style={{ ...iStyle({ fontSize: 11 }), flex: 1 }}
                  placeholder='e.g. "Always lead with tenant rights"'
                  value={newPref}
                  onChange={e => setNewPref(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter" && newPref.trim()) {
                      const pref = await preferencesApi.create(newPref.trim(), "manual");
                      setPreferences(prev => [pref, ...prev]);
                      setNewPref("");
                    }
                  }}
                />
                <Btn
                  variant="ghost" size="sm"
                  disabled={!newPref.trim()}
                  onClick={async () => {
                    if (!newPref.trim()) return;
                    const pref = await preferencesApi.create(newPref.trim(), "manual");
                    setPreferences(prev => [pref, ...prev]);
                    setNewPref("");
                  }}
                >Add</Btn>
              </div>
            </Card>

            {pages.length > 0 && (
              <Card style={{ padding: "14px 16px" }}>
                <Label>Recent pages</Label>
                {[...pages].reverse().slice(0, 5).map(p => {
                  const c = TYPE_META[clean(p.pageType)] || { dot: "#888" };
                  return (
                    <button key={p.id} onClick={() => { setSelected(p); setShowSuccess(false); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: "var(--border-radius-md)", background: selected?.id === p.id ? "var(--color-background-secondary)" : "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.4, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clean(p.name) || "Untitled"}</span>
                      {p.karlEvaluation && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" }[p.karlEvaluation.grade] || "#888" }}>
                          {p.karlEvaluation.grade}
                        </span>
                      )}
                    </button>
                  );
                })}
              </Card>
            )}
            </>}
          </div>

          <Card style={{ padding: "20px 24px", minHeight: 400 }}>
            {streaming && (
              <div>
                <ProgressBar progress={progress} label={progressLabel} />
                <StreamRenderer text={streamText} />
              </div>
            )}

            {!streaming && evaluating && <EvaluatingState />}

            {!streaming && !evaluating && showSuccess && justGenerated && (
              <SuccessState page={justGenerated} onView={() => { setSelected(justGenerated); setShowSuccess(false); }} />
            )}

            {!streaming && !evaluating && !showSuccess && selected && (
              <div>
                {/* Page header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
                      <Badge type={clean(selected.pageType)} />
                      {selected.skeleton && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#F3E8FF", color: "#6B21A8", border: "1px dashed #6B21A866", fontWeight: 500 }}>Skeleton</span>
                      )}
                      {selected.karlConnected && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#E1F5EE", color: "#0F6E56", border: "0.5px solid #0F6E5630" }}>Karl verified</span>
                      )}
                      {selected.karlEvaluation && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, fontWeight: 600, background: ({ A: "#E1F5EE", B: "#E6F1FB", C: "#FAEEDA", D: "#FCEBEB", F: "#FCEBEB" } as Record<string,string>)[selected.karlEvaluation.grade] || "#F1EFE8", color: ({ A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" } as Record<string,string>)[selected.karlEvaluation.grade] || "#444" }}>
                          Grade {selected.karlEvaluation.grade} · {selected.karlEvaluation.score}/100
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 2px", letterSpacing: "-0.4px", lineHeight: 1.2, color: "var(--color-text-primary)" }}>{clean(selected.name) || "Untitled"}</h2>
                    <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-tertiary)" }}>SF.gov · Healthy Housing &amp; Vector Control</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    {selected.skeleton && (
                      <Btn onClick={() => { if (selected.inputs) generate({ topic: selected.inputs.topic, userType: selected.inputs.userType, notes: selected.inputs.notes, replaceSkeletonId: selected.id }); }} variant="primary" size="sm">Generate with AI</Btn>
                    )}
                    <Btn onClick={() => handleCopy(selected.raw)} variant="ghost" size="sm">{copied ? "Copied!" : "Copy"}</Btn>
                    <Btn onClick={() => handleDownload(selected.raw, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + ".txt")} variant="ghost" size="sm">Download</Btn>
                    {!selected.skeleton && <Btn onClick={() => regenerate(selected)} variant="ghost" size="sm">Regenerate</Btn>}
                    <Btn onClick={() => deletePage(selected.id)} variant="danger" size="sm">Delete</Btn>
                  </div>
                </div>

                {/* Compact metadata row */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {[["User", selected.userType], ["Goal", selected.userGoal], ["Purpose", selected.purpose]].map(([k, v]) => v && (
                    <div key={k} style={{ display: "flex", alignItems: "baseline", gap: 5, padding: "5px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>{k}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{clean(v as string)}</span>
                    </div>
                  ))}
                </div>

                {selected.karlEvaluation && <KarlEvalPanel evaluation={selected.karlEvaluation} />}

                {/* SF.gov page preview */}
                <div style={{ border: "1px solid #D1D5DB", borderRadius: 8, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", background: "#F7F6F2", borderBottom: "1px solid #E5E4DF" }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#8C8B87", textTransform: "uppercase", letterSpacing: "0.09em" }}>SF.gov preview</span>
                    <Btn onClick={() => handleDownload(selected.draft, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + "-draft.txt")} variant="ghost" size="sm">Export</Btn>
                  </div>
                  <SfGovPagePreview draft={selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
                </div>

                {/* Enforcement & integration notes */}
                {selected.enforcement && (
                  <div style={{ borderRadius: "var(--border-radius-md)", border: "0.5px solid #854F0B33", overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ padding: "7px 14px", background: "#FAEEDA88", borderBottom: "0.5px solid #854F0B22" }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: "#854F0B", textTransform: "uppercase", letterSpacing: "0.08em" }}>Enforcement check</span>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      {clean(selected.enforcement).split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i} style={{ fontSize: 12, margin: "0 0 6px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {selected.integration && (
                  <div style={{ borderRadius: "var(--border-radius-md)", border: "0.5px solid #185FA533", overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ padding: "7px 14px", background: "#E6F1FB88", borderBottom: "0.5px solid #185FA522" }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: "#185FA5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Integration notes</span>
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      {clean(selected.integration).split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i} style={{ fontSize: 12, margin: "0 0 6px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                <ComponentChips components={selected.components} />
                <RelPanel rel={selected.relationships} />

                {/* Refine panel */}
                <div style={{ marginTop: 20, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16 }}>
                  <Label style={{ marginBottom: 8 }}>Refine this page</Label>
                  <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 10px", lineHeight: 1.5 }}>Describe a specific change and the agent will revise the page content.</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                      value={refineInput}
                      onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) refine(); }}
                      placeholder='e.g. "Shorten the responsibilities section" or "Add a step about taking photos of the problem"'
                      rows={2}
                      style={{ ...iStyle({ resize: "vertical", fontSize: 13, lineHeight: 1.6, flex: "1" }), minHeight: 52 }}
                    />
                    <Btn onClick={refine} variant="primary" size="md" disabled={loading || !refineInput.trim()} style={{ flexShrink: 0, alignSelf: "flex-end" }}>
                      Send
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {!streaming && !evaluating && !showSuccess && !selected && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 360, gap: 14, color: "var(--color-text-tertiary)" }}>
                {pagesLoading ? (
                  <>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Loading pages…</p>
                  </>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" /></svg>
                    <div style={{ textAlign: "center", maxWidth: 220 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>{pages.length === 0 ? "No pages yet" : "Select a page"}</p>
                      <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>{pages.length === 0 ? "Enter a topic in the form and click Generate to create your first page." : "Choose a page from the Recent list or Library tab."}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#FCEBEB", borderRadius: "var(--border-radius-md)", border: "0.5px solid #A32D2D30" }}>
                <p style={{ fontSize: 13, color: "#791F1F", margin: "0 0 6px", fontWeight: 500 }}>Generation failed</p>
                <p style={{ fontSize: 12, color: "#791F1F", margin: 0, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}
            {parseWarn && !error && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#FAEEDA", borderRadius: "var(--border-radius-md)", border: "0.5px solid #854F0B30" }}>
                <p style={{ fontSize: 12, color: "#633806", margin: 0 }}>Page was generated but some fields could not be parsed fully. Review the draft carefully.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "map" && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 16, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: 3, width: "fit-content" }}>
            {(["plan", "view"] as const).map(m => (
              <button key={m} onClick={() => setMapMode(m)}
                style={{
                  fontSize: 12, fontWeight: mapMode === m ? 500 : 400,
                  color: mapMode === m ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  background: mapMode === m ? "var(--color-background-primary)" : "transparent",
                  border: mapMode === m ? "0.5px solid var(--color-border-tertiary)" : "0.5px solid transparent",
                  borderRadius: "var(--border-radius-sm, 4px)", padding: "5px 14px", cursor: "pointer",
                  transition: "all 0.15s"
                }}>
                {m === "plan" ? "Plan" : "View"}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
            {mapMode === "view" ? (
              <>
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
              </>
            ) : (
              <>
                <div>
                  <Card style={{ padding: "16px 20px", marginBottom: 14 }}>
                    {plannedLoading ? (
                      <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ fontSize: 13, margin: 0 }}>Loading plan…</p>
                      </div>
                    ) : (
                      <PlanDiagram planned={plannedPages} pages={pages} onSelectPlanned={setSelectedPlanned} />
                    )}
                  </Card>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {PAGE_TYPES.map(t => { const c = TYPE_META[t]; return <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: c.fill, color: c.text, border: `1px solid ${c.stroke}` }}>{t}</span>; })}
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-primary)", color: "var(--color-text-tertiary)", border: "0.5px dashed var(--color-border-secondary)" }}>planned</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "#0F6E56", border: "1px solid #0F6E5640" }}>built</span>
                  </div>
                </div>
                <PlanSidebar
                  planned={plannedPages}
                  pages={pages}
                  selectedPlanned={selectedPlanned}
                  onSelectPlanned={setSelectedPlanned}
                  onAdd={addPlannedPage}
                  onDelete={deletePlannedPage}
                  onGenerate={generateFromPlanned}
                  onViewPage={selectById}
                />
              </>
            )}
          </div>
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
            {pages.some(p => p.skeleton) && <Btn onClick={() => handleDownload(pages.filter(p => p.skeleton).map(p => p.raw).join("\n\n---\n\n"), "hhvc-skeletons-export.txt")} variant="ghost" size="sm">Download skeletons</Btn>}
            <Btn
              onClick={handleImport}
              variant="ghost"
              size="sm"
              disabled={importing}
            >
              {importing ? "Importing…" : "Import HHVC Pages"}
            </Btn>
            {importResult && (
              <span style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                background: importResult.inserted >= 0 ? "#E1F5EE" : "#FCEBEB",
                color: importResult.inserted >= 0 ? "#0F6E56" : "#A32D2D",
                border: importResult.inserted >= 0 ? "0.5px solid #0F6E5630" : "0.5px solid #A32D2D30"
              }}>
                {importResult.inserted >= 0
                  ? `${importResult.inserted} imported · ${importResult.skipped} skipped`
                  : "Import failed"}
              </span>
            )}
          </div>
          {seeding && (
            <div style={{ textAlign: "center", padding: "24px 0 12px", color: "#6B21A8" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #6B21A833", borderTopColor: "#6B21A8", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Seeding 3-hub sitemap skeleton…</p>
              <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--color-text-tertiary)" }}>Creating 13 planned pages with skeleton drafts</p>
            </div>
          )}
          {pagesLoading && !seeding && (
            <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, margin: 0 }}>Loading pages…</p>
            </div>
          )}
          {!pagesLoading && sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0", color: "var(--color-text-tertiary)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 12, display: "block", margin: "0 auto 12px" }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6M9 12h6M9 15h4" /></svg>
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>{pages.length === 0 ? "No pages yet" : "No results"}</p>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{pages.length === 0 ? "Generate your first page in the Builder tab." : "Try adjusting your search or filter."}</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
            {sorted.map(p => {
              const c = TYPE_META[clean(p.pageType)] || { dot: "#888" };
              const ev = p.karlEvaluation;
              const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };
              return (
                <Card key={p.id} onClick={() => { setSelected(p); setShowSuccess(false); setTab("builder"); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, ...(p.skeleton ? { border: "1.5px dashed #6B21A8", background: "transparent" } : {}) }} />
                    <Badge type={clean(p.pageType)} small />
                    {p.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F3E8FF", color: "#6B21A8", border: "1px dashed #6B21A866" }}>skeleton</span>}
                    {p.imported && (
                      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F1EFE8", color: "#6B4C00", border: "0.5px solid #6B4C0033" }}>
                        imported
                      </span>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                      {ev && <span style={{ fontSize: 10, fontWeight: 700, color: gradeColor[ev.grade] || "#888" }}>{ev.grade}</span>}
                      {!p.karlConnected && !p.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FAEEDA", color: "#854F0B" }}>no Karl</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4, color: "var(--color-text-primary)" }}>{clean(p.name) || "Untitled"}</p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>{(clean(p.userGoal) || "").slice(0, 70)}{(clean(p.userGoal) || "").length > 70 ? "…" : ""}</p>
                  {ev && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                      {ev.passed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#E1F5EE", color: "#0F6E56" }}>✓ {ev.passed.length}</span>}
                      {ev.warnings.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FAEEDA", color: "#854F0B" }}>⚠ {ev.warnings.length}</span>}
                      {ev.failed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D" }}>✗ {ev.failed.length}</span>}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
                    <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, flex: 1 }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    {p.imported && (
                      <select
                        value={p.reviewStatus || "pending"}
                        onClick={e => e.stopPropagation()}
                        onChange={async e => {
                          e.stopPropagation();
                          const newStatus = e.target.value as 'pending' | 'approved' | 'rejected';
                          try {
                            await pagesApi.updateReview(p.id, newStatus);
                            setPages(prev => prev.map(x => x.id === p.id ? { ...x, reviewStatus: newStatus } : x));
                          } catch {
                            // server error — dropdown will revert on next render
                          }
                        }}
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "0.5px solid",
                          background: ({ pending: "#FAEEDA", approved: "#E1F5EE", rejected: "#FCEBEB" } as Record<string,string>)[p.reviewStatus || "pending"] || "#FAEEDA",
                          color: ({ pending: "#854F0B", approved: "#0F6E56", rejected: "#A32D2D" } as Record<string,string>)[p.reviewStatus || "pending"] || "#854F0B",
                          borderColor: ({ pending: "#854F0B33", approved: "#0F6E5633", rejected: "#A32D2D33" } as Record<string,string>)[p.reviewStatus || "pending"] || "#854F0B33",
                          cursor: "pointer",
                          appearance: "none" as const,
                          WebkitAppearance: "none" as const
                        }}
                      >
                        <option value="pending">pending review</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                      </select>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
