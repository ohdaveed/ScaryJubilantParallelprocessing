import React, { useCallback, useMemo, lazy, Suspense } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { LibraryTab } from "../components/tabs/LibraryTab";
import { clean, findOverlappingPageIds, getVerificationState, VERIFICATION_FILTERS } from "../utils";

const LazySfGovPagePreview = lazy(() => import("../components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));

export default function LibraryPage() {
  const ctx = useWorkspace();

  const {
    pages, pagesLoading, seeding, selected,
    wsState, wsActions, openHistory, deletePage, openPageById, setSelected
  } = ctx;

  const overlapIds = useMemo(() => findOverlappingPageIds(pages), [pages]);
  
  const filtered = useMemo(() => {
    const query = wsState.search.toLowerCase().trim();
    const base = pages.filter((p) => {
      const verificationState = getVerificationState(p);
      const matchesSearch =
        !query ||
        (clean(p.name) || "").toLowerCase().includes(query) ||
        (p.draft || "").toLowerCase().includes(query) ||
        (p.userGoal || "").toLowerCase().includes(query);
      const matchesType = wsState.filterType === "All" || clean(p.pageType) === wsState.filterType;
      const matchesVerification =
        wsState.verificationFilter === "all" || verificationState === wsState.verificationFilter;
      return matchesSearch && matchesType && matchesVerification;
    });
    if (!wsState.showOverlapsOnly) return base;
    return base.filter((p) => overlapIds.has(p.id));
  }, [pages, wsState.search, wsState.filterType, wsState.verificationFilter, wsState.showOverlapsOnly, overlapIds]);

  const sorted = wsState.sortNewest ? [...filtered].reverse() : filtered;
  const filteredCount = filtered.length;

  const handleOpenHistory = useCallback((pageId: string) => {
    openHistory(pageId);
  }, [openHistory]);

  const handleDeletePage = useCallback(async (id: string) => {
    await deletePage(id);
  }, [deletePage]);

  return (
    <div style={{ display: "flex", height: "100%", gap: 0, overflow: "hidden" }}>
      {/* Library list - full width when no preview, half when preview open */}
      <div style={{ flex: selected ? "0 0 50%" : "1", overflowY: "auto", borderRight: selected ? "1px solid #e5e7eb" : "none" }}>
        <LibraryTab
          search={wsState.search}
          setSearch={wsActions.setSearch}
          filterType={wsState.filterType}
          setFilterType={wsActions.setFilterType}
          verificationFilter={wsState.verificationFilter}
          setVerificationFilter={wsActions.setVerificationFilter}
          verificationFilters={VERIFICATION_FILTERS}
          showOverlapsOnly={wsState.showOverlapsOnly}
          setShowOverlapsOnly={wsActions.setShowOverlapsOnly}
          overlapCount={overlapIds.size}
          sortNewest={wsState.sortNewest}
          setSortNewest={wsActions.setSortNewest}
          pagesLoading={pagesLoading}
          seeding={seeding}
          pages={pages}
          sorted={sorted}
          filteredCount={filteredCount}
          selectedPageIds={wsState.selectedPageIds}
          selectAllPages={() => wsActions.selectAllPages(pages.map(p => p.id))}
          clearPageSelection={wsActions.clearPageSelection}
          onRequestBulkDelete={() => wsActions.deleteSelectedPages(deletePage)}
          onDownloadPNG={() => {}}
          onDownloadPDF={() => {}}
          onDownloadText={() => {}}
          onSelectPage={(p) => { void openPageById(p.id); }}
          onTogglePageSelection={wsActions.togglePageSelection}
          onUpdateReviewStatus={async () => {}}
          onOpenHistory={handleOpenHistory}
        />
      </div>

      {/* Preview panel - shown on right when a page is selected */}
      {selected && (
        <div style={{ flex: "0 0 50%", overflowY: "auto", background: "#fafaf8" }}>
          <div style={{ position: "relative", height: "100%" }}>
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: 4,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                lineHeight: 1
              }}
              aria-label="Close preview"
              title="Close preview"
            >
              ✕
            </button>
            
            {/* Page preview */}
            <Suspense fallback={<div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Loading preview…</div>}>
              <LazySfGovPagePreview
                draft={selected.draft}
                pageType={selected.pageType}
                pageTitle={clean(selected.name)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}