import React, { Suspense, lazy, memo, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PageDraft, TodoItem, PlannedPage, UserPreference, ReviewStatus, VerificationState } from "./types";
import { USER_TYPES, PAGE_TYPES, TYPE_META } from "./constants";
import { clean, findOverlappingPageIds, getVerificationState, VERIFICATION_FILTERS } from "./utils/core";
import { pagesApi, preferencesApi, todosApi } from "./utils/api";
import { replacePageDraftInRaw } from "./utils/parsing";
import { generateZip, renderPageAsPNG, renderPageAsPDF } from "./utils/export";
import { Badge, Divider, Btn, Card, ComponentChips, RelPanel, KarlEvalPanel, ProgressBar, DeleteConfirmationModal } from "./components/ui";
import { usePagesData } from "./hooks/usePagesData";
import { usePlanMap } from "./hooks/usePlanMap";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { usePageGeneration } from "./hooks/usePageGeneration";
import { useQueueRunner } from "./hooks/useQueueRunner";
import { SfGovContentDesignTool, MAIN_WORKSPACE_PANEL_ID, type ContentDesignTab } from "./components/SfGovContentDesignTool";
import packageJson from "../package.json";
import "./App.css";

const LazyMapTab = lazy(() => import("./components/tabs/MapTab").then((m) => ({ default: m.MapTab })));
const LazyLibraryTab = lazy(() => import("./components/tabs/LibraryTab").then((m) => ({ default: m.LibraryTab })));
const LazySfGovPagePreview = lazy(() => import("./components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));


const StreamRenderer = memo(function StreamRenderer({ text }: { text: string }) {
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
});

const EvaluatingState = memo(function EvaluatingState() {
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
});

const SuccessState = memo(function SuccessState({ page, onView }: { page: PageDraft; onView: () => void }) {
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
});


const PlanDiagram = memo(function PlanDiagram({ planned, pages, onSelectPlanned }: { planned: PlannedPage[]; pages: PageDraft[]; onSelectPlanned: (p: PlannedPage) => void }) {
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
    const r = roots.length === 1 ? 0 : 74;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a) * 0.7, built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });
  children.forEach((p, i) => {
    const a = (2 * Math.PI * i / Math.max(children.length, 1)) - Math.PI / 2;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + 205 * Math.cos(a), y: H / 2 + 176 * Math.sin(a), built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });

  const edges: PlanEdge[] = [];
  planned.forEach(p => {
    if (p.parentId) edges.push([p.parentId, p.id]);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="app-plan-svg">
      <defs>
        <linearGradient id="plan-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCFBF8" />
          <stop offset="100%" stopColor="#F4F2EC" />
        </linearGradient>
        <filter id="plan-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#1B1A16" floodOpacity="0.18" />
        </filter>
        <marker id="plan-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#B4B2A9" />
        </marker>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#plan-bg)" rx="16" />
      {edges.map(([a, b], i) => {
        const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
        if (!na || !nb) return null;
        const ctrlY = na.y + (nb.y - na.y) * 0.35;
        return (
          <path
            key={i}
            d={`M ${na.x} ${na.y} C ${na.x} ${ctrlY}, ${nb.x} ${ctrlY}, ${nb.x} ${nb.y}`}
            fill="none"
            stroke="#CFCABF"
            strokeWidth="1.2"
            strokeLinecap="round"
            markerEnd="url(#plan-arr)"
          />
        );
      })}
      {nodes.map(n => {
        const c = TYPE_META[n.type] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };
        const label = n.name.length > 26 ? n.name.slice(0, 24) + "\u2026" : n.name;
        const isRoot = !n.parentId;
        const rx = isRoot ? 78 : 66, ry = isRoot ? 28 : 23;
        const fill = n.built ? c.fill : "var(--color-background-primary)";
        const stroke = n.built ? c.stroke : "#B9B3A6";
        return (
          <g
            key={n.id}
            className="app-plan-node"
            style={{ cursor: "pointer" }}
            onClick={() => { const pp = planned.find(p => p.id === n.id); if (pp) onSelectPlanned(pp); }}
          >
            <ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={isRoot ? "2.2" : "1.6"} strokeDasharray={n.built ? "none" : "4,3"} filter="url(#plan-node-shadow)" />
            <ellipse cx={n.x} cy={n.y - 1} rx={rx - 8} ry={Math.max(ry - 12, 8)} fill="#FFFFFF" opacity={n.built ? 0.2 : 0.28} />
            <text x={n.x} y={n.y + 2} textAnchor="middle" fontSize={isRoot ? 12.5 : 11.5} fontWeight={isRoot ? "600" : "500"} fill={c.text}>{label}</text>
            <g transform={`translate(${n.x}, ${n.y + (isRoot ? 14 : 12)})`}>
              <rect x={-22} y={-7} width={44} height={14} rx={7} fill={n.built ? "#E1F5EE" : "#F8F4EB"} stroke={n.built ? "#0F6E5638" : "#B9B3A655"} />
              <text textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill={n.built ? "#0F6E56" : "#7B7569"}>
                {n.built ? "BUILT" : "PLANNED"}
              </text>
            </g>
          </g>
        );
      })}
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#9A958A" fontWeight="500">{planned.length} planned · {nodes.filter(n => n.built).length} built · click a node to manage</text>
    </svg>
  );
});

