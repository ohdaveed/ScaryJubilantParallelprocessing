import React, { createContext, useContext, useCallback, useEffect, useRef, useMemo, Dispatch, SetStateAction } from "react";
import type { IANode, PageConcept, PageDraft, PlannedPage, ReferenceExample, TodoItem, UserPreference, UserType } from "../types";
import { usePagesData } from "../hooks/usePagesData";
import { usePlanMap } from "../hooks/usePlanMap";
import { usePageGeneration } from "../hooks/usePageGeneration";
import { useVersionHistory } from "../hooks/useVersionHistory";
import { useWorkspaceState, WorkspaceState, WorkspaceActions } from "../hooks/useWorkspaceState";
import { preferencesApi } from "../api";
import { useProjectModel } from "../hooks/useProjectModel";
import { clean } from "../utils/core";

export interface WorkspaceContextValue {
  pages: PageDraft[];
  setPages: React.Dispatch<React.SetStateAction<PageDraft[]>>;
  pagesLoading: boolean;
  hydratePage: (id: string) => Promise<PageDraft | null>;
  deletePage: (id: string) => Promise<void>;
  plannedPages: PlannedPage[];
  plannedLoading: boolean;
  selectedPlanned: PlannedPage | null;
  setSelectedPlanned: React.Dispatch<React.SetStateAction<PlannedPage | null>>;
  mapMode: "plan" | "view";
  setMapMode: React.Dispatch<React.SetStateAction<"plan" | "view">>;
  pendingPlannedId: number | null;
  setPendingPlannedId: (id: number | null) => void;
  pendingPageType: string;
  setPendingPageType: (pt: string) => void;
  seeding: boolean;
  addPlannedPage: (name: string, pageType: string, userType: string, parentId: number | null) => Promise<void>;
  deletePlannedPage: (id: number) => Promise<void>;
  linkPlannedPage: (plannedId: number, pageId: string | null) => void;
  loading: boolean;
  streaming: boolean;
  evaluating: boolean;
  showSuccess: boolean;
  setShowSuccess: (v: boolean) => void;
  streamText: string;
  progress: number;
  progressLabel: string;
  karlStatus: string;
  error: string | null;
  parseWarn: boolean;
  justGenerated: PageDraft | null;
  generate: (opts: {
    topic?: string;
    userType?: string;
    notes?: string;
    quiet?: boolean;
    plannedId?: number;
    pageType?: string;
    replaceSkeletonId?: string;
  }) => Promise<PageDraft | null>;
  regenerate: (page: PageDraft) => void;
  refine: () => Promise<void>;
  topic: string;
  userType: UserType;
  notes: string;
  selected: PageDraft | null;
  topicTouched: boolean;
  refineInput: string;
  preferences: UserPreference[];
  setPreferences: React.Dispatch<React.SetStateAction<UserPreference[]>>;
  setSelected: (p: PageDraft | null) => void;
  setTopic: (v: string) => void;
  setUserType: (v: UserType) => void;
  setNotes: (v: string) => void;
  setTopicTouched: (v: boolean) => void;
  setRefineInput: (v: string) => void;
  historyPageId: string | null;
  setHistoryPageId: (id: string | null) => void;
  historyVersions: any[];
  historyLoading: boolean;
  openHistory: (pageId: string) => Promise<void>;
  restoreVersion: (pageId: string, versionId: number, versionNumber: number) => Promise<void>;
  wsState: WorkspaceState;
  wsActions: WorkspaceActions;
  openPageById: (id: string) => Promise<void>;
  concepts: PageConcept[];
  nodes: IANode[];
  references: ReferenceExample[];
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { pages, setPages, pagesLoading, hydratePage: rawHydrate, deletePage: deleteStoredPage } = usePagesData();
  const { concepts, nodes, references, refreshModel } = useProjectModel();
  const {
    plannedPages,
    plannedLoading,
    selectedPlanned,
    setSelectedPlanned,
    mapMode,
    setMapMode,
    pendingPlannedId,
    setPendingPlannedId,
    pendingPageType,
    setPendingPageType,
    seeding,
    linkPlannedPage,
    addPlannedPage,
    deletePlannedPage
  } = usePlanMap(setPages);

  const { state: wsState, actions: wsActions } = useWorkspaceState();

