import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageDraft, TodoItem, KarlEvaluation, PlannedPage, UserPreference, ReviewStatus } from "./types";
import { USER_TYPES, PAGE_TYPES, TYPE_META } from "./constants";
import { clean, pagesApi, replacePageDraftInRaw, todosApi, preferencesApi } from "./utils";
import { Badge, Divider, Btn, Card, ComponentChips, RelPanel, KarlStatus, KarlEvalPanel, ProgressBar } from "./components/ui";
import { SfGovPagePreview } from "./components/SfGovPreview";
import { toPng } from "html-to-image";
import { usePagesData } from "./hooks/usePagesData";
import { usePlanMap } from "./hooks/usePlanMap";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { usePageGeneration } from "./hooks/usePageGeneration";
import { MapTab } from "./components/tabs/MapTab";
import { LibraryTab } from "./components/tabs/LibraryTab";
import { SfGovContentDesignTool, type ContentDesignTab, type KarlEvaluationView } from "./components/SfGovContentDesignTool";
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
          <Divider variant="plan" />
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

function TodoPanel({ onGenerate }: { onGenerate: (topic: string, userType: string) => void }) {
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

  const pending = todos.filter(t => !t.done), done = todos.filter(t => t.done);

  return (
    <Card className="app-card-pad--16-18">
      <div className="app-todo-header">
        <p className="app-up-label app-up-label--flush">Pages to build</p>
        {pending.length > 0 && <span className="app-pending-badge">{pending.length}</span>}
      </div>

      {loadingTodos && <p className="app-loading-p">Loading…</p>}

      {!loadingTodos && pending.length === 0 && done.length === 0 && (
        <div className="app-todo-empty">
          <p className="app-todo-empty__t">No pages queued</p>
          <p className="app-todo-empty__s">Add topics below to build your queue</p>
        </div>
      )}

      {pending.map(t => (
        <div key={t.id} className="app-todo-row">
          <button type="button" className="app-todo-check" onClick={() => toggle(t.id, t.done)} aria-label="Mark done" />
          <div className="app-todo-body">
            <p className="app-todo-topic">{t.topic}</p>
            <p className="app-todo-ut">{t.userType}</p>
          </div>
          <div className="app-todo-actions">
            <Btn onClick={() => onGenerate(t.topic, t.userType)} variant="primary" size="sm">Build</Btn>
            <button type="button" className="app-ghost-x" onClick={() => remove(t.id)}>✕</button>
          </div>
        </div>
      ))}

      {done.map(t => (
        <div key={t.id} className="app-todo-done-row">
          <button type="button" className="app-todo-done-check" onClick={() => toggle(t.id, t.done)} aria-label="Unmark">
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
          </button>
          <p className="app-todo-done-topic">{t.topic}</p>
          <button type="button" className="app-ghost-x app-ghost-x--tight" onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}

      {adding ? (
        <div className="app-todo-add-box">
          <input className="app-input app-input--sm app-input--mb6" placeholder="Page topic…" value={newTopic} onChange={e => setNewTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} autoFocus />
          <select className="app-input app-input--sm app-input--mb8" aria-label="Primary user" title="Primary user" value={newUT} onChange={e => setNewUT(e.target.value)}>
            {USER_TYPES.map(u => <option key={u}>{u}</option>)}
          </select>
          <div className="app-row-gap-6">
            <Btn onClick={addTodo} variant="primary" size="sm">Add</Btn>
            <Btn onClick={() => { setAdding(false); setNewTopic(""); }} variant="ghost" size="sm">Cancel</Btn>
          </div>
        </div>
      ) : (
        <button type="button" className="app-todo-dash" onClick={() => setAdding(true)}>
          + Add page
        </button>
      )}
    </Card>
  );
}

type WorkspaceTab = "plan" | "generate" | "library" | "ideal";

const WORKSPACE_TABS: readonly ContentDesignTab[] = [
  { id: "plan", label: "Site Plan" },
  { id: "generate", label: "Generate" },
  { id: "library", label: "Library" },
  { id: "ideal", label: "Ideal Map" }
];

const STUDIO_PAGE_TYPE_CHIPS = [
  "Transaction",
  "Information",
  "Topic",
  "Step by step",
  "Location",
  "Resource Collection"
] as const;

function studioPageTypes(): string[] {
  return STUDIO_PAGE_TYPE_CHIPS.filter((t) => PAGE_TYPES.includes(t));
}

function buildKarlPanelView(ev: KarlEvaluation | undefined): KarlEvaluationView | null {
  if (!ev) return null;
  const checks: KarlEvaluationView["checks"] = [
    ...ev.passed.map((label, i) => ({ id: `p-${i}`, label: `${label} — passed`, status: "pass" as const })),
    ...ev.warnings.map((label, i) => ({ id: `w-${i}`, label: `${label} — warning`, status: "warn" as const })),
    ...ev.failed.map((label, i) => ({ id: `f-${i}`, label: `${label} — failed`, status: "fail" as const }))
  ];
  const w = ev.warnings.length;
  const f = ev.failed.length;
  const parts: string[] = [];
  if (w) parts.push(`${w} warning${w !== 1 ? "s" : ""}`);
  if (f) parts.push(`${f} failed`);
  return {
    grade: ev.grade || "—",
    score: ev.score,
    maxScore: 100,
    warningsSummary: parts.length ? parts.join(" · ") : undefined,
    checks
  };
}

export default function App() {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("generate");
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
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [newPref, setNewPref] = useState("");
  const [mockupEditOpen, setMockupEditOpen] = useState(false);
  const [draftEditBuffer, setDraftEditBuffer] = useState("");
  const [draftEditSaving, setDraftEditSaving] = useState(false);
  const [draftEditError, setDraftEditError] = useState("");
  const screenshotRef = useRef<HTMLDivElement>(null);

  const { pages, setPages, pagesLoading, deletePage: deleteStoredPage } = usePagesData();
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
    plannedPages,
    refineInput,
    setPages,
    setSelected,
    setPendingPlannedId,
    setPendingPageType,
    setTopic,
    setNotes,
    setTopicTouched,
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

  useEffect(() => {
    setMockupEditOpen(false);
    setDraftEditBuffer("");
    setDraftEditError("");
  }, [selected?.id]);

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
  const selectById = (id: string) => { const p = pages.find(x => x.id === id); if (p) { setSelected(p); setShowSuccess(false); setWorkspaceTab("generate"); } };
  const handleCopy = (text: string) => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const handleDownload = (text: string, name: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = name; a.click(); };

  const draftEditDirty = mockupEditOpen && selected && draftEditBuffer !== selected.draft;

  const openMockupEditor = useCallback(() => {
    if (!selected) return;
    setDraftEditBuffer(selected.draft);
    setDraftEditError("");
    setMockupEditOpen(true);
  }, [selected]);

  const cancelMockupEditor = useCallback(() => {
    setMockupEditOpen(false);
    setDraftEditBuffer("");
    setDraftEditError("");
  }, []);

  const saveMockupDraft = useCallback(async () => {
    if (!selected || draftEditSaving) return;
    setDraftEditSaving(true);
    setDraftEditError("");
    try {
      const newRaw = replacePageDraftInRaw(selected.raw, draftEditBuffer);
      const updated: PageDraft = { ...selected, draft: draftEditBuffer, raw: newRaw };
      await pagesApi.save(selected.id, updated, { notes: "Manual draft edit", trigger: "manual" });
      setPages(prev => prev.map(p => p.id === selected.id ? updated : p));
      setSelected(updated);
      setMockupEditOpen(false);
      setDraftEditBuffer("");
    } catch {
      setDraftEditError("Could not save changes. Try again.");
    } finally {
      setDraftEditSaving(false);
    }
  }, [selected, draftEditBuffer, draftEditSaving, setPages, setSelected]);

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
    setWorkspaceTab("generate");
    void generate({
      topic: p.name,
      userType: p.userType,
      pageType: p.pageType,
      plannedId: p.id
    });
  };

  const filtered = pages.filter(p => { const ms = !search || (clean(p.name) || "").toLowerCase().includes(search.toLowerCase()) || (p.draft || "").toLowerCase().includes(search.toLowerCase()); return ms && (filterType === "All" || clean(p.pageType) === filterType); });
  const sorted = sortNewest ? [...filtered].reverse() : filtered;
  useEffect(() => { setSelectedPageIds(new Set()); }, [search, filterType]);
  const topicError = topicTouched && !topic.trim();

  const handleUpdateReviewStatus = useCallback(async (id: string, status: ReviewStatus) => {
    try {
      await pagesApi.updateReview(id, status);
      setPages((prev) => prev.map((x) => x.id === id ? { ...x, reviewStatus: status } : x));
    } catch {
      // Server error; UI will remain on previous state until next refresh.
    }
  }, [setPages]);

  const studioKarlView = useMemo(() => buildKarlPanelView(selected?.karlEvaluation), [selected?.karlEvaluation]);

  const streamBarMessage = useMemo(() => {
    if (streaming) return progressLabel || "Generating…";
    if (evaluating) return "Evaluating against Karl standards…";
    if (error) return error;
    if (selected) {
      const n = clean(selected.name) || "Untitled";
      const g = selected.karlEvaluation?.grade;
      const s = selected.karlEvaluation?.score;
      if (g !== undefined && s !== undefined) return `Last opened: ${n} · Karl grade ${g} · ${s}/100`;
      return `Last opened: ${n}`;
    }
    if (justGenerated) {
      const n = clean(justGenerated.name) || "Untitled";
      const g = justGenerated.karlEvaluation?.grade;
      const s = justGenerated.karlEvaluation?.score;
      if (g !== undefined && s !== undefined) return `Last generated: ${n} · Karl grade ${g} · ${s}/100`;
      return `Last generated: ${n}`;
    }
    return "Ready — enter a topic and generate a page draft";
  }, [streaming, evaluating, error, selected, justGenerated, progressLabel]);

  const previewUrlSlug = useMemo(() => {
    const base = (clean(selected?.name) || topic || "preview").toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    return `sf.gov / hhvc / ${base || "preview"}`;
  }, [selected?.name, topic]);

  const libraryRows = useMemo(
    () =>
      pages.map((p) => ({
        id: p.id,
        title: clean(p.name) || "Untitled",
        pageType: clean(p.pageType) || "Transaction",
        gradeLetter: p.karlEvaluation?.grade?.trim().charAt(0)
      })),
    [pages]
  );

  const handleWorkspaceTab = useCallback((id: string) => {
    const next = id as WorkspaceTab;
    setWorkspaceTab(next);
    if (next === "plan") setMapMode("plan");
    if (next === "ideal") setMapMode("view");
  }, [setMapMode]);

  return (
    <div className="app-root-sf-studio">
      <SfGovContentDesignTool
        className="app-sf-studio-shell"
        brandTitle="HHVC Page Builder"
        brandSubtitle="SF.gov · Healthy Housing & Vector Control"
        showLeftPanel={workspaceTab === "generate"}
        pageGoalInputMode="textarea"
        tabs={WORKSPACE_TABS}
        activeTabId={workspaceTab}
        onTabChange={handleWorkspaceTab}
        onExportClick={() => {
          if (selected) void handleExportScreenshot(selected.name);
        }}
        userType={userType}
        onUserTypeChange={setUserType}
        userTypeOptions={USER_TYPES}
        pageTypeOptions={studioPageTypes()}
        activePageType={pendingPageType || studioPageTypes()[0] || "Transaction"}
        onPageTypeChange={(pt) => {
          setPendingPageType(pt);
          setPendingPlannedId(null);
        }}
        pageGoal={topic}
        onPageGoalChange={(v) => {
          setTopic(v);
          setTopicTouched(true);
        }}
        additionalContext={notes}
        onAdditionalContextChange={setNotes}
        onGenerateClick={() => void generate({ pageType: pendingPageType || studioPageTypes()[0] })}
        generateLabel={
          loading ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…") : "Generate page"
        }
        generateDisabled={loading || topicError}
        karlEvaluation={studioKarlView}
        libraryPages={libraryRows}
        selectedLibraryPageId={selected?.id ?? null}
        onLibraryPageSelect={(id) => selectById(id)}
        onLibraryPageDelete={(id) => void deletePage(id)}
        previewUrlText={previewUrlSlug}
        streamMessage={streamBarMessage}
        streamFooterMeta={karlStatus !== "idle" ? `Karl: ${karlStatus}` : undefined}
        onExportPreview={() => {
          if (selected) void handleExportScreenshot(selected.name);
        }}
        previewSlot={
          workspaceTab === "generate" ? (
        <div className="app-studio-generate">
          <div className="app-studio-generate__rail">
            <Card className="app-card-pad--18-20">
              <KarlStatus status={karlStatus} />
              {topicError && <p className="app-topic-err">Enter a topic in the left panel to continue</p>}
              {pendingPageType && (
                <div className="app-pending-type-banner">
                  <Badge type={pendingPageType} small />
                  <span>from plan</span>
                  <button type="button" className="app-icon-btn" onClick={() => { setPendingPageType(""); setPendingPlannedId(null); }}>&#10005;</button>
                </div>
              )}
            </Card>

            {selected && (
            <Card className="app-card-pad--14-16-mb">
              <p className="app-up-label app-up-label--mb8">Preferences</p>
              <p className="app-pref-lead">
                Remembered for this page. Refine to teach the agent.
              </p>
              {preferences.map(p => (
                <div key={p.id} className="app-pref-row">
                  <span className="app-pref-text">{p.preference}</span>
                  <span className="app-pref-src">{p.source}</span>
                  <button
                    type="button"
                    className="app-pref-remove"
                    onClick={async () => { await preferencesApi.delete(p.id).catch(() => {}); setPreferences(prev => prev.filter(x => x.id !== p.id)); }}
                    title="Remove preference"
                  >&#10005;</button>
                </div>
              ))}
              {preferences.length === 0 && (
                <p className="app-pref-empty">No preferences yet. Add one below or refine this page to teach the agent.</p>
              )}
              <div className="app-pref-add-row">
                <input
                  className="app-input app-input--pref"
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
              <Card className="app-card-pad--14-16-only">
                <p className="app-up-label">Recent pages</p>
                {[...pages].reverse().slice(0, 5).map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => { setSelected(p); setShowSuccess(false); }}
                      className={`app-recent-btn${selected?.id === p.id ? " app-recent-btn--active" : ""}`}
                    >
                      <span className="app-recent-dot" data-page-type={clean(p.pageType) || undefined} />
                      <span className="app-recent-name">{clean(p.name) || "Untitled"}</span>
                      {p.karlEvaluation && (
                        <span className="app-recent-grade" data-grade={p.karlEvaluation.grade}>
                          {p.karlEvaluation.grade}
                        </span>
                      )}
                    </button>
                ))}
              </Card>
            )}
          </div>

          <div className="app-studio-generate__main">
          <Card className="app-card-pad--20-24">
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
                <div className="app-page-head">
                  <div className="app-page-head__left">
                    <div className="app-page-badges">
                      <Badge type={clean(selected.pageType)} />
                      {selected.skeleton && (
                        <span className="app-pill-skeleton">Skeleton</span>
                      )}
                      {selected.karlConnected && (
                        <span className="app-pill-karl">Karl verified</span>
                      )}
                      {selected.karlEvaluation && (
                        <span className="app-pill-grade-inline" data-grade={selected.karlEvaluation.grade}>
                          Grade {selected.karlEvaluation.grade} · {selected.karlEvaluation.score}/100
                        </span>
                      )}
                    </div>
                    <h2 className="app-page-h2">{clean(selected.name) || "Untitled"}</h2>
                    <p className="app-page-sub">SF.gov · Healthy Housing &amp; Vector Control</p>
                  </div>
                  <div className="app-page-actions">
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
                <div className="app-meta-row">
                  {[["User", selected.userType], ["Goal", selected.userGoal], ["Purpose", selected.purpose]].map(([k, v]) => v && (
                    <div key={k} className="app-meta-chip">
                      <span className="app-meta-chip__k">{k}</span>
                      <span className="app-meta-chip__v">{clean(v as string)}</span>
                    </div>
                  ))}
                </div>

                {selected.karlEvaluation && <KarlEvalPanel evaluation={selected.karlEvaluation} />}
                {selected.qualityGate?.status === "review_required" && (
                  <div className="app-qg-banner">
                    <p className="app-qg-banner__title">Manual review required before publish</p>
                    {selected.qualityGate.reasons.map((reason, idx) => (
                      <p key={idx} className="app-qg-banner__item">{reason}</p>
                    ))}
                  </div>
                )}

                {/* SF.gov page preview */}
                <div className="app-preview-wrap">
                  <div className="app-preview-toolbar">
                    <span className="app-preview-toolbar__label">SF.gov preview</span>
                    <div className="app-preview-toolbar__actions">
                      {!mockupEditOpen ? (
                        <Btn onClick={openMockupEditor} variant="ghost" size="sm" disabled={loading}>Edit content</Btn>
                      ) : (
                        <>
                          <Btn onClick={saveMockupDraft} variant="primary" size="sm" disabled={draftEditSaving || !draftEditDirty}>Save changes</Btn>
                          <Btn onClick={cancelMockupEditor} variant="ghost" size="sm" disabled={draftEditSaving}>Cancel</Btn>
                        </>
                      )}
                      <Btn onClick={() => handleExportScreenshot(selected.name)} variant="ghost" size="sm">Download preview</Btn>
                    </div>
                  </div>
                  {mockupEditOpen && (
                    <div className="app-draft-editor">
                      <p className="app-draft-editor__hint">Edit the page draft below. The preview updates as you type. Use headings (# title, ## section), Summary:, Section heading:, Section body:, lists, and callouts as in generated pages.</p>
                      {draftEditError && <p className="app-draft-editor__err" role="alert">{draftEditError}</p>}
                      <textarea
                        className="app-draft-editor__ta"
                        aria-label="Page draft content"
                        value={draftEditBuffer}
                        onChange={e => setDraftEditBuffer(e.target.value)}
                        spellCheck={true}
                      />
                    </div>
                  )}
                  <SfGovPagePreview ref={screenshotRef} draft={mockupEditOpen ? draftEditBuffer : selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
                </div>

                {/* Enforcement & integration notes */}
                {selected.enforcement && (
                  <div className="app-note-panel app-note-panel--enf">
                    <div className="app-note-panel__head">
                      <span>Enforcement check</span>
                    </div>
                    <div className="app-note-panel__body">
                      {clean(selected.enforcement).split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
                {selected.integration && (
                  <div className="app-note-panel app-note-panel--int">
                    <div className="app-note-panel__head">
                      <span>Integration notes</span>
                    </div>
                    <div className="app-note-panel__body">
                      {clean(selected.integration).split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                <ComponentChips components={selected.components} />
                <RelPanel rel={selected.relationships} />

                {/* Refine panel */}
                <div className="app-refine">
                  <p className="app-up-label app-up-label--mb8">Refine this page</p>
                  <p className="app-refine__hint">Describe a specific change and the agent will revise the page content.</p>
                  <div className="app-refine__row">
                    <textarea
                      className="app-input app-textarea-refine"
                      value={refineInput}
                      onChange={e => setRefineInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) refine(); }}
                      placeholder='e.g. "Shorten the responsibilities section" or "Add a step about taking photos of the problem"'
                      rows={2}
                    />
                    <Btn onClick={refine} variant="primary" size="md" disabled={loading || !refineInput.trim()} className="app-refine__send">
                      Send
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {!streaming && !evaluating && !showSuccess && !selected && (
              <div className="app-builder-empty">
                {pagesLoading ? (
                  <>
                    <div className="app-spinner-32" />
                    <p className="app-builder-empty__p">Loading pages…</p>
                  </>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6M12 9v6" /></svg>
                    <div className="app-builder-empty__center">
                      <p className="app-builder-empty__title">{pages.length === 0 ? "No pages yet" : "Select a page"}</p>
                      <p className="app-builder-empty__sub">{pages.length === 0 ? "Enter a topic in the form and click Generate to create your first page." : "Choose a page from the Recent list or Library tab."}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="app-error-banner">
                <p className="app-error-banner__title">Generation failed</p>
                <p className="app-error-banner__body">{error}</p>
              </div>
            )}
            {parseWarn && !error && (
              <div className="app-parse-warn">
                <p>Page was generated but some fields could not be parsed fully. Review the draft carefully.</p>
              </div>
            )}
          </Card>
          </div>
        </div>
          ) : workspaceTab === "library" ? (
        <LibraryTab
          search={search}
          setSearch={setSearch}
          filterType={filterType}
          setFilterType={setFilterType}
          sortNewest={sortNewest}
          setSortNewest={setSortNewest}
          pagesLoading={pagesLoading}
          seeding={seeding}
          pages={pages}
          sorted={sorted}
          filteredCount={filtered.length}
          selectedPageIds={selectedPageIds}
          selectAllPages={selectAllPages}
          clearPageSelection={clearPageSelection}
          deleteSelectedPages={deleteSelectedPages}
          onDownloadText={handleDownload}
          onSelectPage={(p) => { setSelected(p); setShowSuccess(false); setWorkspaceTab("generate"); }}
          onTogglePageSelection={togglePageSelection}
          onUpdateReviewStatus={handleUpdateReviewStatus}
          onOpenHistory={openHistory}
        />
          ) : (
        <div className="app-studio-tab-pad">
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
          onTodoGenerate={(t, u) => {
            setTopic(t);
            setUserType(u);
            setPendingPlannedId(null);
            setPendingPageType("");
            setWorkspaceTab("generate");
            void generate({ topic: t, userType: u });
          }}
          PlanDiagramComponent={PlanDiagram}
          PlanSidebarComponent={PlanSidebar}
          TodoPanelComponent={TodoPanel}
        />
        </div>
          )
        }
      />
      {historyPageId && (
        <div className="app-history-overlay" onClick={() => setHistoryPageId(null)}>
          <div className="app-history-backdrop" />
          <div
            className="app-history-drawer"
            onClick={e => e.stopPropagation()}
          >
            <div className="app-history-head">
              <span className="app-history-head__title">Version History</span>
              <button type="button" className="app-history-close" onClick={() => setHistoryPageId(null)}>×</button>
            </div>
            <div className="app-history-scroll">
              {historyLoading ? (
                <p className="app-history-p">Loading…</p>
              ) : historyVersions.length === 0 ? (
                <p className="app-history-p">No versions saved yet.</p>
              ) : historyVersions.map(v => (
                <div key={v.id} className="app-history-card">
                  <div className="app-history-card__row">
                    <span className="app-history-card__v">v{v.versionNumber}</span>
                    <span className={`app-history-trigger${v.trigger === "generate" ? " app-history-trigger--generate" : v.trigger === "restore" ? " app-history-trigger--restore" : " app-history-trigger--other"}`}>{v.trigger}</span>
                    <span className="app-history-date">
                      {new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {v.notes && (
                    <p className="app-history-notes">
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
