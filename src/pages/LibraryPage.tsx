import React, { useCallback, useMemo, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { useWorkspace } from "../context/WorkspaceContext";
import { LibraryTab } from "../components/tabs/LibraryTab";
import { clean, findOverlappingPageIds, getVerificationState, VERIFICATION_FILTERS } from "../utils";
import { pagesApi } from "../utils/api";
import { generateZip, renderPageAsPDF, renderPageAsPNG } from "../utils/export";
import { SfGovPagePreview } from "../components/SfGovPreview";
import type { ReviewStatus } from "../types";

const LazySfGovPagePreview = lazy(() => import("../components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));

export default function LibraryPage() {
  const ctx = useWorkspace();

  const {
    pages, setPages, pagesLoading, seeding, selected,
    wsState, wsActions, openHistory, deletePage, openPageById, setSelected
  } = ctx;

  const overlapIds = useMemo(() => findOverlappingPageIds(pages), [pages]);
  const selectedPages = useMemo(
    () => pages.filter((page) => wsState.selectedPageIds.has(page.id)),
    [pages, wsState.selectedPageIds]
  );
  
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

  const handleDownloadText = useCallback((text: string, name: string) => {
    if (!text) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = name;
    a.click();
  }, []);

  const renderSelectedPreview = useCallback(async (page: (typeof pages)[number], format: "png" | "pdf") => {
    const mountId = `library-export-${page.id}-${format}-${Date.now()}`;
    const container = document.createElement("div");
    container.id = mountId;
    container.style.position = "fixed";
    container.style.left = "-100000px";
    container.style.top = "0";
    container.style.width = "1200px";
    container.style.background = "#ffffff";
    container.style.pointerEvents = "none";
    container.style.overflow = "hidden";
    container.style.opacity = "0";
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      root.render(
        <div style={{ width: "1200px", background: "#ffffff" }}>
          <SfGovPagePreview draft={page.draft} pageType={page.pageType} pageTitle={clean(page.name)} />
        </div>
      );

      if (document.fonts?.ready) {
        await document.fonts.ready.catch(() => {});
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

      return format === "png"
        ? await renderPageAsPNG(page, mountId)
        : await renderPageAsPDF(page, mountId);
    } finally {
      root.unmount();
      container.remove();
    }
  }, []);

  const handleDownloadSelected = useCallback(async (format: "png" | "pdf") => {
    if (selectedPages.length === 0) return;

    const files = await Promise.all(selectedPages.map((page) => renderSelectedPreview(page, format)));
    if (files.length === 1) {
      const { blob, filename } = files[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      return;
    }

    const zipBlob = await generateZip(files);
    const zipName = format === "png" ? "hhvc-selected-pages-png.zip" : "hhvc-selected-pages-pdf.zip";
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [renderSelectedPreview, selectedPages]);

  const handleUpdateReviewStatus = useCallback(async (id: string, status: ReviewStatus) => {
    await pagesApi.updateReview(id, status);
    setPages((prev) => prev.map((page) => (page.id === id ? { ...page, reviewStatus: status } : page)));
    if (selected?.id === id) {
      setSelected({ ...selected, reviewStatus: status });
    }
  }, [selected, setPages, setSelected]);

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
          onDownloadPNG={() => void handleDownloadSelected("png")}
          onDownloadPDF={() => void handleDownloadSelected("pdf")}
          onDownloadText={handleDownloadText}
          onSelectPage={(p) => {
            setSelected(p);
            void openPageById(p.id);
          }}
          onTogglePageSelection={wsActions.togglePageSelection}
          onUpdateReviewStatus={handleUpdateReviewStatus}
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