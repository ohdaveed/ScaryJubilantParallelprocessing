/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { PlannedPage, PageDraft } from "../types";

const makePlanned = (id: number, name: string, parentId: number | null = null): PlannedPage =>
  ({ id, name, pageType: "Information", userType: "General public", parentId, builtPageId: null, createdAt: "2026-01-01T00:00:00Z" });

vi.mock("../constants", () => ({
  SITEMAP_SKELETON: [
    { name: "Root page", pageType: "Topic", userType: "General public", parentName: undefined },
    { name: "Child page", pageType: "Information", userType: "General public", parentName: "Root page" }
  ]
}));

vi.mock("../api/pages", () => ({
  plannedPagesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  pagesApi: {
    save: vi.fn()
  }
}));

vi.mock("../api", () => ({
  plannedPagesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  pagesApi: {
    save: vi.fn()
  }
}));

vi.mock("../utils/contentModel", () => ({
  skeletonToPageDraft: vi.fn((tmpl: any) => ({
    id: `skel_${tmpl.name}`,
    name: tmpl.name,
    inputs: { topic: tmpl.name }
  }) as unknown as PageDraft)
}));

import { plannedPagesApi, pagesApi } from "../api/pages";
import { usePlanMap } from "./usePlanMap";

describe("usePlanMap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads existing planned pages and skips seeding when list is non-empty", async () => {
    const existing = [makePlanned(1, "Root page"), makePlanned(2, "Child page", 1)];
    vi.mocked(plannedPagesApi.list).mockResolvedValue(existing);

    const setPages = vi.fn();
    const { result } = renderHook(() => usePlanMap(setPages));

    await waitFor(() => expect(result.current.plannedLoading).toBe(false));
    expect(result.current.plannedPages).toHaveLength(2);
    expect(plannedPagesApi.create).not.toHaveBeenCalled();
  });

  it("seeds skeleton when the planned pages list is empty", async () => {
    const root = makePlanned(1, "Root page");
    const child = makePlanned(2, "Child page", 1);

    vi.mocked(plannedPagesApi.list)
      .mockResolvedValueOnce([])       // initial empty check
      .mockResolvedValueOnce([root, child]); // after seeding
    vi.mocked(plannedPagesApi.create)
      .mockResolvedValueOnce(root)
      .mockResolvedValueOnce(child);
    vi.mocked(plannedPagesApi.update).mockResolvedValue(root);
    vi.mocked(pagesApi.save).mockResolvedValue(undefined as any);

    const setPages = vi.fn();
    const { result } = renderHook(() => usePlanMap(setPages));

    await waitFor(() => expect(result.current.plannedLoading).toBe(false));
    expect(plannedPagesApi.create).toHaveBeenCalledTimes(2);
    expect(result.current.plannedPages).toHaveLength(2);
  });

  it("sets empty array when initial list fetch fails", async () => {
    vi.mocked(plannedPagesApi.list).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePlanMap(vi.fn()));

    await waitFor(() => expect(result.current.plannedLoading).toBe(false));
    expect(result.current.plannedPages).toHaveLength(0);
  });

  it("linkPlannedPage updates the matching planned page optimistically", async () => {
    const pages = [makePlanned(1, "Root page")];
    vi.mocked(plannedPagesApi.list).mockResolvedValue(pages);
    vi.mocked(plannedPagesApi.update).mockResolvedValue({ ...pages[0], builtPageId: "page_abc" });

    const { result } = renderHook(() => usePlanMap(vi.fn()));
    await waitFor(() => expect(result.current.plannedLoading).toBe(false));

    await act(async () => {
      await result.current.linkPlannedPage(1, "page_abc");
    });

    expect(result.current.plannedPages[0].builtPageId).toBe("page_abc");
  });

  it("linkPlannedPage swallows API errors silently", async () => {
    vi.mocked(plannedPagesApi.list).mockResolvedValue([makePlanned(1, "Root page")]);
    vi.mocked(plannedPagesApi.update).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => usePlanMap(vi.fn()));
    await waitFor(() => expect(result.current.plannedLoading).toBe(false));

    await expect(
      act(async () => { await result.current.linkPlannedPage(1, "page_abc"); })
    ).resolves.not.toThrow();
    expect(result.current.plannedPages[0].builtPageId).toBeNull(); // unchanged
  });

  it("addPlannedPage appends the new page to the list", async () => {
    vi.mocked(plannedPagesApi.list).mockResolvedValue([makePlanned(1, "Root page")]);
    const newPage = makePlanned(2, "New page");
    vi.mocked(plannedPagesApi.create).mockResolvedValue(newPage);

    const { result } = renderHook(() => usePlanMap(vi.fn()));
    await waitFor(() => expect(result.current.plannedLoading).toBe(false));

    await act(async () => {
      await result.current.addPlannedPage("New page", "Information", "General public", null);
    });

    expect(result.current.plannedPages).toHaveLength(2);
    expect(result.current.plannedPages[1].name).toBe("New page");
  });

  it("deletePlannedPage removes the page and re-parents its children", async () => {
    const pages = [makePlanned(1, "Parent"), makePlanned(2, "Child", 1)];
    vi.mocked(plannedPagesApi.list).mockResolvedValue(pages);
    vi.mocked(plannedPagesApi.delete).mockResolvedValue(undefined as any);

    const { result } = renderHook(() => usePlanMap(vi.fn()));
    await waitFor(() => expect(result.current.plannedLoading).toBe(false));

    await act(async () => {
      await result.current.deletePlannedPage(1);
    });

    const remaining = result.current.plannedPages;
    expect(remaining.find((p) => p.id === 1)).toBeUndefined();
    expect(remaining.find((p) => p.id === 2)?.parentId).toBeNull();
  });

  it("deletePlannedPage swallows API errors silently", async () => {
    vi.mocked(plannedPagesApi.list).mockResolvedValue([makePlanned(1, "Root page")]);
    vi.mocked(plannedPagesApi.delete).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => usePlanMap(vi.fn()));
    await waitFor(() => expect(result.current.plannedLoading).toBe(false));

    await expect(
      act(async () => { await result.current.deletePlannedPage(1); })
    ).resolves.not.toThrow();
    // Optimistic removal still happened
    expect(result.current.plannedPages).toHaveLength(0);
  });
});
