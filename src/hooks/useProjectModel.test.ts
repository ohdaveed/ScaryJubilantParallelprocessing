/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProjectModel } from "./useProjectModel";

vi.mock("../api", () => ({
  projectModelApi: {
    load: vi.fn()
  }
}));

import { projectModelApi } from "../api";

const emptyModel = { concepts: [], nodes: [], artifacts: [], variants: [], references: [], queue: [] };

describe("useProjectModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts loading and resolves the model on mount", async () => {
    vi.mocked(projectModelApi.load).mockResolvedValue(emptyModel);

    const { result } = renderHook(() => useProjectModel());

    expect(result.current.modelLoading).toBe(true);

    await waitFor(() => expect(result.current.modelLoading).toBe(false));
    expect(result.current.concepts).toEqual([]);
    expect(result.current.nodes).toEqual([]);
  });

  it("exposes populated model data after load", async () => {
    const concept = { id: 1, canonicalTitle: "Test Concept" } as any;
    vi.mocked(projectModelApi.load).mockResolvedValue({ ...emptyModel, concepts: [concept] });

    const { result } = renderHook(() => useProjectModel());

    await waitFor(() => expect(result.current.modelLoading).toBe(false));
    expect(result.current.concepts).toHaveLength(1);
    expect(result.current.concepts[0].canonicalTitle).toBe("Test Concept");
  });

  it("falls back to empty state on load failure", async () => {
    vi.mocked(projectModelApi.load).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useProjectModel());

    await waitFor(() => expect(result.current.modelLoading).toBe(false));
    expect(result.current.concepts).toEqual([]);
  });

  it("refreshModel re-fetches and updates state", async () => {
    const concept = { id: 2, canonicalTitle: "Refreshed" } as any;
    vi.mocked(projectModelApi.load)
      .mockResolvedValueOnce(emptyModel)
      .mockResolvedValueOnce({ ...emptyModel, concepts: [concept] });

    const { result } = renderHook(() => useProjectModel());
    await waitFor(() => expect(result.current.modelLoading).toBe(false));
    expect(result.current.concepts).toHaveLength(0);

    await act(async () => {
      await result.current.refreshModel();
    });

    expect(result.current.concepts).toHaveLength(1);
    expect(result.current.concepts[0].canonicalTitle).toBe("Refreshed");
  });
});
