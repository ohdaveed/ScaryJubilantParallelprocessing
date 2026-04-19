import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageDraft, TodoItem, KarlEvaluation, PlannedPage, UserPreference, SuggestedPage, ReviewStatus } from "./types";
import { USER_TYPES, PAGE_TYPES, SUGGESTED_PAGES, TYPE_META } from "./constants";
import { clean, pagesApi, todosApi, preferencesApi, filterEligibleSuggestedPages, sampleSuggestedPages } from "./utils";
import { Badge, Label, Divider, Btn, Card, Field, ComponentChips, RelPanel, KarlStatus, KarlEvalPanel, ProgressBar, iStyle } from "./components/ui";
import { SfGovPagePreview } from "./components/SfGovPreview";
import { toPng } from "html-to-image";
import IdealSiteMap from "./components/IdealSiteMap";
import { usePagesData } from "./hooks/usePagesData";
import { useDriveContext } from "./hooks/useDriveContext";
import { usePlanMap } from "./hooks/usePlanMap";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { usePageGeneration } from "./hooks/usePageGeneration";
import { MapTab } from "./components/tabs/MapTab";
import { LibraryTab } from "./components/tabs/LibraryTab";
import { ScreenshotAsset } from "./state/appTypes";
import "./App.css";


function StreamRenderer({ text }: { text: string }) {
  return (
    <div className="streamRenderer">
      {text.split("\n").map((line, i) => {
        const isH = /^(PAGE NAME:|PRIMARY USER:|PAGE TYPE:|USER GOAL:|PRIMARY PURPOSE:|SYSTEM RELATIONSHIPS:|ENFORCEMENT CHECK:|INTEGRATION NOTES:|PAGE DRAFT|RECOMMENDED COMPONENTS:|DUPLICATION RISKS:)/.test(line);
        const isDH = /^#{1,3} /.test(line);
        const isKarl = /^\[Querying Karl/.test(line);
        const lineClass = [
          "streamRenderer__line",
          isKarl ? "streamRenderer__line--karl" : "",
          !isKarl && (isH || isDH) ? "streamRenderer__line--key" : ""
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={i} className={lineClass}>
            {line || " "}
          </div>
        );
      })}
      <span className="streamRenderer__cursor" aria-hidden="true" />
    </div>
  );
}

function EvaluatingState() {
  return (
    <div className="app-evaluating">
      <div className="app-evaluating__icon-wrap">
        <svg className="app-svg-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <div>
        <p className="app-evaluating__title">Evaluating against Karl standards</p>
        <p className="app-evaluating__sub">Checking SF.gov best practices and content standards…</p>
      </div>
    </div>
  );
}

function SuccessState({ page, onView }: { page: PageDraft; onView: () => void }) {
  const ev = page.karlEvaluation;
  const grade = ev?.grade || "—";

  const gradeKey = ["A", "B", "C", "D", "F"].includes(grade) ? grade : "none";

  return (
    <div className="app-success">
      <div className="app-success__icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11" /></svg>
      </div>
      <div className="app-success__body">
        <p className="app-success__name">{clean(page?.name) || "Page generated"}</p>
        <p className="app-success__desc">Page draft created and evaluated against Karl content standards.</p>
      </div>

      <div className="app-success__badges">
        <Badge type={clean(page?.pageType)} />
        {ev && (
          <div className="app-grade-chip" data-grade={gradeKey}>
            <span className="app-grade-chip__letter">{grade}</span>
            <span className="app-grade-chip__score">{ev.score}/100</span>
          </div>
        )}
      </div>

      {ev && (
        <div className="app-success__eval-wrap">
          <div className="app-success__eval-box">
            <p className="app-success__eval-summary">{ev.summary}</p>
            <div className="app-success__stat-row">
              {ev.passed.length > 0 && <span className="app-stat-pill app-stat-pill--pass">✓ {ev.passed.length} passed</span>}
              {ev.warnings.length > 0 && <span className="app-stat-pill app-stat-pill--warn">⚠ {ev.warnings.length} warnings</span>}
              {ev.failed.length > 0 && <span className="app-stat-pill app-stat-pill--fail">✗ {ev.failed.length} failed</span>}
            </div>
          </div>
        </div>
      )}

      <Btn onClick={onView} variant="primary" size="md">View full page →</Btn>
    </div>
  );
}


function PlanDiagram({ planned, pages, onSelectPlanned }: { planned: PlannedPage[]; pages: PageDraft[]; onSelectPlanned: (p: PlannedPage) => void }) {
  const W = 680, H = 400;
  if (!planned.length) return (
    <div className="app-plan-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /></svg>
      <div className="app-plan-empty__text">
        <p className="app-plan-empty__title">No planned pages yet</p>
        <p className="app-plan-empty__sub">Add pages using the form to sketch your site architecture.</p>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="app-plan-svg">
      <defs><marker id="plan-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#B4B2A9" /></marker></defs>
      {edges.map(([a, b], i) => { const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b); if (!na || !nb) return null; return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#D3D1C7" strokeWidth="1" markerEnd="url(#plan-arr)" />; })}
      {nodes.map(n => {
        const c = TYPE_META[n.type] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };
        const label = n.name.length > 20 ? n.name.slice(0, 18) + "\u2026" : n.name;
        const isRoot = !n.parentId;
        const rx = isRoot ? 72 : 62, ry = isRoot ? 26 : 22;
        return (
          <g key={n.id} className="app-plan-node" onClick={() => { const pp = planned.find(p => p.id === n.id); if (pp) onSelectPlanned(pp); }}>
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
    <Card className="app-card-pad--16-18">
      {selectedPlanned ? (
        <div>
          <div className="app-ps-row">
            <p className="app-up-label app-up-label--flush">Planned page</p>
            <button type="button" className="app-ps-back" onClick={() => onSelectPlanned(null)}>&larr; Back</button>
          </div>
          <h3 className="app-ps-title">{selectedPlanned.name}</h3>
          <div className="app-ps-meta">
            <div className="app-ps-meta-row">
              <Badge type={selectedPlanned.pageType} small />
            </div>
            <p className="app-ps-muted">User: {selectedPlanned.userType}</p>
            {selectedPlanned.parentId && (
              <p className="app-ps-muted">Parent: {planned.find(p => p.id === selectedPlanned.parentId)?.name || "Unknown"}</p>
            )}
          </div>
          {builtPage ? (
            <div>
              <div className="app-ps-built-box">
                <p className="app-ps-built-title">Page has been generated</p>
                {builtPage.karlEvaluation && (
                  <p className="app-ps-built-sub">Grade {builtPage.karlEvaluation.grade} &middot; {builtPage.karlEvaluation.score}/100</p>
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
          <div className="app-ps-row app-ps-row--center">
            <p className="app-up-label app-up-label--flush">Site plan</p>
            <span className="app-ps-count">{planned.length} page{planned.length !== 1 ? "s" : ""}</span>
          </div>

          {planned.map(p => {
            const isBuilt = !!p.builtPageId && pages.some(pg => pg.id === p.builtPageId);
            return (
              <button key={p.id} type="button" className="app-plan-item" onClick={() => onSelectPlanned(p)}>
                <span className="app-plan-item__dot" data-page-type={p.pageType} />
                <span className="app-plan-item__label">{p.name}</span>
                {isBuilt && <span className="app-plan-item__built">built</span>}
              </button>
            );
          })}

          {adding ? (
            <div className="app-ps-add-panel">
              <input className="app-input app-input--sm app-input--mb6" placeholder="Page name…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} autoFocus />
              <select className="app-input app-input--sm app-input--mb6" aria-label="Page type" title="Page type" value={pageType} onChange={e => setPageType(e.target.value)}>
                {PAGE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="app-input app-input--sm app-input--mb6" aria-label="Primary user" title="Primary user" value={ut} onChange={e => setUt(e.target.value)}>
                {USER_TYPES.map(u => <option key={u}>{u}</option>)}
              </select>
              <select className="app-input app-input--sm app-input--mb8" aria-label="Parent page" title="Parent page" value={parentId ?? ""} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">No parent</option>
                {planned.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="app-row-gap-6">
                <Btn onClick={handleAdd} variant="primary" size="sm">Add</Btn>
                <Btn onClick={() => { setAdding(false); setName(""); }} variant="ghost" size="sm">Cancel</Btn>
              </div>
            </div>
          ) : (
            <button type="button" className="app-ps-add-dash" onClick={() => setAdding(true)}>
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
  const [visibleSuggested, setVisibleSuggested] = useState<SuggestedPage[]>([]);

  useEffect(() => {
    todosApi.list()
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoadingTodos(false));
  }, []);

  const suggested = useMemo(
    () => filterEligibleSuggestedPages(SUGGESTED_PAGES, pages, todos),
    [pages, todos]
  );

  const suggestedKey = useMemo(
    () => suggested.map((entry) => entry.topic).join("|"),
    [suggested]
  );

  useEffect(() => {
    setVisibleSuggested((previous) => {
      const nextSample = sampleSuggestedPages(suggested, 5, previous.map((entry) => entry.topic));
      const hasSameTopics =
        previous.length === nextSample.length &&
        previous.every((entry, index) => entry.topic === nextSample[index]?.topic);

      return hasSameTopics ? previous : nextSample;
    });
  }, [suggested, suggestedKey]);
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

  const refreshSuggestions = () => {
    setVisibleSuggested((previous) =>
      sampleSuggestedPages(suggested, 5, previous.map((entry) => entry.topic))
    );
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
        <button
          onClick={suggested.length === 1 ? undefined : suggested.length > 0 ? refreshSuggestions : () => setAdding(true)}
          disabled={suggested.length === 1}
          style={{ width: "100%", padding: "8px 0", fontSize: 12, border: "0.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-secondary)", cursor: suggested.length === 1 ? "not-allowed" : "pointer", marginTop: 4, transition: "border-color 0.15s,color 0.15s", opacity: suggested.length === 1 ? 0.5 : 1 }}
          onMouseEnter={e => { if (suggested.length !== 1) { e.currentTarget.style.borderColor = "var(--color-border-primary)"; e.currentTarget.style.color = "var(--color-text-primary)"; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
          {suggested.length > 0 ? "Refresh choices" : "+ Add page"}
        </button>
      )}

      {suggested.length > 0 && (
        <>
          <Divider m="14px 0 10px" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Label style={{ margin: 0 }}>Suggested</Label>
            <Btn onClick={refreshSuggestions} variant="ghost" size="sm" disabled={suggested.length <= 1}>Refresh choices</Btn>
          </div>
          {visibleSuggested.map((s, i) => {
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
  const [selected, setSelected] = useState<PageDraft | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortNewest, setSortNewest] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topicTouched, setTopicTouched] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [newPref, setNewPref] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotAsset[]>([]);
  const screenshotRef = useRef<HTMLDivElement>(null);

  const { pages, setPages, pagesLoading, deletePage: deleteStoredPage, importing, importResult, importPages } = usePagesData();
  const {
    plannedPages,
    plannedLoading,
    selectedPlanned,
    setSelectedPlanned,
    mapMode,
    setMapMode,
    pendingPlannedId,
    setPendingPlannedId,
    pendingPageType,
    setPendingPageType,
    seeding,
    linkPlannedPage,
    addPlannedPage,
    deletePlannedPage
  } = usePlanMap(setPages);
  const {
    driveFiles,
    driveLoading,
    driveError,
    driveOpen,
    setDriveOpen,
    selectedDriveIds,
    setSelectedDriveIds,
    driveContents,
    driveLoadingIds,
    toggleDriveFile,
    clearSelectedDriveFiles
  } = useDriveContext();
  const {
    historyPageId,
    setHistoryPageId,
    historyVersions,
    historyLoading,
    openHistory,
    restoreVersion: restoreVersionFromHistory
  } = useVersionHistory();

  const {
    loading,
    streaming,
    evaluating,
    showSuccess,
    setShowSuccess,
    streamText,
    progress,
    progressLabel,
    karlStatus,
    error,
    parseWarn,
    justGenerated,
    generate,
    regenerate,
    refine
  } = usePageGeneration({
    topic,
    userType,
    notes,
    pendingPageType,
    pendingPlannedId,
    preferences,
    pages,
    selected,
    screenshots,
    selectedDriveIds,
    driveContents,
    driveFiles,
    plannedPages,
    refineInput,
    setPages,
    setSelected,
    setPendingPlannedId,
    setPendingPageType,
    setTopic,
    setNotes,
    setTopicTouched,
    setScreenshots,
    setPreferences,
    setRefineInput,
    linkPlannedPage
  });

  useEffect(() => {
    setPreferences([]);
    if (!selected) return;
    preferencesApi.list(selected.id)
      .then(prefs => setPreferences(prefs))
      .catch(() => {});
  }, [selected?.id]);

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

  const deletePage = useCallback(async (id: string) => {
    await deleteStoredPage(id);
    if (selected?.id === id) setSelected(null);
  }, [deleteStoredPage, selected]);

  const restoreVersion = useCallback(async (pageId: string, versionId: number, versionNumber: number) => {
    await restoreVersionFromHistory(pageId, versionId, versionNumber, (restoredData) => {
      setPages(prev => prev.map(p => p.id === pageId ? restoredData : p));
      if (selected?.id === pageId) setSelected(restoredData);
    });
  }, [restoreVersionFromHistory, setPages, selected]);

  const togglePageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllPages = () => setSelectedPageIds(new Set(filtered.map(p => p.id)));
  const clearPageSelection = () => setSelectedPageIds(new Set());
  const deleteSelectedPages = async () => {
    const count = selectedPageIds.size;
    if (!window.confirm(`Delete ${count} page${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    for (const id of selectedPageIds) { await deletePage(id); }
    setSelectedPageIds(new Set());
  };
  const selectById = (id: string) => { const p = pages.find(x => x.id === id); if (p) { setSelected(p); setShowSuccess(false); setTab("builder"); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleDownload = (text: string, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click(); };

  const handleExportScreenshot = async (pageName: string) => {
    if (!screenshotRef.current) return;
    await document.fonts.ready;
    const filename = (clean(pageName) || "page").toLowerCase().replace(/\s+/g, "-") + ".png";
    try {
      const dataUrl = await toPng(screenshotRef.current, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("Screenshot export failed:", err);
      handleDownload(selected?.draft ?? "", filename.replace(".png", "-draft.txt"));
    }
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
  useEffect(() => { setSelectedPageIds(new Set()); }, [search, filterType]);
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

  const handleImport = useCallback(async () => {
    await importPages();
  }, [importPages]);

  const handleUpdateReviewStatus = useCallback(async (id: string, status: ReviewStatus) => {
    try {
      await pagesApi.updateReview(id, status);
      setPages((prev) => prev.map((x) => x.id === id ? { ...x, reviewStatus: status } : x));
    } catch {
      // Server error; UI will remain on previous state until next refresh.
    }
  }, [setPages]);

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
                      onClick={clearSelectedDriveFiles}
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

            {selected && (
            <Card style={{ padding: "14px 16px", marginBottom: 12 }}>
              <Label style={{ marginBottom: 8 }}>Preferences</Label>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                Remembered for this page. Refine to teach the agent.
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
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px", fontStyle: "italic" }}>No preferences yet. Add one below or refine this page to teach the agent.</p>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  style={{ ...iStyle({ fontSize: 11 }), flex: 1 }}
                  placeholder='e.g. "Always lead with tenant rights"'
                  value={newPref}
                  onChange={e => setNewPref(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter" && newPref.trim()) {
                      const pref = await preferencesApi.create(newPref.trim(), "manual", selected?.id);
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
                    const pref = await preferencesApi.create(newPref.trim(), "manual", selected?.id);
                    setPreferences(prev => [pref, ...prev]);
                    setNewPref("");
                  }}
                >Add</Btn>
              </div>
            </Card>
            )}

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
                    {!selected.skeleton && <Btn onClick={() => openHistory(selected.id)} variant="ghost" size="sm">History</Btn>}
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
                {selected.qualityGate?.status === "review_required" && (
                  <div style={{ marginBottom: 12, padding: "10px 12px", background: "#FAEEDA", borderRadius: "var(--border-radius-md)", border: "0.5px solid #854F0B40" }}>
                    <p style={{ fontSize: 12, margin: "0 0 6px", color: "#633806", fontWeight: 500 }}>Manual review required before publish</p>
                    {selected.qualityGate.reasons.map((reason, idx) => (
                      <p key={idx} style={{ fontSize: 11, margin: "0 0 3px", color: "#633806", lineHeight: 1.5 }}>{reason}</p>
                    ))}
                  </div>
                )}

                {/* SF.gov page preview */}
                <div style={{ border: "1px solid #D1D5DB", borderRadius: 8, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", background: "#F7F6F2", borderBottom: "1px solid #E5E4DF" }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: "#8C8B87", textTransform: "uppercase", letterSpacing: "0.09em" }}>SF.gov preview</span>
                    <Btn onClick={() => handleExportScreenshot(selected.name)} variant="ghost" size="sm">Download preview</Btn>
                  </div>
                  <SfGovPagePreview ref={screenshotRef} draft={selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
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
        <MapTab
          mapMode={mapMode}
          setMapMode={setMapMode}
          pages={pages}
          plannedPages={plannedPages}
          plannedLoading={plannedLoading}
          selectedPlanned={selectedPlanned}
          setSelectedPlanned={setSelectedPlanned}
          addPlannedPage={addPlannedPage}
          deletePlannedPage={deletePlannedPage}
          selectById={selectById}
          generateFromPlanned={generateFromPlanned}
          onTodoGenerate={(t, u) => { setTopic(t); setUserType(u); setTab("builder"); }}
          PlanDiagramComponent={PlanDiagram}
          PlanSidebarComponent={PlanSidebar}
          TodoPanelComponent={TodoPanel}
        />
      )}

      {tab === "library" && (
        <LibraryTab
          search={search}
          setSearch={setSearch}
          filterType={filterType}
          setFilterType={setFilterType}
          sortNewest={sortNewest}
          setSortNewest={setSortNewest}
          importing={importing}
          importResult={importResult}
          pagesLoading={pagesLoading}
          seeding={seeding}
          pages={pages}
          sorted={sorted}
          filteredCount={filtered.length}
          selectedPageIds={selectedPageIds}
          selectAllPages={selectAllPages}
          clearPageSelection={clearPageSelection}
          deleteSelectedPages={deleteSelectedPages}
          onImport={handleImport}
          onDownloadText={handleDownload}
          onSelectPage={(p) => { setSelected(p); setShowSuccess(false); setTab("builder"); }}
          onTogglePageSelection={togglePageSelection}
          onUpdateReviewStatus={handleUpdateReviewStatus}
        />
      )}
      {historyPageId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }} onClick={() => setHistoryPageId(null)}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div
            style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, background: "var(--color-background-primary)", borderLeft: "0.5px solid var(--color-border-secondary)", display: "flex", flexDirection: "column", zIndex: 101 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Version History</span>
              <button onClick={() => setHistoryPageId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-tertiary)", lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {historyLoading ? (
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", paddingTop: 24 }}>Loading…</p>
              ) : historyVersions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", paddingTop: 24 }}>No versions saved yet.</p>
              ) : historyVersions.map(v => (
                <div key={v.id} style={{ marginBottom: 12, padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>v{v.versionNumber}</span>
                    <span style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 8,
                      background: v.trigger === "generate" ? "#E1F5EE" : v.trigger === "restore" ? "#E6F1FB" : "#FAEEDA",
                      color: v.trigger === "generate" ? "#0F6E56" : v.trigger === "restore" ? "#185FA5" : "#854F0B"
                    }}>{v.trigger}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>
                      {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {v.notes && (
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {v.notes}
                    </p>
                  )}
                  <Btn onClick={() => restoreVersion(historyPageId, v.id, v.versionNumber)} variant="ghost" size="sm">Restore this version</Btn>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
