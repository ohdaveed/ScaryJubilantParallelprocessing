import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import packageJson from "../../package.json";
import { useWorkspace } from "../context/WorkspaceContext";
import { clean } from "../utils/core";

type WorkspaceTab = "plan" | "generate" | "library" | "ideal";

const WORKSPACE_TABS: readonly WorkspaceTab[] = ["plan", "generate", "library", "ideal"];

const PAGE_TYPE_CHIPS = [
  "Transaction",
  "Information",
  "Topic",
  "Step by step",
  "Location",
  "Resource Collection",
  "Campaign"
] as const;

function getWorkspaceTab(pathname: string): WorkspaceTab {
  const pathTab = pathname.replace(/^\//, "") as WorkspaceTab;
  return WORKSPACE_TABS.includes(pathTab) ? pathTab : "library";
}

function getPageTypeOptions(): string[] {
  return PAGE_TYPE_CHIPS.filter((pageType) => PAGE_TYPE_CHIPS.includes(pageType));
}

export interface UseAppWorkspaceParams {
  onExportPage: (pageName: string) => void | Promise<void>;
}

export function useAppWorkspace({ onExportPage }: UseAppWorkspaceParams) {
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = useWorkspace();

  const {
    pages,
    selected,
    topic,
    justGenerated,
    karlStatus,
    pendingPageType,
    pendingPlannedId,
    setPendingPageType,
    setPendingPlannedId,
    setTopic,
    setTopicTouched,
    userType,
    setUserType,
    setSelected,
    generate,
    loading,
    streaming,
    evaluating,
    error,
    progressLabel,
    topicTouched,
    notes,
    setNotes,
    openPageById,
    deletePage
  } = ctx;

  const [dbMode, setDbMode] = useState<"postgres" | "file" | "unknown">("unknown");

  useEffect(() => {
    let isMounted = true;
    const fetchDbMode = async () => {
      try {
        const response = await fetch("/api/system/db-mode");
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted) setDbMode(data.mode || "unknown");
      } catch (fetchError) {
        console.debug("Failed to fetch db mode:", fetchError);
      }
    };

    void fetchDbMode();
    return () => {
      isMounted = false;
    };
  }, []);

  const workspaceTab = getWorkspaceTab(location.pathname);
  const pageTypeOptions = useMemo(() => getPageTypeOptions(), []);

  const handleWorkspaceTab = useCallback(
    (id: string) => {
      navigate(`/${id}`);
    },
    [navigate]
  );

  const handleBrowseLibraryClick = useCallback(() => {
    navigate("/library");
  }, [navigate]);

  const handleExportClick = useCallback(() => {
    if (selected) void onExportPage(selected.name);
  }, [onExportPage, selected]);

  const handlePageTypeChange = useCallback(
    (pageType: string) => {
      setPendingPageType(pageType);
      setPendingPlannedId(null);
    },
    [setPendingPageType, setPendingPlannedId]
  );

  const handlePageGoalChange = useCallback(
    (value: string) => {
      setTopic(value);
      setTopicTouched(true);
    },
    [setTopic, setTopicTouched]
  );

  const handleGenerateClick = useCallback(() => {
    setTopicTouched(true);
    if (!topic.trim()) return;
    void generate({ pageType: pendingPageType || pageTypeOptions[0] });
  }, [generate, pendingPageType, pageTypeOptions, setTopicTouched, topic]);

  const handleLibraryPageSelect = useCallback(
    (id: string) => {
      void (async () => {
        await openPageById(id);
        navigate("/generate");
      })();
    },
    [navigate, openPageById]
  );

  const handleLibraryPageDelete = useCallback(
    (id: string) => {
      void deletePage(id);
    },
    [deletePage]
  );

  const previewUrlText = useMemo(() => {
    const base = (clean(selected?.name) || topic || "preview").toLowerCase().replace(/\s+/g, "-").slice(0, 48);
    return `sf.gov / hhvc / ${base || "preview"}`;
  }, [selected?.name, topic]);

  const previewSummaryLine = useMemo(() => {
    const max = 72;
    if (selected) {
      const pageType = clean(selected.pageType) || pendingPageType || pageTypeOptions[0] || "Transaction";
      const name = clean(selected.name) || "Untitled";
      const display = name.length > max ? `${name.slice(0, max)}…` : name;
      const evaluation = selected.karlEvaluation;
      if (evaluation) return `${pageType} · ${display} · Grade ${evaluation.grade} · ${evaluation.score}/100`;
      return `${pageType} · ${display}`;
    }

    const pageType = pendingPageType || pageTypeOptions[0] || "Transaction";
    const goal = topic.trim();
    if (!goal) return `${pageType} · Add a page goal in the left panel`;
    const truncated = goal.length > max ? `${goal.slice(0, max)}…` : goal;
    return `${pageType} · ${truncated} · No canonical concept linked yet`;
  }, [pageTypeOptions, pendingPageType, selected, topic]);

  const libraryRows = useMemo(
    () =>
      pages.map((page) => ({
        id: page.id,
        title: clean(page.name) || "Untitled",
        pageType: clean(page.pageType) || "Transaction",
        gradeLetter: page.karlEvaluation?.grade?.trim().charAt(0)
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

  const streamFooterMetaFull = useMemo(() => `${contentChecksFooter} · v${packageJson.version}`, [contentChecksFooter]);

  const streamBarMessage = useMemo(() => {
    if (streaming) return progressLabel || "Generating…";
    if (evaluating) return "Evaluating against Karl standards…";
    if (error) return error;
    if (selected) {
      const name = clean(selected.name) || "Untitled";
      const grade = selected.karlEvaluation?.grade;
      const score = selected.karlEvaluation?.score;
      if (grade !== undefined && score !== undefined) return `Last opened: ${name} · Karl grade ${grade} · ${score}/100`;
      return `Last opened: ${name}`;
    }
    if (justGenerated) {
      const name = clean(justGenerated.name) || "Untitled";
      const grade = justGenerated.karlEvaluation?.grade;
      const score = justGenerated.karlEvaluation?.score;
      if (grade !== undefined && score !== undefined) return `Last generated: ${name} · Karl grade ${grade} · ${score}/100`;
      return `Last generated: ${name}`;
    }
    return "Ready — use the left panel to generate a new draft or open Library to continue";
  }, [evaluating, error, justGenerated, progressLabel, selected, streaming]);

  const topicError = topicTouched && !topic.trim();
  const generateLabel = loading ? (streaming ? "Generating…" : evaluating ? "Evaluating…" : "Working…") : "Generate page";

  return {
    workspaceTab,
    pageTypeOptions,
    dbMode,
    showFileModeBanner: dbMode === "file",
    previewUrlText,
    previewSummaryLine,
    libraryRows,
    streamFooterMetaFull,
    streamBarMessage,
    topicError,
    generateLabel,
    generateDisabled: loading,
    activePageType: pendingPageType || pageTypeOptions[0] || "Transaction",
    selectedLibraryPageId: selected?.id ?? null,
    selected,
    userType,
    topic,
    notes,
    pendingPageType,
    handleWorkspaceTab,
    handleBrowseLibraryClick,
    handleExportClick,
    handlePageTypeChange,
    handlePageGoalChange,
    handleGenerateClick,
    handleLibraryPageSelect,
    handleLibraryPageDelete,
    setUserType,
    setNotes,
    setSelected
  };
}