const PlanSidebar = memo(function PlanSidebar({ planned, pages, selectedPlanned, onSelectPlanned, onAdd, onDelete, onGenerate, onViewPage }: {
  planned: PlannedPage[];
  pages: PageDraft[];
  selectedPlanned: PlannedPage | null;
  onSelectPlanned: (p: PlannedPage | null) => void;
  onAdd: (name: string, pageType: string, userType: string, parentId: number | null) => void;
  onDelete: (id: number) => void;
  onGenerate: (p: PlannedPage) => void | Promise<void>;
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
            <Btn onClick={() => void onGenerate(selectedPlanned)} variant="primary" size="md" fullWidth>Add to build queue &rarr;</Btn>
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
});

const TodoPanel = memo(function TodoPanel({
  generateForQueue,
  onOpenPage
}: {
  generateForQueue: (todo: TodoItem) => Promise<PageDraft | null>;
  onOpenPage: (pageId: string) => void;
}) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newUT, setNewUT] = useState(USER_TYPES[0]);
  const [adding, setAdding] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(true);

  const { running, start, stop, currentItemId } = useQueueRunner({ todos, setTodos, generate: generateForQueue });

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

  const retryFailed = async (id: number) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, status: "pending", errorMessage: null } : t))
    );
    try {
      await todosApi.updateQueue(id, { status: "pending", errorMessage: null });
    } catch {}
  };

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);
  const runnablePending = todos.filter(t => t.status === "pending").length;

  const statusLabel = (t: TodoItem) => {
    if (t.status === "generating") return "Generating";
    if (t.status === "failed") return "Failed";
    if (t.status === "done") return "Built";
    return "Pending";
  };

  return (
    <Card className="app-card-pad--16-18">
      <div className="app-todo-header">
        <p className="app-up-label app-up-label--flush">Pages to build</p>
        {pending.length > 0 && <span className="app-pending-badge">{pending.length}</span>}
      </div>

      {!loadingTodos && runnablePending > 0 && (
        <div className="app-row-gap-6" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <Btn onClick={() => void start()} variant="primary" size="sm" disabled={running}>
            {running ? "Running queue…" : "Run queue"}
          </Btn>
          {running && (
            <Btn onClick={stop} variant="ghost" size="sm">
              Stop
            </Btn>
          )}
        </div>
      )}

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
            <p className="app-todo-ut" style={{ fontSize: 11, marginTop: 4 }}>
              <span style={{ opacity: 0.85 }}>{statusLabel(t)}</span>
              {t.plannedId != null && <span style={{ marginLeft: 8, opacity: 0.7 }}>· Planned #{t.plannedId}</span>}
              {t.karlGrade && t.status === "done" && (
                <span style={{ marginLeft: 8 }}>· Karl {t.karlGrade}</span>
              )}
              {currentItemId === t.id && <span style={{ marginLeft: 8 }}>· In progress</span>}
            </p>
            {t.status === "failed" && t.errorMessage && (
              <p className="app-todo-ut" style={{ color: "var(--color-text-danger, #b42318)", marginTop: 4, fontSize: 12 }}>
                {t.errorMessage}
              </p>
            )}
            {t.status === "done" && t.builtPageId && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">
                  Open page
                </Btn>
              </div>
            )}
            {t.status === "failed" && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => void retryFailed(t.id)} variant="ghost" size="sm">
                  Retry
                </Btn>
              </div>
            )}
          </div>
          <div className="app-todo-actions">
            <button type="button" className="app-ghost-x" onClick={() => remove(t.id)}>✕</button>
          </div>
        </div>
      ))}

      {done.map(t => (
        <div key={t.id} className="app-todo-done-row">
          <button type="button" className="app-todo-done-check" onClick={() => toggle(t.id, t.done)} aria-label="Unmark">
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5l3 3 4-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="app-todo-done-topic">{t.topic}</p>
            {(t.builtPageId || t.karlGrade) && (
              <p className="app-todo-ut" style={{ fontSize: 11, marginTop: 2 }}>
                {t.karlGrade && <span>Karl {t.karlGrade}</span>}
                {t.builtPageId && (
                  <span style={{ marginLeft: 4 }}>
                    <Btn onClick={() => onOpenPage(t.builtPageId!)} variant="ghost" size="sm">
                      Open
                    </Btn>
                  </span>
                )}
              </p>
            )}
          </div>
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
});

type WorkspaceTab = "plan" | "generate" | "library" | "ideal";

const WORKSPACE_TABS: readonly ContentDesignTab[] = [
  { id: "plan", label: "Site Plan", description: "Sketch site architecture and planned pages before you build." },
  { id: "generate", label: "Generate", description: "Choose audience and page type, then generate and preview a draft." },
  { id: "library", label: "Library", description: "Open, search, and manage pages you have already created." },
  { id: "ideal", label: "Ideal Map", description: "Compare your plan to the reference information architecture." }
];

const STUDIO_PAGE_TYPE_CHIPS = [
  "Transaction",
  "Information",
  "Topic",
  "Step by step",
  "Location",
  "Resource Collection",
  "Campaign"
] as const;

function studioPageTypes(): string[] {
  return STUDIO_PAGE_TYPE_CHIPS.filter((t) => PAGE_TYPES.includes(t));
}

export default function App() {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("generate");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState<VerificationState | "all">("all");
  const [showOverlapsOnly, setShowOverlapsOnly] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [showDeleteCurrentPageModal, setShowDeleteCurrentPageModal] = useState(false);
  const [singlePageDeleteLoading, setSinglePageDeleteLoading] = useState(false);
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [newPref, setNewPref] = useState("");
  const [mockupEditOpen, setMockupEditOpen] = useState(false);
  const [draftEditBuffer, setDraftEditBuffer] = useState("");
  const [draftEditSaving, setDraftEditSaving] = useState(false);
  const [draftEditError, setDraftEditError] = useState("");
  const screenshotRef = useRef<HTMLDivElement>(null);
  const pageTypeOptions = useMemo(() => studioPageTypes(), []);

  const { pages, setPages, pagesLoading, hydratePage, deletePage: deleteStoredPage } = usePagesData();
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
    state,
    actions,
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
    pages,
    setPages,
    plannedPages,
    linkPlannedPage
  });

  const {
    topic,
    userType,
    notes,
    selected,
    topicTouched,
    refineInput,
    preferences
  } = state;

  const {
    setSelected,
    setTopic,
    setUserType,
    setNotes,
    setTopicTouched,
    setRefineInput,
    setPreferences
  } = actions;

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
    const ids = Array.from(selectedPageIds);
    await Promise.all(ids.map((id) => deletePage(id)));
    setSelectedPageIds(new Set());
  };
  const handleConfirmDelete = async () => {
    setIsDeleteLoading(true);
    await deleteSelectedPages();
    setIsDeleteLoading(false);
    setShowDeleteModal(false);
  };

  const handleConfirmDeleteCurrentPage = async () => {
    if (!selected) return;
    setSinglePageDeleteLoading(true);
    try {
      await deletePage(selected.id);
    } finally {
      setSinglePageDeleteLoading(false);
      setShowDeleteCurrentPageModal(false);
    }
  };

  const handleConfirmRegenerate = () => {
    if (!selected) return;
    void regenerate(selected);
    setShowRegenerateConfirmModal(false);
  };
  const exportSelectedPagesAsZip = async (format: "png" | "pdf") => {
    const selectedPages = pages.filter(p => p.id && selectedPageIds.has(p.id));
    const files: Array<{ blob: Blob; filename: string }> = [];
    const failedNames: string[] = [];

    const renderResults = await Promise.allSettled(
      selectedPages.map(async (page) => {
        const elementId = `page-preview-${page.id}`;
        return format === "png"
          ? renderPageAsPNG(page, elementId)
          : renderPageAsPDF(page, elementId);
      })
    );

    renderResults.forEach((result, index) => {
      const page = selectedPages[index];
      if (result.status === "fulfilled") {
        files.push(result.value);
      } else {
        console.error(`Failed to render ${page.name} as ${format.toUpperCase()}:`, result.reason);
        failedNames.push(page.name);
      }
    });

    if (files.length === 0) {
      console.error(`No pages could be rendered as ${format.toUpperCase()}`, failedNames);
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
      const zipBlob = await generateZip(files);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pages-export-${timestamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      clearPageSelection();
    } catch (err) {
      console.error("Failed to create ZIP:", err);
    }
  };
  const handleDownloadPNG = async () => {
    await exportSelectedPagesAsZip("png");
  };
  const handleDownloadPDF = async () => {
    await exportSelectedPagesAsZip("pdf");
  };
  const openPageById = useCallback(async (id: string) => {
    const full = await hydratePage(id).catch(() => null);
    if (!full) return;
    setSelected(full);
    setShowSuccess(false);
    setWorkspaceTab("generate");
  }, [hydratePage, setSelected, setShowSuccess, setWorkspaceTab]);

  const generateForQueue = useCallback(
    async (todo: TodoItem) => {
      const planned =
        todo.plannedId != null ? plannedPages.find((p) => p.id === todo.plannedId) : undefined;
      return generate({
        topic: todo.topic,
        userType: todo.userType,
        quiet: true,
        ...(planned ? { pageType: planned.pageType, plannedId: planned.id } : {})
      });
    },
    [generate, plannedPages]
  );

  const generateFromPlanned = useCallback(async (p: PlannedPage) => {
    try {
      await todosApi.create(p.name, p.userType, { plannedId: p.id });
    } catch (err) {
      console.error("Failed to enqueue planned page:", err);
    }
  }, []);
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
      const { toPng } = await import("html-to-image");
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

  const overlapIds = useMemo(() => findOverlappingPageIds(pages), [pages]);
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    const base = pages.filter((p) => {
      const verificationState = getVerificationState(p);
      const matchesSearch =
        !query ||
        (clean(p.name) || "").toLowerCase().includes(query) ||
        (p.draft || "").toLowerCase().includes(query) ||
        (p.userGoal || "").toLowerCase().includes(query);
      const matchesType = filterType === "All" || clean(p.pageType) === filterType;
      const matchesVerification =
        verificationFilter === "all" || verificationState === verificationFilter;
      return matchesSearch && matchesType && matchesVerification;
    });
    if (!showOverlapsOnly) return base;
    return base.filter((p) => overlapIds.has(p.id));
  }, [pages, search, filterType, verificationFilter, showOverlapsOnly, overlapIds]);
  const sorted = sortNewest ? [...filtered].reverse() : filtered;
  useEffect(() => { setSelectedPageIds(new Set()); }, [search, filterType, verificationFilter, showOverlapsOnly]);
  const topicError = topicTouched && !topic.trim();

  const handleUpdateReviewStatus = useCallback(async (id: string, status: ReviewStatus) => {
    try {
      await pagesApi.updateReview(id, status);
      setPages((prev) => prev.map((x) => x.id === id ? { ...x, reviewStatus: status } : x));
    } catch {
      // Server error; UI will remain on previous state until next refresh.
    }
  }, [setPages]);

  const contentChecksFooter = useMemo(() => {
    const labels: Record<string, string> = {
      idle: "Content checks offline",
      connecting: "Connecting to standards…",
      active: "Content checks on",
      fallback: "Baseline rules (live standards unavailable)"
    };
    return labels[karlStatus] ?? `Standards: ${karlStatus}`;
  }, [karlStatus]);

  const streamFooterMetaFull = useMemo(
    () => `${contentChecksFooter} · v${packageJson.version}`,
    [contentChecksFooter]
  );

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
    return "Ready — use the left panel to generate a new draft or open Library to continue";
  }, [streaming, evaluating, error, selected, justGenerated, progressLabel]);

  const previewUrlSlug = useMemo(() => {
    const base = (clean(selected?.name) || topic || "preview").toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    return `sf.gov / hhvc / ${base || "preview"}`;
  }, [selected?.name, topic]);

  const previewSummaryLine = useMemo(() => {
    const max = 72;
    if (selected) {
      const pt = clean(selected.pageType) || pendingPageType || pageTypeOptions[0] || "Transaction";
      const name = clean(selected.name) || "Untitled";
      const display = name.length > max ? `${name.slice(0, max)}…` : name;
      const ev = selected.karlEvaluation;
      if (ev) return `${pt} · ${display} · Grade ${ev.grade} · ${ev.score}/100`;
      return `${pt} · ${display}`;
    }
    const pt = pendingPageType || pageTypeOptions[0] || "Transaction";
    const goal = topic.trim();
    if (!goal) return `${pt} · Add a page goal in the left panel`;
    const trunc = goal.length > max ? `${goal.slice(0, max)}…` : goal;
    return `${pt} · ${trunc}`;
  }, [selected, pendingPageType, topic, pageTypeOptions]);

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

  const handleBrowseLibraryClick = useCallback(() => {
    setWorkspaceTab("library");
  }, []);

  const handleExportClick = useCallback(() => {
    if (selected) void handleExportScreenshot(selected.name);
  }, [selected, handleExportScreenshot]);

  const handlePageTypeChange = useCallback((pt: string) => {
    setPendingPageType(pt);
    setPendingPlannedId(null);
  }, []);

  const handlePageGoalChange = useCallback((v: string) => {
    setTopic(v);
    setTopicTouched(true);
  }, [setTopic, setTopicTouched]);

  const handleGenerateClick = useCallback(() => {
    void generate({ pageType: pendingPageType || pageTypeOptions[0] });
  }, [generate, pendingPageType, pageTypeOptions]);

  const handleOpenPage = useCallback((pageId: string) => {
    void openPageById(pageId);
  }, [openPageById]);

  const showGenerateContextRail = topicError || !!pendingPageType || !!selected;

  return (
    <div className="app-root-sf-studio">
      <a href={`#${MAIN_WORKSPACE_PANEL_ID}`} className="skip-link">
        Skip to main content
      </a>
      <SfGovContentDesignTool
        className="app-sf-studio-shell"
        brandTitle="HHVC Page Builder"
        brandSubtitle="SF.gov · Healthy Housing & Vector Control"
        version={`v${packageJson.version}`}
        showHeaderVersion={false}
        showLeftPanel={workspaceTab === "generate"}
        pageGoalInputMode="textarea"
        tabs={WORKSPACE_TABS}
        activeTabId={workspaceTab}
        onTabChange={handleWorkspaceTab}
        onBrowseLibraryClick={handleBrowseLibraryClick}
        headerExportDisabled={!selected}
        showPreviewExportButton={!!selected}
        onExportClick={handleExportClick}
        userType={userType}
        onUserTypeChange={setUserType}
        userTypeOptions={USER_TYPES}
        pageTypeOptions={pageTypeOptions}
        activePageType={pendingPageType || pageTypeOptions[0] || "Transaction"}
        onPageTypeChange={handlePageTypeChange}
        pageGoal={topic}
        onPageGoalChange={handlePageGoalChange}
        additionalContext={notes}
        onAdditionalContextChange={setNotes}
        onGenerateClick={handleGenerateClick}
        generateLabel={
          loading ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…") : "Generate page"
        }
        generateDisabled={loading || topicError}
        libraryPages={libraryRows}
        selectedLibraryPageId={selected?.id ?? null}
          onLibraryPageSelect={(id) => { void openPageById(id); }}
        onLibraryPageDelete={(id) => void deletePage(id)}
        previewUrlText={previewUrlSlug}
        previewSummaryLine={workspaceTab === "generate" ? previewSummaryLine : undefined}
        streamMessage={streamBarMessage}
        streamFooterMeta={streamFooterMetaFull}
        onExportPreview={() => {
          if (selected) void handleExportScreenshot(selected.name);
        }}
        previewSlot={
          workspaceTab === "generate" ? (
        <div className={["app-studio-generate", !showGenerateContextRail ? "app-studio-generate--no-rail" : ""].filter(Boolean).join(" ")}>
          {showGenerateContextRail ? (
          <div className="app-studio-generate__rail">
            {(topicError || pendingPageType) ? (
              <Card className="app-card-pad--18-20">
                {topicError && <p className="app-topic-err">Enter a page goal in the left panel to generate.</p>}
                {pendingPageType && (
                  <div className="app-pending-type-banner">
                    <Badge type={pendingPageType} small />
                    <span>from plan</span>
                    <button
                      type="button"
                      className="app-icon-btn"
                      aria-label="Clear planned page type from plan"
                      onClick={() => {
                        setPendingPageType("");
                        setPendingPlannedId(null);
                      }}
                    >
                      &#10005;
                    </button>
                  </div>
                )}
              </Card>
            ) : null}

            {selected && (
            <details className="app-pref-details">
              <summary className="app-pref-details__summary">Advanced preferences</summary>
              <Card className="app-card-pad--14-16-mb app-card-pref-inner">
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
            </details>
            )}
          </div>
          ) : null}

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
                    <div className="app-page-actions__group app-page-actions__group--primary">
                      {selected.skeleton && (
                        <Btn onClick={() => { if (selected.inputs) generate({ topic: selected.inputs.topic, userType: selected.inputs.userType, notes: selected.inputs.notes, replaceSkeletonId: selected.id }); }} variant="primary" size="sm">Generate with AI</Btn>
                      )}
                      {!selected.skeleton && (
                        <Btn onClick={() => setShowRegenerateConfirmModal(true)} variant="primary" size="sm">
                          Regenerate
                        </Btn>
                      )}
                    </div>
                    <div className="app-page-actions__group app-page-actions__group--secondary">
                      <Btn onClick={() => handleCopy(selected.raw)} variant="ghost" size="sm">{copied ? "Copied!" : "Copy"}</Btn>
                      <Btn onClick={() => handleDownload(selected.raw, (clean(selected.name) || "page").toLowerCase().replace(/\s+/g, "-") + ".txt")} variant="ghost" size="sm">Download</Btn>
                      {!selected.skeleton && <Btn onClick={() => openHistory(selected.id)} variant="ghost" size="sm">History</Btn>}
                    </div>
                    <div className="app-page-actions__group app-page-actions__group--danger">
                      <Btn onClick={() => setShowDeleteCurrentPageModal(true)} variant="danger" size="sm">
                        Delete
                      </Btn>
                    </div>
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
                  <Suspense fallback={<div className="app-preview-loading">Loading preview…</div>}>
                    <LazySfGovPagePreview ref={screenshotRef} draft={mockupEditOpen ? draftEditBuffer : selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
                  </Suspense>
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
                      <h2 className="app-builder-empty__title">
                        {pages.length === 0 ? "Start your first draft" : "Start a new draft or open a saved page"}
                      </h2>
                      <p className="app-builder-empty__sub">
                        {pages.length === 0
                          ? "Add a page goal in the left panel, then generate. You can also browse the Library when you have saved pages."
                          : "Generate from the left panel, use Quick pick there, or go to Library to search and open a page."}
                      </p>
                      <p className="app-builder-empty__hint" title={previewSummaryLine}>
                        {previewSummaryLine}
                      </p>
                      <div className="app-builder-empty__actions">
                        <Btn
                          variant="primary"
                          size="md"
                          disabled={loading || topicError}
                          onClick={() => void generate({ pageType: pendingPageType || pageTypeOptions[0] })}
                        >
                          {loading ? "Working…" : "Generate draft"}
                        </Btn>
                        <Btn variant="ghost" size="md" onClick={() => setWorkspaceTab("library")}>
                          Browse Library
                        </Btn>
                      </div>
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
        <Suspense fallback={<Card className="app-card-pad--20-24"><p className="app-loading-p">Loading library…</p></Card>}>
        <LazyLibraryTab
          search={search}
          setSearch={setSearch}
          filterType={filterType}
          setFilterType={setFilterType}
          verificationFilter={verificationFilter}
          setVerificationFilter={setVerificationFilter}
          verificationFilters={VERIFICATION_FILTERS}
          showOverlapsOnly={showOverlapsOnly}
          setShowOverlapsOnly={setShowOverlapsOnly}
          overlapCount={overlapIds.size}
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
          onRequestBulkDelete={() => setShowDeleteModal(true)}
          onDownloadPNG={() => void handleDownloadPNG()}
          onDownloadPDF={() => void handleDownloadPDF()}
          onDownloadText={handleDownload}
          onSelectPage={(p) => { void openPageById(p.id); }}
          onTogglePageSelection={togglePageSelection}
          onUpdateReviewStatus={handleUpdateReviewStatus}
          onOpenHistory={openHistory}
        />
        </Suspense>
          ) : (
        <div className="app-studio-tab-pad">
        <Suspense fallback={<Card className="app-card-pad--20-24"><p className="app-loading-p">Loading map…</p></Card>}>
        <LazyMapTab
          mapMode={mapMode}
          setMapMode={setMapMode}
          pages={pages}
          plannedPages={plannedPages}
          plannedLoading={plannedLoading}
          selectedPlanned={selectedPlanned}
          setSelectedPlanned={setSelectedPlanned}
          addPlannedPage={addPlannedPage}
          deletePlannedPage={deletePlannedPage}
          selectById={(id) => { void openPageById(id); }}
          generateFromPlanned={generateFromPlanned}
          generateForQueue={generateForQueue}
          PlanDiagramComponent={PlanDiagram}
          PlanSidebarComponent={PlanSidebar}
          TodoPanelComponent={TodoPanel}
          onOpenQueuedPage={(id) => { void openPageById(id); }}
        />
        </Suspense>
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
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        count={selectedPageIds.size}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleteLoading}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteCurrentPageModal && !!selected}
        title="Delete this page?"
        message={
          selected
            ? `Remove "${clean(selected.name) || "Untitled"}" from your library? This cannot be undone.`
            : ""
        }
        onConfirm={handleConfirmDeleteCurrentPage}
        onCancel={() => !singlePageDeleteLoading && setShowDeleteCurrentPageModal(false)}
        isLoading={singlePageDeleteLoading}
      />
      <DeleteConfirmationModal
        isOpen={showRegenerateConfirmModal && !!selected}
        title="Regenerate page?"
        message="This replaces the current draft with a newly generated page using your page goal and settings. Unsaved changes in the editor or draft may be lost."
        confirmLabel="Regenerate"
        confirmVariant="primary"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenerateConfirmModal(false)}
      />
      {/* Hidden page previews for bulk PNG/PDF export */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 800, visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
        {pages.filter(p => p.id && selectedPageIds.has(p.id)).map(p => (
          <div key={p.id} id={`page-preview-${p.id}`}>
            <Suspense fallback={null}>
              <LazySfGovPagePreview draft={p.draft} pageType={p.pageType} pageTitle={clean(p.name)} />
            </Suspense>
          </div>
        ))}
      </div>
    </div>
  );
}
