import React, { useCallback, useMemo, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { useWorkspace } from "../context/WorkspaceContext";
import { LibraryTab } from "../components/tabs/LibraryTab";
import { clean } from "../utils/core";
import { getVerificationState, VERIFICATION_FILTERS } from "../utils/viewState";
import { pageArtifactsApi, pagesApi } from "../api";
import { generateZip, renderPageAsPDF, renderPageAsPNG } from "../utils/export";
import { SfGovPagePreview } from "../components/SfGovPreview";
import type { PageDraft, ReviewStatus } from "../types";
import { useNavigate } from "react-router-dom";

const LazySfGovPagePreview = lazy(() => import("../components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));

export default function LibraryPage() {
  const ctx = useWorkspace();
  const navigate = useNavigate();

  const {
    pages, setPages, pagesLoading, seeding, selected,
    wsState, wsActions, openHistory, deletePage, openPageById, setSelected,
    plannedPages, concepts, linkPlannedPage
  } = ctx;

  const groupModel = useMemo(() => {
    const conceptByBuiltPageId = new Map<string, number>();
    plannedPages.forEach((planned) => {
      if (planned.builtPageId) conceptByBuiltPageId.set(planned.builtPageId, planned.id);
    });
    const conceptById = new Map<number, (typeof concepts)[number]>();
    concepts.forEach((concept) => {
      conceptById.set(concept.id, concept);
    });

    const groups = new Map<string, { members: typeof pages; conceptId: number | null }>();
    pages.forEach((page) => {
      const linkedConceptId = conceptByBuiltPageId.get(page.id);
      const concept = linkedConceptId != null ? conceptById.get(linkedConceptId) : undefined;
      const titleKey = clean(page.name).toLowerCase().replace(/\s+/g, " ").trim();
      const key = concept ? `concept:${concept.id}` : `title:${titleKey || page.id}`;
      const existing = groups.get(key);
      if (existing) existing.members.push(page);
      else groups.set(key, { members: [page], conceptId: concept?.id ?? null });
    });

    const representatives: typeof pages = [];
    const groupSizes = new Map<string, number>();
    const overlapIds = new Set<string>();
    const alternatesByRepresentativeId = new Map<string, PageDraft[]>();
    const conceptIdByRepresentativeId = new Map<string, number>();

    groups.forEach(({ members, conceptId }) => {
      members.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const concept = conceptId != null ? conceptById.get(conceptId) : undefined;
      const canonicalMember = concept?.canonicalArtifactId
        ? members.find((member) => member.id === concept.canonicalArtifactId)
        : undefined;
      const representative = canonicalMember
        || members.find((member) => !member.skeleton)
        || members[0];
      representatives.push(representative);
      if (conceptId != null) conceptIdByRepresentativeId.set(representative.id, conceptId);
      groupSizes.set(representative.id, members.length);
      if (members.length > 1) overlapIds.add(representative.id);
      const alternates = members.filter((member) => member.id !== representative.id);
      if (alternates.length > 0) alternatesByRepresentativeId.set(representative.id, alternates);
    });

    return { representatives, groupSizes, overlapIds, alternatesByRepresentativeId, conceptIdByRepresentativeId };
  }, [pages, plannedPages, concepts]);

  const overlapIds = groupModel.overlapIds;
  const selectedPages = useMemo(
    () => groupModel.representatives.filter((page) => wsState.selectedPageIds.has(page.id)),
    [groupModel.representatives, wsState.selectedPageIds]
  );
  
  const filtered = useMemo(() => {
    const query = wsState.search.toLowerCase().trim();
    const base = groupModel.representatives.filter((p) => {
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
  }, [groupModel.representatives, wsState.search, wsState.filterType, wsState.verificationFilter, wsState.showOverlapsOnly, overlapIds]);

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

  const handlePrimaryAction = useCallback((page: (typeof pages)[number]) => {
    void (async () => {
      await openPageById(page.id);
      navigate("/generate");
    })();
  }, [openPageById, navigate]);

  const handleOpenAlternate = useCallback((page: (typeof pages)[number]) => {
    void (async () => {
      await openPageById(page.id);
      navigate("/generate");
    })();
  }, [openPageById, navigate]);

  const handlePromoteAlternate = useCallback(async (representativeId: string, alternate: (typeof pages)[number]) => {
    const conceptId = groupModel.conceptIdByRepresentativeId.get(representativeId);
    if (!conceptId) return;
    await pageArtifactsApi.promote(alternate.id, conceptId);
    const refreshed = await pagesApi.list();
    setPages(refreshed);
    setSelected(alternate);
    await openPageById(alternate.id);
  }, [groupModel.conceptIdByRepresentativeId, openPageById, setPages, setSelected]);

  const handleMarkAsBuilt = useCallback(async (pageId: string, plannedId: number) => {
    await linkPlannedPage(plannedId, pageId);
  }, [linkPlannedPage]);

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
          pages={groupModel.representatives}
          sorted={sorted}
          groupSizes={Object.fromEntries(groupModel.groupSizes.entries())}
          alternatesByRepresentativeId={Object.fromEntries(groupModel.alternatesByRepresentativeId.entries())}
          conceptIdByRepresentativeId={Object.fromEntries(groupModel.conceptIdByRepresentativeId.entries())}
          filteredCount={filteredCount}
          selectedPageIds={wsState.selectedPageIds}
          selectAllPages={() => wsActions.selectAllPages(groupModel.representatives.map(p => p.id))}
          clearPageSelection={wsActions.clearPageSelection}
          onRequestBulkDelete={() => wsActions.deleteSelectedPages(deletePage)}
          onDownloadPNG={() => void handleDownloadSelected("png")}
          onDownloadPDF={() => void handleDownloadSelected("pdf")}
          onDownloadText={handleDownloadText}
          onSelectPage={(p) => {
            void (async () => {
              await openPageById(p.id);
              navigate("/generate");
            })();
          }}
          onPrimaryAction={handlePrimaryAction}
          onOpenAlternate={handleOpenAlternate}
          onPromoteAlternate={handlePromoteAlternate}
          onTogglePageSelection={wsActions.togglePageSelection}
          onUpdateReviewStatus={handleUpdateReviewStatus}
          onOpenHistory={handleOpenHistory}
          plannedPages={plannedPages}
          onMarkAsBuilt={handleMarkAsBuilt}
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