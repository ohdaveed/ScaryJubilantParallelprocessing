/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVersionHistory } from "./useVersionHistory";
import type { PageVersion } from "../types";

const makeVersion = (id: number, versionNumber: number): PageVersion =>
  ({ id, versionNumber, pageId: "page_1", trigger: "manual", createdAt: "2026-01-01T00:00:00Z" }) as PageVersion;

vi.mock("../api", () => ({
  versionsApi: {
    list: vi.fn(),
    restore: vi.fn()
  }
}));

import { versionsApi } from "../api";

describe("useVersionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no history open", () => {
    const { result } = renderHook(() => useVersionHistory());
    expect(result.current.historyPageId).toBeNull();
    expect(result.current.historyVersions).toHaveLength(0);
    expect(result.current.historyLoading).toBe(false);
  });

  it("openHistory fetches versions and sets historyPageId", async () => {
    const versions = [makeVersion(1, 1), makeVersion(2, 2)];
    vi.mocked(versionsApi.list).mockResolvedValue(versions);

    const { result } = renderHook(() => useVersionHistory());

    await act(async () => {
      await result.current.openHistory("page_1");
    });

    expect(versionsApi.list).toHaveBeenCalledWith("page_1");
    expect(result.current.historyPageId).toBe("page_1");
    expect(result.current.historyVersions).toHaveLength(2);
    expect(result.current.historyLoading).toBe(false);
  });

  it("openHistory sets empty array on API failure", async () => {
    vi.mocked(versionsApi.list).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useVersionHistory());

    await act(async () => {
      await result.current.openHistory("page_1");
    });

    expect(result.current.historyVersions).toHaveLength(0);
    expect(result.current.historyLoading).toBe(false);
  });

  it("openHistory ignores stale responses from older requests", async () => {
    let resolveFirst: (versions: PageVersion[]) => void = () => {};
    vi.mocked(versionsApi.list)
      .mockImplementationOnce(() => new Promise<PageVersion[]>((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce([makeVersion(2, 1)]);

    const { result } = renderHook(() => useVersionHistory());

    let firstRequest: Promise<void>;
    await act(async () => {
      firstRequest = result.current.openHistory("page_1");
    });

    await act(async () => {
      await result.current.openHistory("page_2");
    });

    await act(async () => {
      resolveFirst([makeVersion(1, 1)]);
      await firstRequest;
    });

    expect(result.current.historyPageId).toBe("page_2");
    expect(result.current.historyVersions[0].id).toBe(2);
  });

  it("restoreVersion calls onRestored and closes history when confirmed", async () => {
    const restoredDraft = { id: "page_1", name: "Restored" } as any;
    vi.mocked(versionsApi.restore).mockResolvedValue(restoredDraft);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const onRestored = vi.fn();
    const { result } = renderHook(() => useVersionHistory());

    await act(async () => {
      await result.current.restoreVersion("page_1", 42, 3, onRestored);
    });

    expect(versionsApi.restore).toHaveBeenCalledWith("page_1", 42);
    expect(onRestored).toHaveBeenCalledWith(restoredDraft);
    expect(result.current.historyPageId).toBeNull();
  });

  it("restoreVersion does nothing when user cancels the confirm dialog", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onRestored = vi.fn();
    const { result } = renderHook(() => useVersionHistory());

    await act(async () => {
      await result.current.restoreVersion("page_1", 42, 3, onRestored);
    });

    expect(versionsApi.restore).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
  });

  it("setHistoryPageId can clear the panel directly", () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.setHistoryPageId("page_1");
    });
    expect(result.current.historyPageId).toBe("page_1");

    act(() => {
      result.current.setHistoryPageId(null);
    });
    expect(result.current.historyPageId).toBeNull();
  });
});
