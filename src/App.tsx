import React, { lazy, Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { SfGovContentDesignTool, MAIN_WORKSPACE_PANEL_ID, type ContentDesignTab } from "./components/SfGovContentDesignTool";
import { useWorkspace } from "./context/WorkspaceContext";
import { clean } from "./utils";
import packageJson from "../package.json";
import "./App.css";

const LazyGeneratePage = lazy(() => import("./pages/GeneratePage"));
const LazyLibraryPage = lazy(() => import("./pages/LibraryPage"));
const LazyPlanPage = lazy(() => import("./pages/PlanPage"));
const LazyIdealPage = lazy(() => import("./pages/IdealPage"));

const WORKSPACE_TABS: readonly ContentDesignTab[] = [
  { id: "plan", label: "Site Plan", description: "Canonical concepts and working HHVC architecture only." },
  { id: "generate", label: "Editor", description: "Edit and generate drafts for the selected Library page." },
  { id: "library", label: "Library", description: "Choose a page to work on (recommended starting point)." },
  { id: "ideal", label: "Ideal Map", description: "Reference benchmarks only, separate from working architecture." }
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
  return STUDIO_PAGE_TYPE_CHIPS.filter((t) => ["Transaction", "Information", "Topic", "Step by step", "Location", "Resource Collection", "Campaign"].includes(t));
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useWorkspace();

  // Derive workspace tab from URL path
  const pathTab = location.pathname.replace(/^\//, "") || "library";
  const workspaceTab = ["plan", "generate", "library", "ideal"].includes(pathTab) ? pathTab : "library";

  const {
    pages, selected, topic, showSuccess, justGenerated, karlStatus,
    pendingPageType, pendingPlannedId, setPendingPageType, setPendingPlannedId,
    setTopic, setTopicTouched, userType, setUserType,
    setSelected, generate, setShowSuccess,
    loading, streaming, evaluating, error, progressLabel, streamText, progress
  } = ctx;

  const screenshotRef = useRef<HTMLDivElement>(null);
  const pageTypeOptions = useMemo(() => studioPageTypes(), []);

  // Sync tab change to URL
  const handleWorkspaceTab = useCallback((id: string) => {
    navigate(`/${id}`);
  }, [navigate]);

  const handleBrowseLibraryClick = useCallback(() => {
    navigate("/library");
  }, [navigate]);

  const handleExportClick = useCallback(() => {
    if (selected) handleExportScreenshot(selected.name);
  }, [selected]);

  const handlePageTypeChange = useCallback((pt: string) => {
    setPendingPageType(pt);
    setPendingPlannedId(null);
  }, []);

  const handlePageGoalChange = useCallback((v: string) => {
    setTopic(v);
    setTopicTouched(true);
  }, []);

  const handleGenerateClick = useCallback(() => {
    setTopicTouched(true);
    if (!topic.trim()) return;
    void generate({ pageType: pendingPageType || pageTypeOptions[0] });
  }, [generate, pendingPageType, pageTypeOptions, setTopicTouched, topic]);

  const handleExportScreenshot = useCallback(async (pageName: string) => {
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
    }
  }, [screenshotRef]);

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
    return `${pt} · ${trunc} · No canonical concept linked yet`;
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

  const contentChecksFooter = useMemo(() => {
    const labels: Record<string, string> = {
      idle: "Content checks ready",
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

  const topicError = ctx.topicTouched && !ctx.topic.trim();

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
        headerExportDisabled={true}
        showPreviewExportButton={false}
        onExportClick={handleExportClick}
        userType={userType}
        onUserTypeChange={setUserType}
        userTypeOptions={["Resident", "Business Owner", "Contractor", "City Employee"]}
        pageTypeOptions={pageTypeOptions}
        activePageType={pendingPageType || pageTypeOptions[0] || "Transaction"}
        onPageTypeChange={handlePageTypeChange}
        pageGoal={topic}
        onPageGoalChange={handlePageGoalChange}
        pageGoalInvalid={topicError}
        pageGoalErrorText="Add a page goal before generating."
        additionalContext={ctx.notes}
        onAdditionalContextChange={ctx.setNotes}
        onGenerateClick={handleGenerateClick}
        generateLabel={
          loading ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…") : "Generate page"
        }
        generateDisabled={loading}
        libraryPages={libraryRows}
        selectedLibraryPageId={selected?.id ?? null}
        onLibraryPageSelect={(id) => {
          void (async () => {
            await ctx.openPageById(id);
            navigate("/generate");
          })();
        }}
        onLibraryPageDelete={(id) => void ctx.deletePage(id)}
        previewUrlText={previewUrlSlug}
        showPreviewChrome={workspaceTab === "generate"}
        previewSummaryLine={workspaceTab === "generate" ? previewSummaryLine : undefined}
        streamMessage={streamBarMessage}
        streamFooterMeta={streamFooterMetaFull}
        onExportPreview={() => {
          // Preview export is intentionally disabled for now.
        }}
        previewSlot={
          <Suspense fallback={<div className="app-preview-loading">Loading…</div>}>
            {workspaceTab === "generate" && <LazyGeneratePage />}
            {workspaceTab === "library" && <LazyLibraryPage />}
            {workspaceTab === "plan" && <LazyPlanPage />}
            {workspaceTab === "ideal" && <LazyIdealPage />}
          </Suspense>
        }
      />
      {/* Hidden screenshot ref */}
      <div ref={screenshotRef} style={{ position: "absolute", top: 0, left: 0, width: 800, visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
        {selected && (
          <Suspense fallback={null}>
            <LazySfGovPagePreview draft={selected.draft} pageType={selected.pageType} pageTitle={clean(selected.name)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

const LazySfGovPagePreview = lazy(() => import("./components/SfGovPreview").then((m) => ({ default: m.SfGovPagePreview })));