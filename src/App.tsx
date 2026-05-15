import React, { lazy, Suspense, useCallback, useRef } from "react";
import { SfGovContentDesignTool, MAIN_WORKSPACE_PANEL_ID, type ContentDesignTab } from "./components/SfGovContentDesignTool";
import { useAppWorkspace } from "./hooks/useAppWorkspace";
import { clean } from "./utils/core";
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

export default function App() {
  const screenshotRef = useRef<HTMLDivElement>(null);
  const handleExportScreenshot = useCallback(async (pageName: string) => {
    if (!screenshotRef.current) return;
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
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
  }, []);

  const {
    workspaceTab,
    pageTypeOptions,
    showFileModeBanner,
    previewUrlText,
    previewSummaryLine,
    libraryRows,
    streamFooterMetaFull,
    streamBarMessage,
    topicError,
    generateLabel,
    generateDisabled,
    activePageType,
    selectedLibraryPageId,
    selected,
    userType,
    topic,
    notes,
    handleWorkspaceTab,
    handleBrowseLibraryClick,
    handleExportClick,
    handlePageTypeChange,
    handlePageGoalChange,
    handleGenerateClick,
    handleLibraryPageSelect,
    handleLibraryPageDelete,
    setUserType,
    setNotes
  } = useAppWorkspace({ onExportPage: handleExportScreenshot });

  return (
    <div className="app-root-sf-studio">
      {showFileModeBanner && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          color: '#856404',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 1000,
          textAlign: 'center'
        }}>
          ⚠️ Running in local file storage mode. Database is offline. Changes will not persist after restart.
        </div>
      )}
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
        showPreviewExportButton={false}
        onExportClick={handleExportClick}
        userType={userType}
        onUserTypeChange={setUserType}
        userTypeOptions={["Resident", "Business Owner", "Contractor", "City Employee"]}
        pageTypeOptions={pageTypeOptions}
        activePageType={activePageType}
        onPageTypeChange={handlePageTypeChange}
        pageGoal={topic}
        onPageGoalChange={handlePageGoalChange}
        pageGoalInvalid={topicError}
        pageGoalErrorText="Add a page goal before generating."
        additionalContext={notes}
        onAdditionalContextChange={setNotes}
        onGenerateClick={handleGenerateClick}
        generateLabel={generateLabel}
        generateDisabled={generateDisabled}
        libraryPages={libraryRows}
        selectedLibraryPageId={selectedLibraryPageId}
        onLibraryPageSelect={handleLibraryPageSelect}
        onLibraryPageDelete={handleLibraryPageDelete}
        previewUrlText={previewUrlText}
        showPreviewChrome={workspaceTab === "generate"}
        previewSummaryLine={workspaceTab === "generate" ? previewSummaryLine : undefined}
        streamMessage={streamBarMessage}
        streamFooterMeta={streamFooterMetaFull}
        onExportPreview={handleExportClick}
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
      <div ref={screenshotRef} style={{ position: "absolute", top: 0, left: -10000, width: 800, pointerEvents: "none", zIndex: -1 }}>
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
