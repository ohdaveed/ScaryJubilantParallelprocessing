import { useState, useCallback, useMemo } from "react";
import { PageDraft, ReviewStatus, UserPreference, VerificationState, PlannedPage, UserType, PageType } from "../types";
import { clean } from "../utils/core";
import { findOverlappingPageIds } from "../utils/search";
import { getVerificationState } from "../utils/viewState";
import { preferencesApi, pagesApi } from "../api";
import { replacePageDraftInRaw } from "../utils/parsing";
import { USER_TYPES } from "../constants";

export interface WorkspaceState {
  search: string;
  filterType: string;
  verificationFilter: VerificationState | "all";
  showOverlapsOnly: boolean;
  sortNewest: boolean;
  selectedPageIds: Set<string>;
  newPref: string;
  mockupEditOpen: boolean;
  draftEditBuffer: string;
  draftEditSaving: boolean;
  draftEditError: string;
  copied: boolean;
  // Generation state
  topic: string;
  userType: UserType;
  notes: string;
  pendingPageType: string; // Keep as string for now to match UI chip usage
  pendingPlannedId: number | null;
  preferences: UserPreference[];
  selected: PageDraft | null;
  refineInput: string;
  topicTouched: boolean;
}

export interface WorkspaceActions {
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setFilterType: React.Dispatch<React.SetStateAction<string>>;
  setVerificationFilter: React.Dispatch<React.SetStateAction<VerificationState | "all">>;
  setShowOverlapsOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setSortNewest: React.Dispatch<React.SetStateAction<boolean>>;
  setNewPref: React.Dispatch<React.SetStateAction<string>>;
  togglePageSelection: (id: string, e: React.MouseEvent) => void;
  selectAllPages: (filteredIds: string[]) => void;
  clearPageSelection: () => void;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
  openMockupEditor: (selected: PageDraft | null, setDraftEditBuffer: (v: string) => void) => void;
  cancelMockupEditor: () => void;
  saveMockupDraft: (selected: PageDraft | null, setPages: React.Dispatch<React.SetStateAction<PageDraft[]>>, setSelected: (p: PageDraft | null) => void) => Promise<void>;
  deleteSelectedPages: (deletePage: (id: string) => Promise<void>) => Promise<void>;
  setMockupEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDraftEditBuffer: React.Dispatch<React.SetStateAction<string>>;
  setDraftEditError: React.Dispatch<React.SetStateAction<string>>;
  setDraftEditSaving: React.Dispatch<React.SetStateAction<boolean>>;
  // Generation actions
  setTopic: React.Dispatch<React.SetStateAction<string>>;
  setUserType: React.Dispatch<React.SetStateAction<UserType>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  setPendingPageType: React.Dispatch<React.SetStateAction<string>>;
  setPendingPlannedId: React.Dispatch<React.SetStateAction<number | null>>;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreference[]>>;
  setSelected: React.Dispatch<React.SetStateAction<PageDraft | null>>;
  setRefineInput: React.Dispatch<React.SetStateAction<string>>;
  setTopicTouched: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWorkspaceState() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState<VerificationState | "all">("all");
  const [showOverlapsOnly, setShowOverlapsOnly] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [newPref, setNewPref] = useState("");
  const [mockupEditOpen, setMockupEditOpen] = useState(false);
  const [draftEditBuffer, setDraftEditBuffer] = useState("");
  const [draftEditSaving, setDraftEditSaving] = useState(false);
  const [draftEditError, setDraftEditError] = useState("");
  const [copied, setCopied] = useState(false);

  // Generation state
  const [topic, setTopic] = useState("");
  const [userType, setUserType] = useState<UserType>(USER_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [pendingPageType, setPendingPageType] = useState("");
  const [pendingPlannedId, setPendingPlannedId] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [selected, setSelected] = useState<PageDraft | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [topicTouched, setTopicTouched] = useState(false);

  const togglePageSelection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllPages = useCallback((filteredIds: string[]) => {
    setSelectedPageIds(new Set(filteredIds));
  }, []);

  const clearPageSelection = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const deleteSelectedPages = useCallback(async (deletePage: (id: string) => Promise<void>) => {
    const ids = Array.from(selectedPageIds);
    await Promise.all(ids.map((id) => deletePage(id)));
    setSelectedPageIds(new Set());
  }, [selectedPageIds]);

  const openMockupEditor = useCallback((
    selected: PageDraft | null,
    setDraftEditBufferFn: (v: string) => void
  ) => {
    if (!selected) return;
    setDraftEditBufferFn(selected.draft);
    setDraftEditError("");
    setMockupEditOpen(true);
  }, []);

  const cancelMockupEditor = useCallback(() => {
    setMockupEditOpen(false);
    setDraftEditBuffer("");
    setDraftEditError("");
  }, []);

  const saveMockupDraft = useCallback(async (
    selected: PageDraft | null,
    setPages: React.Dispatch<React.SetStateAction<PageDraft[]>>,
    setSelectedFn: (p: PageDraft | null) => void
  ) => {
    if (!selected || draftEditSaving) return;
    setDraftEditSaving(true);
    setDraftEditError("");
    try {
      const newRaw = replacePageDraftInRaw(selected.raw, draftEditBuffer);
      const updated: PageDraft = { ...selected, draft: draftEditBuffer, raw: newRaw };
      await pagesApi.save(selected.id, updated, { notes: "Manual draft edit", trigger: "manual" });
      setPages(prev => prev.map(p => p.id === selected.id ? updated : p));
      setSelectedFn(updated);
      setMockupEditOpen(false);
      setDraftEditBuffer("");
    } catch {
      setDraftEditError("Could not save changes. Try again.");
    } finally {
      setDraftEditSaving(false);
    }
  }, [draftEditBuffer, draftEditSaving]);

  const state: WorkspaceState = {
    search,
    filterType,
    verificationFilter,
    showOverlapsOnly,
    sortNewest,
    selectedPageIds,
    newPref,
    mockupEditOpen,
    draftEditBuffer,
    draftEditSaving,
    draftEditError,
    copied,
    topic,
    userType,
    notes,
    pendingPageType,
    pendingPlannedId,
    preferences,
    selected,
    refineInput,
    topicTouched
  };

  const actions: WorkspaceActions = {
    setSearch,
    setFilterType,
    setVerificationFilter,
    setShowOverlapsOnly,
    setSortNewest,
    setNewPref,
    togglePageSelection,
    selectAllPages,
    clearPageSelection,
    setCopied,
    openMockupEditor,
    cancelMockupEditor,
    saveMockupDraft,
    deleteSelectedPages,
    setMockupEditOpen,
    setDraftEditBuffer,
    setDraftEditError,
    setDraftEditSaving,
    setTopic,
    setUserType,
    setNotes,
    setPendingPageType,
    setPendingPlannedId,
    setPreferences,
    setSelected,
    setRefineInput,
    setTopicTouched
  };

  return { state, actions };
}