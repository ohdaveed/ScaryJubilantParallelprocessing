import React from "react";
import { PAGE_TYPES, TYPE_META } from "../../constants";
import { PageDraft, ReviewStatus } from "../../types";
import { Badge, Btn, Card, iStyle } from "../ui";
import { ImportResult } from "../../state/appTypes";
import { clean } from "../../utils";

type LibraryTabProps = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  filterType: string;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  sortNewest: boolean;
  setSortNewest: React.Dispatch<React.SetStateAction<boolean>>;
  importing: boolean;
  importResult: ImportResult | null;
  pagesLoading: boolean;
  seeding: boolean;
  pages: PageDraft[];
  sorted: PageDraft[];
  filteredCount: number;
  selectedPageIds: Set<string>;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  deleteSelectedPages: () => Promise<void>;
  onImport: () => Promise<void>;
  onDownloadText: (text: string, name: string) => void;
  onSelectPage: (page: PageDraft) => void;
  onTogglePageSelection: (id: string, e: React.MouseEvent) => void;
  onUpdateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
};

export function LibraryTab(props: LibraryTabProps) {
  const {
    search,
    setSearch,
    filterType,
    setFilterType,
    sortNewest,
    setSortNewest,
    importing,
    importResult,
    pagesLoading,
    seeding,
    pages,
    sorted,
    filteredCount,
    selectedPageIds,
    selectAllPages,
    clearPageSelection,
    deleteSelectedPages,
    onImport,
    onDownloadText,
    onSelectPage,
    onTogglePageSelection,
    onUpdateReviewStatus
  } = props;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...iStyle({ maxWidth: 220 }) }} placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search pages" />
        <select style={{ ...iStyle({ maxWidth: 170 }) }} value={filterType} onChange={(e) => setFilterType(e.target.value)} aria-label="Filter by page type">
          <option>All</option>
          {PAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <Btn onClick={() => setSortNewest((s) => !s)} variant="ghost" size="sm">{sortNewest ? "Newest first" : "Oldest first"}</Btn>
        {pages.length > 0 && <Btn onClick={() => onDownloadText(pages.map((p) => p.raw).join("\n\n---\n\n"), "hhvc-pages-export.txt")} variant="ghost" size="sm">Export all</Btn>}
        {pages.some((p) => p.skeleton) && <Btn onClick={() => onDownloadText(pages.filter((p) => p.skeleton).map((p) => p.raw).join("\n\n---\n\n"), "hhvc-skeletons-export.txt")} variant="ghost" size="sm">Download skeletons</Btn>}
        <Btn onClick={onImport} variant="ghost" size="sm" disabled={importing}>{importing ? "Importing..." : "Import HHVC Pages"}</Btn>
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
              ? `${importResult.inserted} imported · ${importResult.skipped} skipped${importResult.skippedPlaceholders > 0 ? ` (${importResult.skippedPlaceholders} placeholders)` : ""}`
              : "Import failed"}
          </span>
        )}
      </div>

      {selectedPageIds.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px", background: "#3a1a1a", border: "1px solid #e53e3e", borderRadius: 6, marginBottom: 12 }}>
          <span style={{ color: "#e53e3e", fontWeight: 600, fontSize: 13 }}>{selectedPageIds.size} selected</span>
          <span style={{ color: "#555" }}>|</span>
          <button onClick={selectAllPages} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12, padding: 0 }}>Select all ({filteredCount})</button>
          <span style={{ color: "#555" }}>|</span>
          <button onClick={clearPageSelection} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: 12, padding: 0 }}>Clear</button>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={deleteSelectedPages} style={{ background: "#e53e3e", color: "white", border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>
              🗑 Delete ({selectedPageIds.size})
            </button>
          </div>
        </div>
      )}

      {seeding && (
        <div style={{ textAlign: "center", padding: "24px 0 12px", color: "#6B21A8" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #6B21A833", borderTopColor: "#6B21A8", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Seeding HHVC site map skeleton...</p>
          <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--color-text-tertiary)" }}>Creating the new HHVC planned pages and skeleton drafts</p>
        </div>
      )}

      {pagesLoading && !seeding && (
        <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, margin: 0 }}>Loading pages...</p>
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
          const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };
          return (
            <Card key={p.id} onClick={() => onSelectPage(p)} style={{ position: "relative", outline: selectedPageIds.has(p.id) ? "2px solid #e53e3e" : "none" }}>
              <div onClick={(e) => onTogglePageSelection(p.id, e)} style={{ position: "absolute", top: 8, left: 8, width: 18, height: 18, borderRadius: 4, border: selectedPageIds.has(p.id) ? "none" : "1.5px solid #aaa", background: selectedPageIds.has(p.id) ? "#e53e3e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, flexShrink: 0 }}>
                {selectedPageIds.has(p.id) && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, paddingLeft: 22 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, ...(p.skeleton ? { border: "1.5px dashed #6B21A8", background: "transparent" } : {}) }} />
                <Badge type={clean(p.pageType)} small />
                {p.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F3E8FF", color: "#6B21A8", border: "1px dashed #6B21A866" }}>skeleton</span>}
                {p.imported && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F1EFE8", color: "#6B4C00", border: "0.5px solid #6B4C0033" }}>imported</span>}
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
