import React, { memo, useMemo, useState } from "react";
import { PageDraft, PlannedPage } from "../types";
import { PAGE_TYPES, USER_TYPES } from "../constants";
import { Badge, Btn, Card, Divider } from "./ui";
import { clean } from "../utils";

export const PlanSidebar = memo(function PlanSidebar({ planned, pages, selectedPlanned, onSelectPlanned, onAdd, onDelete, onGenerate, onViewPage, onLinkExistingPage, onUnlinkPage }: {
  planned: PlannedPage[];
  pages: PageDraft[];
  selectedPlanned: PlannedPage | null;
  onSelectPlanned: (p: PlannedPage | null) => void;
  onAdd: (name: string, pageType: string, userType: string, parentId: number | null) => void;
  onDelete: (id: number) => void;
  onGenerate: (p: PlannedPage) => void | Promise<void>;
  onViewPage: (pageId: string) => void;
  onLinkExistingPage?: (plannedId: number, pageId: string) => void | Promise<void>;
  onUnlinkPage?: (plannedId: number) => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pageType, setPageType] = useState(PAGE_TYPES[0]);
  const [ut, setUt] = useState(USER_TYPES[0]);
  const [parentId, setParentId] = useState<number | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkPickerSelection, setLinkPickerSelection] = useState<string>("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), pageType, ut, parentId);
    setName(""); setPageType(PAGE_TYPES[0]); setUt(USER_TYPES[0]); setParentId(null); setAdding(false);
  };

  const builtPage = selectedPlanned?.builtPageId ? pages.find(p => p.id === selectedPlanned.builtPageId) : null;

  const linkablePages = useMemo(() => {
    const usedPageIds = new Set(planned.map((p) => p.builtPageId).filter(Boolean) as string[]);
    if (selectedPlanned?.builtPageId) usedPageIds.delete(selectedPlanned.builtPageId);
    return pages
      .filter((p) => !p.skeleton && !usedPageIds.has(p.id))
      .sort((a, b) => clean(a.name).localeCompare(clean(b.name)));
  }, [pages, planned, selectedPlanned?.builtPageId]);

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
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#E8EFFA", color: "#185FA5", border: "1px solid #185FA533" }}>Concept</span>
              <Badge type={selectedPlanned.pageType} small />
            </div>
            {selectedPlanned.taskStatement && <p className="app-ps-muted">Task: {selectedPlanned.taskStatement}</p>}
            <p className="app-ps-muted">User: {selectedPlanned.userType}</p>
            {selectedPlanned.parentId && (
              <p className="app-ps-muted">Parent: {planned.find(p => p.id === selectedPlanned.parentId)?.name || "Unknown"}</p>
            )}
            {!!selectedPlanned.governanceFlags?.length && (
              <p className="app-ps-muted">Governance: {selectedPlanned.governanceFlags.map((flag) => flag.message).join(" · ")}</p>
            )}
          </div>
          {builtPage ? (
            <div>
              <div className="app-ps-built-box">
                <p className="app-ps-built-title">Linked to library draft</p>
                <p className="app-ps-built-sub">{clean(builtPage.name) || "Untitled"}</p>
                {builtPage.karlEvaluation && (
                  <p className="app-ps-built-sub">Grade {builtPage.karlEvaluation.grade} &middot; {builtPage.karlEvaluation.score}/100</p>
                )}
              </div>
              <Btn onClick={() => onViewPage(builtPage.id)} variant="primary" size="md" fullWidth>View page &rarr;</Btn>
              {onUnlinkPage && (
                <div style={{ marginTop: 6 }}>
                  <Btn onClick={() => void onUnlinkPage(selectedPlanned.id)} variant="ghost" size="sm">Unlink draft</Btn>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Btn onClick={() => void onGenerate(selectedPlanned)} variant="primary" size="md" fullWidth>Add to build queue &rarr;</Btn>
              {onLinkExistingPage && (
                <div style={{ marginTop: 8 }}>
                  {!linkPickerOpen ? (
                    <Btn onClick={() => { setLinkPickerOpen(true); setLinkPickerSelection(""); }} variant="ghost" size="sm">Link existing draft…</Btn>
                  ) : (
                    <div className="app-ps-add-panel">
                      <p className="app-ps-muted" style={{ margin: "0 0 6px" }}>Pick a Library draft to link to this concept.</p>
                      <select
                        className="app-input app-input--sm app-input--mb6"
                        aria-label="Library draft"
                        title="Library draft"
                        value={linkPickerSelection}
                        onChange={(e) => setLinkPickerSelection(e.target.value)}
                      >
                        <option value="">Choose a draft…</option>
                        {linkablePages.length === 0 && <option value="" disabled>No unlinked drafts available</option>}
                        {linkablePages.map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            {clean(pg.name) || "Untitled"} · {clean(pg.pageType) || "—"}
                          </option>
                        ))}
                      </select>
                      <div className="app-row-gap-6">
                        <Btn
                          onClick={() => {
                            if (!linkPickerSelection) return;
                            void onLinkExistingPage(selectedPlanned.id, linkPickerSelection);
                            setLinkPickerOpen(false);
                            setLinkPickerSelection("");
                          }}
                          variant="primary"
                          size="sm"
                          disabled={!linkPickerSelection}
                        >Link draft</Btn>
                        <Btn onClick={() => { setLinkPickerOpen(false); setLinkPickerSelection(""); }} variant="ghost" size="sm">Cancel</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
          <p className="app-ps-muted" style={{ marginTop: 0 }}>Canonical concepts only. Drafts, variants, and reference examples are excluded from this view.</p>

          {planned.map(p => {
            const isBuilt = !!p.builtPageId && pages.some(pg => pg.id === p.builtPageId);
            return (
              <button key={p.id} type="button" className="app-plan-item" onClick={() => onSelectPlanned(p)}>
                <span className="app-plan-item__dot" data-page-type={p.pageType} />
                <span className="app-plan-item__label">{p.name}</span>
                {!!p.governanceFlags?.length && <span className="app-plan-item__built" style={{ background: "#FAEEDA", color: "#854F0B" }}>review</span>}
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