  const {
    loading,
    streaming,
    evaluating,
    showSuccess,
    setShowSuccess,
    streamText,
    progress,
    progressLabel,
    karlStatus,
    error,
    parseWarn,
    justGenerated,
    generate,
    regenerate,
    refine
  } = usePageGeneration({
    pages,
    setPages,
    plannedPages,
    linkPlannedPage,
    state: {
      topic: wsState.topic,
      userType: wsState.userType,
      notes: wsState.notes,
      pendingPageType: wsState.pendingPageType,
      pendingPlannedId: wsState.pendingPlannedId,
      preferences: wsState.preferences,
      selected: wsState.selected,
      refineInput: wsState.refineInput,
      topicTouched: wsState.topicTouched
    },
    actions: {
      setTopic: wsActions.setTopic,
      setNotes: wsActions.setNotes,
      setTopicTouched: wsActions.setTopicTouched,
      setPendingPlannedId: wsActions.setPendingPlannedId,
      setPendingPageType: wsActions.setPendingPageType,
      setSelected: wsActions.setSelected,
      setRefineInput: wsActions.setRefineInput,
      setPreferences: wsActions.setPreferences
    }
  });

  const {
    historyPageId,
    setHistoryPageId,
    historyVersions,
    historyLoading,
    openHistory,
    restoreVersion: restoreVersionFromHistory
  } = useVersionHistory();

  const { topic, userType, notes, selected, topicTouched, refineInput, preferences } = wsState;
  const { setSelected, setTopic, setUserType, setNotes, setTopicTouched, setRefineInput, setPreferences } = wsActions;

  useEffect(() => {
    setPreferences([]);
    if (!selected) return;
    preferencesApi.list(selected.id)
      .then(prefs => setPreferences(prefs))
      .catch(() => {});
  }, [selected?.id]);

  useEffect(() => {
    void refreshModel().catch(() => {});
  }, [pages, plannedPages, refreshModel]);

  const deletePage = useCallback(async (id: string) => {
    await deleteStoredPage(id);
    if (selected?.id === id) setSelected(null);
  }, [deleteStoredPage, selected]);

  const hydratePage = useCallback(async (id: string) => {
    return rawHydrate(id);
  }, [rawHydrate]);

  const restoreVersion = useCallback(async (pageId: string, versionId: number, versionNumber: number) => {
    await restoreVersionFromHistory(pageId, versionId, versionNumber, (restoredData: PageDraft) => {
      setPages(prev => prev.map(p => p.id === pageId ? restoredData : p));
      if (selected?.id === pageId) setSelected(restoredData);
    });
  }, [restoreVersionFromHistory, setPages, selected]);

  useEffect(() => {
    wsActions.setMockupEditOpen(false);
    wsActions.setDraftEditBuffer("");
    wsActions.setDraftEditError("");
  }, [selected?.id]);

  const openPageById = useCallback(async (id: string) => {
    const full = await rawHydrate(id).catch(() => null);
    if (!full) return;
    setSelected(full);
    setShowSuccess(false);
    // Keep the Generate rail in sync with the active page so authors don't
    // accidentally generate/refine using stale context from a previous selection.
    setTopic(full.inputs?.topic ?? clean(full.name) ?? "");
    setUserType((full.inputs?.userType ?? full.userType ?? "") as any);
    setNotes(full.inputs?.notes ?? "");
    setPendingPageType(clean(full.pageType) ?? "");
    setPendingPlannedId(null);
    setTopicTouched(false);
  }, [
    rawHydrate,
    setSelected,
    setShowSuccess,
    setTopic,
    setUserType,
    setNotes,
    setPendingPageType,
    setPendingPlannedId,
    setTopicTouched
  ]);

  const generateForQueue = useCallback(
    async (todo: TodoItem) => {
      const planned =
        todo.plannedId != null ? plannedPages.find((p) => p.id === todo.plannedId) : undefined;
      return generate({
        topic: todo.topic,
        userType: todo.userType,
        quiet: true,
        ...(planned ? { pageType: planned.pageType, plannedId: planned.id } : {})
      });
    },
    [generate, plannedPages]
  );

  const value: WorkspaceContextValue = {
    pages, setPages, pagesLoading, hydratePage, deletePage,
    plannedPages, plannedLoading, selectedPlanned, setSelectedPlanned,
    mapMode, setMapMode, pendingPlannedId, setPendingPlannedId,
    pendingPageType, setPendingPageType, seeding,
    addPlannedPage, deletePlannedPage, linkPlannedPage,
    loading, streaming, evaluating, showSuccess, setShowSuccess,
    streamText, progress, progressLabel, karlStatus, error, parseWarn,
    justGenerated, generate, regenerate, refine,
    topic, userType, notes, selected, topicTouched, refineInput,
    preferences, setPreferences,
    setSelected,
    setTopic,
    setUserType,
    setNotes,
    setTopicTouched,
    setRefineInput,
    historyPageId, setHistoryPageId, historyVersions, historyLoading,
    openHistory, restoreVersion,
    wsState, wsActions,
    openPageById,
    concepts, nodes, references
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}
