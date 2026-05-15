/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkspaceState } from "./useWorkspaceState";
import type { PageDraft } from "../types";

vi.mock("../api/pages", () => ({
  pagesApi: { save: vi.fn() }
}));
vi.mock("../api/preferences", () => ({
  preferencesApi: { create: vi.fn(), list: vi.fn(), delete: vi.fn() }
}));

vi.mock("../utils/parsing", () => ({
  replacePageDraftInRaw: vi.fn((raw: string, draft: string) => `${raw}|${draft}`)
}));

vi.mock("../utils/core", () => ({
  clean: vi.fn((s: string) => s),
}));
vi.mock("../utils/search", () => ({
  findOverlappingPageIds: vi.fn(() => new Set<string>()),
}));
vi.mock("../utils/viewState", () => ({
  getVerificationState: vi.fn(() => "unverified")
}));

import { pagesApi } from "../api/pages";

const makePage = (id: string, draft = "draft text"): PageDraft =>
  ({ id, name: id, raw: "PAGE NAME: " + id, draft, contentHydrated: true }) as unknown as PageDraft;

describe("useWorkspaceState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initializes with sensible defaults", () => {
    const { result } = renderHook(() => useWorkspaceState());
    expect(result.current.state.search).toBe("");
    expect(result.current.state.filterType).toBe("All");
    expect(result.current.state.selectedPageIds.size).toBe(0);
    expect(result.current.state.mockupEditOpen).toBe(false);
  });

  it("togglePageSelection adds then removes the same id", () => {
    const { result } = renderHook(() => useWorkspaceState());
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

    act(() => result.current.actions.togglePageSelection("page_1", fakeEvent));
    expect(result.current.state.selectedPageIds.has("page_1")).toBe(true);

    act(() => result.current.actions.togglePageSelection("page_1", fakeEvent));
    expect(result.current.state.selectedPageIds.has("page_1")).toBe(false);
  });

  it("selectAllPages replaces selection with given ids", () => {
    const { result } = renderHook(() => useWorkspaceState());

    act(() => result.current.actions.selectAllPages(["page_1", "page_2", "page_3"]));
    expect(result.current.state.selectedPageIds.size).toBe(3);
  });

  it("clearPageSelection empties the selection", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => result.current.actions.selectAllPages(["page_1", "page_2"]));
    act(() => result.current.actions.clearPageSelection());
    expect(result.current.state.selectedPageIds.size).toBe(0);
  });

  it("deleteSelectedPages calls deletePage for each selected id and clears selection", async () => {
    const { result } = renderHook(() => useWorkspaceState());
    const deletePage = vi.fn().mockResolvedValue(undefined);

    act(() => result.current.actions.selectAllPages(["page_1", "page_2"]));

    await act(async () => {
      await result.current.actions.deleteSelectedPages(deletePage);
    });

    expect(deletePage).toHaveBeenCalledTimes(2);
    expect(deletePage).toHaveBeenCalledWith("page_1");
    expect(deletePage).toHaveBeenCalledWith("page_2");
    expect(result.current.state.selectedPageIds.size).toBe(0);
  });

  it("openMockupEditor sets buffer and opens editor when a page is selected", () => {
    const { result } = renderHook(() => useWorkspaceState());
    const setBuffer = vi.fn();
    const page = makePage("page_1", "my draft");

    act(() => result.current.actions.openMockupEditor(page, setBuffer));
    expect(setBuffer).toHaveBeenCalledWith("my draft");
    expect(result.current.state.mockupEditOpen).toBe(true);
  });

  it("openMockupEditor does nothing when selected is null", () => {
    const { result } = renderHook(() => useWorkspaceState());
    const setBuffer = vi.fn();

    act(() => result.current.actions.openMockupEditor(null, setBuffer));
    expect(setBuffer).not.toHaveBeenCalled();
    expect(result.current.state.mockupEditOpen).toBe(false);
  });

  it("cancelMockupEditor resets editor state", () => {
    const { result } = renderHook(() => useWorkspaceState());
    act(() => result.current.actions.setMockupEditOpen(true));
    act(() => result.current.actions.setDraftEditBuffer("some text"));

    act(() => result.current.actions.cancelMockupEditor());
    expect(result.current.state.mockupEditOpen).toBe(false);
    expect(result.current.state.draftEditBuffer).toBe("");
    expect(result.current.state.draftEditError).toBe("");
  });

  it("saveMockupDraft saves via API and closes editor on success", async () => {
    vi.mocked(pagesApi.save).mockResolvedValue(undefined as any);
    const { result } = renderHook(() => useWorkspaceState());
    const page = makePage("page_1", "old draft");
    const setPages = vi.fn();
    const setSelected = vi.fn();

    act(() => result.current.actions.setDraftEditBuffer("new draft"));

    await act(async () => {
      await result.current.actions.saveMockupDraft(page, setPages, setSelected);
    });

    expect(pagesApi.save).toHaveBeenCalledWith("page_1", expect.objectContaining({ draft: "new draft" }), expect.any(Object));
    expect(result.current.state.mockupEditOpen).toBe(false);
    expect(result.current.state.draftEditBuffer).toBe("");
  });

  it("saveMockupDraft sets error message on API failure", async () => {
    vi.mocked(pagesApi.save).mockRejectedValue(new Error("Server error"));
    const { result } = renderHook(() => useWorkspaceState());
    const page = makePage("page_1");
    
    act(() => result.current.actions.openMockupEditor(page, (v) => result.current.actions.setDraftEditBuffer(v)));
    act(() => result.current.actions.setDraftEditBuffer("edited"));

    await act(async () => {
      await result.current.actions.saveMockupDraft(page, vi.fn(), vi.fn());
    });

    expect(result.current.state.draftEditError).toBe("Could not save changes. Try again.");
    expect(result.current.state.mockupEditOpen).toBe(true);
  });

  it("saveMockupDraft is a no-op when selected is null", async () => {
    const { result } = renderHook(() => useWorkspaceState());
    await act(async () => {
      await result.current.actions.saveMockupDraft(null, vi.fn(), vi.fn());
    });
    expect(pagesApi.save).not.toHaveBeenCalled();
  });
});
