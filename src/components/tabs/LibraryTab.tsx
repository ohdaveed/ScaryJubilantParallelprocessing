import React, { useMemo, useState } from "react";
import { PAGE_TYPES } from "../../constants";
import { PageDraft, PlannedPage, ReviewStatus, VerificationState } from "../../types";
import { Badge, Btn, Card, DeleteConfirmationModal, UI_INPUT_CLASS } from "../ui";
import { artifactKindFromPage, artifactRoleLabel } from "../../utils/contentModel";
import { clean, getVerificationLabel, getVerificationState } from "../../utils";
import { LibraryPageCard } from "./LibraryPageCard";

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
  groupSizes: Record<string, number>;
  alternatesByRepresentativeId: Record<string, PageDraft[]>;
  conceptIdByRepresentativeId: Record<string, number>;
  filteredCount: number;
  selectedPageIds: Set<string>;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  onRequestBulkDelete: () => void;
  onDownloadPNG: () => void;
  onDownloadPDF: () => void;
  onDownloadText: (text: string, name: string) => void;
  onSelectPage: (page: PageDraft) => void;
  onPrimaryAction: (page: PageDraft) => void;
  onOpenAlternate: (page: PageDraft) => void;
  onPromoteAlternate: (representativeId: string, page: PageDraft) => Promise<void> | void;
  onTogglePageSelection: (id: string, e: React.MouseEvent) => void;
  onUpdateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
  onOpenHistory: (pageId: string) => void;
  /** Planned pages a verified library draft can be promoted into (linked) as a built artifact. */
  plannedPages?: PlannedPage[];
  /** Promote a verified library page by linking it to a planned Site Plan node. */
  onMarkAsBuilt?: (pageId: string, plannedId: number) => Promise<void> | void;
};

type LibraryControlsBarProps = {
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
  pages: PageDraft[];
  onDownloadText: (text: string, name: string) => void;
};

function LibraryControlsBar({
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
  pages,
  onDownloadText
}: LibraryControlsBarProps) {
  return (
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
  );
}

type LibrarySelectionBarProps = {
  selectedPageIds: Set<string>;
  filteredCount: number;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  onDownloadPNG: () => void;
  onDownloadPDF: () => void;
  onRequestBulkDelete: () => void;
};

function LibrarySelectionBar({
  selectedPageIds,
  filteredCount,
  selectAllPages,
  clearPageSelection,
  onDownloadPNG,
  onDownloadPDF,
  onRequestBulkDelete
}: LibrarySelectionBarProps) {
  return (
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
  );
}

