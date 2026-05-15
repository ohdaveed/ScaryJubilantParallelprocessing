/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePagesData } from "./usePagesData";
import type { PageDraft } from "../types";

const mockPage = (id: string, name = "Test Page"): PageDraft =>
  ({ id, name, raw: `PAGE NAME: ${name}`, contentHydrated: false }) as unknown as PageDraft;

vi.mock("../api", () => ({
  pagesApi: {
    list: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    delete: vi.fn()
  },
  todosApi: {
    create: vi.fn()
  }
}));

vi.mock("../utils/core", () => ({
  lsLegacy: {
    listPageKeys: vi.fn().mockReturnValue([]),
    getPage: vi.fn(),
    removePage: vi.fn(),
    getTodos: vi.fn().mockReturnValue(null),
    removeTodos: vi.fn()
  }
}));

import { pagesApi } from "../api";
import { lsLegacy } from "../utils/core";

describe("usePagesData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lsLegacy.listPageKeys).mockReturnValue([]);
    vi.mocked(lsLegacy.getTodos).mockReturnValue(null);
  });

  it("loads pages from the API on mount", async () => {
    const pages = [mockPage("page_1", "Alpha"), mockPage("page_2", "Beta")];
    vi.mocked(pagesApi.list).mockResolvedValue(pages);

    const { result } = renderHook(() => usePagesData());

    await waitFor(() => expect(result.current.pagesLoading).toBe(false));
    expect(result.current.pages).toHaveLength(2);
    expect(result.current.pages[0].id).toBe("page_1");
  });

  it("deduplicates pages by id when migrating legacy localStorage entries", async () => {
    const dbPage = mockPage("page_abc");
    vi.mocked(pagesApi.list).mockResolvedValue([dbPage]);
    vi.mocked(lsLegacy.listPageKeys).mockReturnValue(["hhvc:abc"]);
    vi.mocked(lsLegacy.getPage).mockReturnValue(JSON.stringify({ id: "hhvc:abc", name: "Legacy" }));
    vi.mocked(pagesApi.save).mockResolvedValue(undefined as any);

    const { result } = renderHook(() => usePagesData());

    await waitFor(() => expect(result.current.pagesLoading).toBe(false));
    // Dedup: DB entry and migrated entry share the same id (page_abc) — only one survives
    expect(result.current.pages.filter((p) => p.id === "page_abc")).toHaveLength(1);
  });

  it("refreshPages replaces the page list", async () => {
    vi.mocked(pagesApi.list)
      .mockResolvedValueOnce([mockPage("page_1")])
      .mockResolvedValueOnce([mockPage("page_1"), mockPage("page_2")]);

    const { result } = renderHook(() => usePagesData());
    await waitFor(() => expect(result.current.pagesLoading).toBe(false));
    expect(result.current.pages).toHaveLength(1);

    await act(async () => {
      await result.current.refreshPages();
    });
    expect(result.current.pages).toHaveLength(2);
  });

  it("hydratePage returns cached page if already hydrated", async () => {
    const hydrated = { ...mockPage("page_1"), contentHydrated: true, raw: "PAGE NAME: Cached" };
    vi.mocked(pagesApi.list).mockResolvedValue([hydrated as unknown as PageDraft]);

    const { result } = renderHook(() => usePagesData());
    await waitFor(() => expect(result.current.pagesLoading).toBe(false));

    const page = await act(async () => result.current.hydratePage("page_1"));
    expect(pagesApi.get).not.toHaveBeenCalled();
    expect(page?.id).toBe("page_1");
  });

  it("hydratePage fetches from API when not yet hydrated", async () => {
    const stub = mockPage("page_1");
    const full = { ...stub, contentHydrated: true, raw: "PAGE NAME: Full" } as unknown as PageDraft;
    vi.mocked(pagesApi.list).mockResolvedValue([stub]);
    vi.mocked(pagesApi.get).mockResolvedValue(full);

    const { result } = renderHook(() => usePagesData());
    await waitFor(() => expect(result.current.pagesLoading).toBe(false));

    await act(async () => {
      await result.current.hydratePage("page_1");
    });

    expect(pagesApi.get).toHaveBeenCalledWith("page_1");
    expect(result.current.pages[0].raw).toBe("PAGE NAME: Full");
  });

  it("hydratePage removes page from list on 404", async () => {
    vi.mocked(pagesApi.list).mockResolvedValue([mockPage("page_1")]);
    vi.mocked(pagesApi.get).mockRejectedValue({ httpStatus: 404 });

    const { result } = renderHook(() => usePagesData());
    await waitFor(() => expect(result.current.pagesLoading).toBe(false));
    expect(result.current.pages).toHaveLength(1);

    await act(async () => {
      await result.current.hydratePage("page_1");
    });

    expect(result.current.pages).toHaveLength(0);
  });

  it("deletePage removes the page optimistically", async () => {
    vi.mocked(pagesApi.list).mockResolvedValue([mockPage("page_1"), mockPage("page_2")]);
    vi.mocked(pagesApi.delete).mockResolvedValue(undefined as any);

    const { result } = renderHook(() => usePagesData());
    await waitFor(() => expect(result.current.pagesLoading).toBe(false));

    await act(async () => {
      await result.current.deletePage("page_1");
    });

    expect(result.current.pages).toHaveLength(1);
    expect(result.current.pages[0].id).toBe("page_2");
    expect(pagesApi.delete).toHaveBeenCalledWith("page_1");
  });
});
