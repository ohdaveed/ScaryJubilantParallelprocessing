import React from "react";
import { PAGE_TYPES, TYPE_META } from "../../constants";
import { PageDraft, ReviewStatus, VerificationState } from "../../types";
import { Badge, Btn, Card, UI_INPUT_CLASS } from "../ui";
import { artifactKindFromPage, artifactRoleLabel } from "../../utils/contentModel";
import { clean, getVerificationLabel, getVerificationState } from "../../utils";

type LibraryTabProps = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  filterType: string;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  verificationFilter: VerificationState | "all";
  setVerificationFilter: React.Dispatch<React.SetStateAction<VerificationState | "all">>;
  verificationFilters: ReadonlyArray<{ id: VerificationState | "all"; label: string }>;
  showOverlapsOnly: boolean;
  setShowOverlapsOnly: React.Dispatch<React.SetStateAction<boolean>>;
  overlapCount: number;
  sortNewest: boolean;
  setSortNewest: React.Dispatch<React.SetStateAction<boolean>>;
  pagesLoading: boolean;
  seeding: boolean;
  pages: PageDraft[];
  sorted: PageDraft[];
  filteredCount: number;
  selectedPageIds: Set<string>;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  onRequestBulkDelete: () => void;
  onDownloadPNG: () => void;
  onDownloadPDF: () => void;
  onDownloadText: (text: string, name: string) => void;
  onSelectPage: (page: PageDraft) => void;
  onTogglePageSelection: (id: string, e: React.MouseEvent) => void;
  onUpdateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  onOpenHistory: (pageId: string) => void;
};