export function LibraryTab(props: LibraryTabProps) {
  // REFACTORED: Extracted filter/selection toolbar blocks into focused subcomponents to reduce top-level complexity.
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
    groupSizes,
    alternatesByRepresentativeId,
    conceptIdByRepresentativeId,
    filteredCount,
    selectedPageIds,
    selectAllPages,
    clearPageSelection,
    onRequestBulkDelete,
    onDownloadPNG,
    onDownloadPDF,
    onDownloadText,
    onSelectPage,
    onPrimaryAction,
    onOpenAlternate,
    onPromoteAlternate,
    onTogglePageSelection,
    onUpdateReviewStatus,
    onOpenHistory,
    plannedPages = [],
    onMarkAsBuilt
  } = props;

  const [expandedAlternates, setExpandedAlternates] = useState<Set<string>>(new Set());
  const [pendingPromotion, setPendingPromotion] = useState<{ representativeId: string; page: PageDraft } | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);

  const [markAsBuiltOpen, setMarkAsBuiltOpen] = useState<string | null>(null);
  const [markAsBuiltSelection, setMarkAsBuiltSelection] = useState<number | null>(null);
  const [markAsBuiltLoading, setMarkAsBuiltLoading] = useState(false);

  const linkablePlannedPages = useMemo(() => {
    return [...plannedPages]
      .filter((p) => !p.builtPageId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [plannedPages]);

  const plannedByBuiltPageId = useMemo(() => {
    const map = new Map<string, PlannedPage>();
    plannedPages.forEach((p) => {
      if (p.builtPageId) map.set(p.builtPageId, p);
    });
    return map;
  }, [plannedPages]);

  return (
    <div style={{ marginTop: 20 }}>
      <LibraryControlsBar
        search={search}
        setSearch={setSearch}
        filterType={filterType}
        setFilterType={setFilterType}
        verificationFilter={verificationFilter}
        setVerificationFilter={setVerificationFilter}
        verificationFilters={verificationFilters}
        showOverlapsOnly={showOverlapsOnly}
        setShowOverlapsOnly={setShowOverlapsOnly}
        overlapCount={overlapCount}
        sortNewest={sortNewest}
        setSortNewest={setSortNewest}
        pages={pages}
        onDownloadText={onDownloadText}
      />

      {selectedPageIds.size > 0 && (
        <LibrarySelectionBar
          selectedPageIds={selectedPageIds}
          filteredCount={filteredCount}
          selectAllPages={selectAllPages}
          clearPageSelection={clearPageSelection}
          onDownloadPNG={onDownloadPNG}
          onDownloadPDF={onDownloadPDF}
          onRequestBulkDelete={onRequestBulkDelete}
        />
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
          const verificationState = getVerificationState(p);
          const groupedCount = groupSizes[p.id] || 1;
          const alternates = alternatesByRepresentativeId[p.id] || [];
          const canPromoteAlternates = conceptIdByRepresentativeId[p.id] != null;
          const alternatesOpen = expandedAlternates.has(p.id);
          const linkedPlanned = plannedByBuiltPageId.get(p.id) || null;
          const canMarkAsBuilt =
            !!onMarkAsBuilt &&
            !p.skeleton &&
            !linkedPlanned &&
            (verificationState === "verified" || p.qualityGate?.status === "pass");
          return (
            <LibraryPageCard
              page={p}
              selected={selectedPageIds.has(p.id)}
              groupedCount={groupedCount}
              alternates={alternates}
              alternatesOpen={alternatesOpen}
              canPromoteAlternates={canPromoteAlternates}
              linkedPlanned={linkedPlanned}
              canMarkAsBuilt={canMarkAsBuilt}
              onSelectPage={onSelectPage}
              onTogglePageSelection={onTogglePageSelection}
              onPrimaryAction={onPrimaryAction}
              onOpenHistory={onOpenHistory}
              onOpenAlternate={onOpenAlternate}
              onToggleAlternates={(representativeId) => {
                setExpandedAlternates((prev) => {
                  const next = new Set(prev);
                  if (next.has(representativeId)) next.delete(representativeId);
                  else next.add(representativeId);
                  return next;
                });
              }}
              onStartPromoteAlternate={(representativeId, page) => setPendingPromotion({ representativeId, page })}
              onStartMarkAsBuilt={(pageId) => {
                setMarkAsBuiltOpen(pageId);
                setMarkAsBuiltSelection(null);
              }}
              onUpdateReviewStatus={onUpdateReviewStatus}
            />
          );
        })}
      </div>
      <DeleteConfirmationModal
        isOpen={pendingPromotion != null}
        title="Make this draft canonical?"
        message={pendingPromotion ? `Use "${clean(pendingPromotion.page.name) || "Untitled"}" as the canonical draft for this page concept? The current canonical draft will become an alternate draft.` : ""}
        confirmLabel="Make canonical"
        confirmVariant="primary"
        loadingConfirmLabel="Updating…"
        isLoading={promotionLoading}
        onCancel={() => {
          if (!promotionLoading) setPendingPromotion(null);
        }}
        onConfirm={async () => {
          if (!pendingPromotion) return;
          setPromotionLoading(true);
          try {
            await onPromoteAlternate(pendingPromotion.representativeId, pendingPromotion.page);
            setPendingPromotion(null);
          } finally {
            setPromotionLoading(false);
          }
        }}
      />
      {markAsBuiltOpen != null && (
        <div
          role="dialog"
          aria-label="Mark as built"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.32)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => {
            if (!markAsBuiltLoading) {
              setMarkAsBuiltOpen(null);
              setMarkAsBuiltSelection(null);
            }
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 18,
              maxWidth: 460,
              width: "100%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Mark draft as built</p>
            <p style={{ margin: "6px 0 12px", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              Link this verified draft to a Site Plan node. The plan node will then show this page as built.
            </p>
            {linkablePlannedPages.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#92400e" }}>
                No unlinked plan nodes available. Add a planned page in Site Plan first, or unlink an existing one.
              </p>
            ) : (
              <select
                aria-label="Plan node to link"
                title="Plan node to link"
                value={markAsBuiltSelection ?? ""}
                onChange={(e) => setMarkAsBuiltSelection(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  marginBottom: 12
                }}
              >
                <option value="">Choose a plan node…</option>
                {linkablePlannedPages.map((pp) => (
                  <option key={pp.id} value={pp.id}>
                    {pp.name} · {pp.pageType}
                  </option>
                ))}
              </select>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn
                variant="ghost"
                size="sm"
                disabled={markAsBuiltLoading}
                onClick={() => {
                  setMarkAsBuiltOpen(null);
                  setMarkAsBuiltSelection(null);
                }}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                disabled={markAsBuiltLoading || markAsBuiltSelection == null || !onMarkAsBuilt}
                onClick={async () => {
                  if (!onMarkAsBuilt || markAsBuiltSelection == null || markAsBuiltOpen == null) return;
                  setMarkAsBuiltLoading(true);
                  try {
                    await onMarkAsBuilt(markAsBuiltOpen, markAsBuiltSelection);
                    setMarkAsBuiltOpen(null);
                    setMarkAsBuiltSelection(null);
                  } finally {
                    setMarkAsBuiltLoading(false);
                  }
                }}
              >
                {markAsBuiltLoading ? "Linking…" : "Mark as built"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
