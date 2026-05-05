import React, { useCallback, useMemo } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { LibraryTab } from "../components/tabs/LibraryTab";
import { clean, findOverlappingPageIds, getVerificationState, VERIFICATION_FILTERS } from "../utils";

export default function LibraryPage() {
  const ctx = useWorkspace();

  const {
    pages, pagesLoading, seeding,
    wsState, wsActions, openHistory, deletePage, openPageById
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
  );
}