export function LibraryTab(props: LibraryTabProps) {
  const {
    search,
    setSearch,
    filterType,
    setFilterType,
    verificationFilter,
    setVerificationFilter,
    verificationFilters,
    showOverlapsOnly,
    setShowOverlapsOnly,
    overlapCount,
    sortNewest,
    setSortNewest,
    pagesLoading,
    seeding,
    pages,
    sorted,
    filteredCount,
    selectedPageIds,
    selectAllPages,
    clearPageSelection,
    onRequestBulkDelete,
    onDownloadPNG,
    onDownloadPDF,
    onDownloadText,
    onSelectPage,
    onTogglePageSelection,
    onUpdateReviewStatus,
    onOpenHistory
  } = props;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input className={`${UI_INPUT_CLASS} ui-input--search`} placeholder="Search pages…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search pages" />
        <select className={`${UI_INPUT_CLASS} ui-input--filter`} value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by page type">
          <option>All</option>
          {PAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className={`${UI_INPUT_CLASS} ui-input--filter`} value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as VerificationState | "all")} aria-label="Filter by verification state">
          {verificationFilters.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <Btn onClick={() => setShowOverlapsOnly((s) => !s)} variant="ghost" size="sm">
          {showOverlapsOnly ? "Showing overlaps only" : `Show overlaps only (${overlapCount})`}
        </Btn>
        <Btn onClick={() => setSortNewest((s) => !s)} variant="ghost" size="sm">{sortNewest ? "Newest first" : "Oldest first"}</Btn>
        {pages.length > 0 && <Btn onClick={() => onDownloadText(pages.map((p) => p.raw).join("\n\n---\n\n"), "hhvc-pages-export.txt")} variant="ghost" size="sm">Export all</Btn>}
        {pages.some((p) => p.skeleton) && (
          <Btn onClick={() => onDownloadText(pages.filter((p) => p.skeleton).map((p) => p.raw).join("\n\n---\n\n"), "hhvc-skeletons-export.txt")} variant="ghost" size="sm">Download skeletons</Btn>
        )}
      </div>

      {selectedPageIds.size > 0 && (
        <div
          className="library-selection-bar"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", background: "#3a1a1a", border: "1px solid #e53e3e", borderRadius: 6, marginBottom: 12 }}
        >
          <span style={{ color: "#e53e3e", fontWeight: 600, fontSize: 13 }}>{selectedPageIds.size} selected</span>
          <span style={{ color: "#555" }} aria-hidden>|</span>
          <button type="button" className="library-selection-bar__btn" onClick={selectAllPages}>
            Select all ({filteredCount})
          </button>
          <span style={{ color: "#555" }} aria-hidden>|</span>
          <button type="button" className="library-selection-bar__btn" onClick={clearPageSelection}>
            Clear
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className="library-selection-bar__btn--border" onClick={onDownloadPNG}>
              Download PNG
            </button>
            <button type="button" className="library-selection-bar__btn--border" onClick={onDownloadPDF}>
              Download PDF
            </button>
            <button
              type="button"
              className="library-selection-bar__btn--danger"
              onClick={onRequestBulkDelete}
              aria-label={`Delete ${selectedPageIds.size} selected pages`}
            >
              🗑 Delete ({selectedPageIds.size})
            </button>
          </div>
        </div>
      )}

      {seeding && (
        <div style={{ textAlign: "center", padding: "24px 0 12px", color: "#6B21A8" }}>
          <div className="library-tab-spinner library-tab-spinner--accent" aria-hidden />
          <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Seeding HHVC site map skeleton…</p>
          <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--color-text-tertiary)" }}>Creating the new HHVC planned pages and skeleton drafts</p>
        </div>
      )}

      {pagesLoading && !seeding && (
        <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
          <div className="library-tab-spinner library-tab-spinner--neutral" aria-hidden />
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
        {sorted.map((p) => {
          const c = TYPE_META[clean(p.pageType)] || { dot: "#888" };
          const ev = p.karlEvaluation;
          const verificationState = getVerificationState(p);
          const objectRole = artifactRoleLabel(artifactKindFromPage(p));
          const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };
          return (
            <Card key={p.id} onClick={() => onSelectPage(p)} className={["ui-card--lib", selectedPageIds.has(p.id) ? "ui-card--bulk-selected" : ""].filter(Boolean).join(" ")}>
              <div onClick={(e) => onTogglePageSelection(p.id, e)} style={{ position: "absolute", top: 8, left: 8, width: 18, height: 18, borderRadius: 4, border: selectedPageIds.has(p.id) ? "none" : "1.5px solid #aaa", background: selectedPageIds.has(p.id) ? "#e53e3e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, flexShrink: 0 }}>
                {selectedPageIds.has(p.id) && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, paddingLeft: 22 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, ...(p.skeleton ? { border: "1.5px dashed #6B21A8", background: "transparent" } : {}) }} />
                <Badge type={clean(p.pageType)} small />
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#EEF4FA", color: "#185FA5", border: "0.5px solid #185FA533" }}>
                  {objectRole}
                </span>
                {p.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F3E8FF", color: "#6B21A8", border: "1px dashed #6B21A866" }}>skeleton</span>}
                {p.imported && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F1EFE8", color: "#6B4C00", border: "0.5px solid #6B4C0033" }}>imported</span>}
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#eef2f6", color: "#334155", border: "0.5px solid #cbd5e1" }}>
                  {getVerificationLabel(verificationState)}
                </span>
                {p.currentVersionNumber != null && p.currentVersionNumber > 0 && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E8EFFA", color: "#185FA5", border: "0.5px solid #185FA533", fontWeight: 600 }}>v{p.currentVersionNumber}</span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  {ev && <span style={{ fontSize: 10, fontWeight: 700, color: gradeColor[ev.grade] || "#888" }}>{ev.grade}</span>}
                  {!p.karlConnected && !p.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FAEEDA", color: "#854F0B" }}>no Karl</span>}
                </div>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4, color: "var(--color-text-primary)" }}>{clean(p.name) || "Untitled"}</p>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px", lineHeight: 1.4 }}>
                {p.skeleton ? "Experiment draft not linked to canonical architecture." : p.imported ? "Imported artifact awaiting canonical mapping or review." : "Current page artifact managed separately from site architecture."}
              </p>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>{(clean(p.userGoal) || "").slice(0, 70)}{(clean(p.userGoal) || "").length > 70 ? "…" : ""}</p>
              {ev && (
                <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                  {ev.passed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#E1F5EE", color: "#0F6E56" }}>✓ {ev.passed.length}</span>}
                  {ev.warnings.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FAEEDA", color: "#854F0B" }}>⚠ {ev.warnings.length}</span>}
                  {ev.failed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D" }}>✗ {ev.failed.length}</span>}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, flex: 1 }}>{new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                {!p.skeleton && (
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenHistory(p.id);
                    }}
                  >
                    History
                  </Btn>
                )}
                {p.imported && (
                  <select
                    aria-label="Review status"
                    title="Review status"
                    value={p.reviewStatus || "pending"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={async (e) => {
                      e.stopPropagation();
                      const newStatus = e.target.value as ReviewStatus;
                      await onUpdateReviewStatus(p.id, newStatus);
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
  );
}
