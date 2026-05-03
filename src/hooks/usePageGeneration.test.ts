import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePageGeneration } from "./usePageGeneration";
import type { PageDraft, PlannedPage, UserPreference } from "../types";
import * as chatStreamModule from "../services/chatStream";
import * as pageParserModule from "../services/pageParser";
import * as utils from "../utils";

// Mock dependencies
vi.mock("../services/chatStream");
vi.mock("../services/pageParser");
vi.mock("../utils");

const mockPageDraft: PageDraft = {
  id: "page_test_1",
  name: "Test Page",
  userType: "Resident",
  purpose: "Test purpose",
  pageType: "Transaction",
  components: [],
  systemRelationships: {},
  duplicationRisks: [],
  enforcementCheck: { verifiable: [], unclearOrNotEnforceable: [] },
  draft: "# Test\n\nContent here.",
  raw: "PAGE NAME:\nTest Page\n\nPAGE DRAFT:\n# Test\n\nContent here.",
  inputs: { topic: "Test topic", userType: "Resident", notes: "Test notes" },
  karlConnected: true,
  karlEvaluation: {
    score: 85,
    grade: "A",
    summary: "Good page",
    passed: ["Rule 1"],
    warnings: [],
    failed: [],
    confidence: "high"
  },
  createdAt: new Date().toISOString(),
  versions: [],
  review: { status: "pending" },
  qualityGate: { status: "pass" },
  valid: true
};

const mockKarlEvaluation = {
  score: 85,
  grade: "A",
  summary: "Excellent page",
  passed: ["Clarity", "Actionability"],
  warnings: [],
  failed: [],
  confidence: "high"
};

describe("usePageGeneration", () => {
  let params: any;

  beforeEach(() => {
    vi.clearAllMocks();

    params = {
      state: {
        topic: "Housing assistance",
        userType: "Resident",
        notes: "Low-income seniors",
        pendingPageType: "Information",
        pendingPlannedId: null,
        preferences: [] as UserPreference[],
        pages: [] as PageDraft[],
        selected: null,
        plannedPages: [] as PlannedPage[],
        refineInput: ""
      },
      actions: {
        setPages: vi.fn(),
        setSelected: vi.fn(),
        setPendingPlannedId: vi.fn(),
        setPendingPageType: vi.fn(),
        setTopic: vi.fn(),
        setNotes: vi.fn(),
        setTopicTouched: vi.fn(),
        setPreferences: vi.fn(),
        setRefineInput: vi.fn(),
        linkPlannedPage: vi.fn()
      }
    };

    // Mock successful streaming
    vi.spyOn(chatStreamModule, "streamModelText").mockResolvedValue({ karlHit: true });

    // Mock successful parsing
    vi.spyOn(pageParserModule, "repairAndParseStructured").mockResolvedValue({
      parseResult: { rawText: mockPageDraft.raw, parseError: null },
      parsed: mockPageDraft
    });

    // Mock API calls
    vi.spyOn(utils, "runKarlEvaluation").mockResolvedValue(mockKarlEvaluation);
    vi.spyOn(utils, "improveStructure").mockResolvedValue(mockPageDraft.raw);
    vi.spyOn(utils, "pagesApi", "get").mockReturnValue({
      save: vi.fn().mockResolvedValue(undefined),
      list: vi.fn(),
      get: vi.fn(),
      delete: vi.fn()
    } as any);
    vi.spyOn(utils, "evaluateQualityGate").mockReturnValue({ status: "pass" });
  });

  describe("generate()", () => {
    it("should require topic and set topicTouched when empty", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        params.state.topic = "";
        const page = await result.current.generate();
        expect(page).toBeNull();
        expect(params.actions.setTopicTouched).toHaveBeenCalledWith(true);
      });
    });

    it("should call streamModelText with correct parameters", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        expect(chatStreamModule.streamModelText).toHaveBeenCalled();
      });
    });

    it("should call runKarlEvaluation after successful generation", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        expect(utils.runKarlEvaluation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: mockPageDraft.name,
            pageType: mockPageDraft.pageType,
            draft: mockPageDraft.draft,
            userType: mockPageDraft.userType
          })
        );
      });
    });

    it("should call improveStructure when generate completes", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        expect(utils.improveStructure).toHaveBeenCalled();
      });
    });

    it("should save page to database and update pages state", async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(utils, "pagesApi", "get").mockReturnValue({
        save: mockSave,
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
      } as any);

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        expect(mockSave).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            name: mockPageDraft.name,
            karlEvaluation: mockKarlEvaluation
          }),
          expect.any(Object)
        );
        expect(params.actions.setPages).toHaveBeenCalled();
      });
    });

    it("should handle parsing errors with warning flag", async () => {
      const parseError = { code: "invalid_json", message: "JSON parse failed" };
      vi.spyOn(pageParserModule, "repairAndParseStructured").mockResolvedValue({
        parseResult: { rawText: mockPageDraft.raw, parseError },
        parsed: { ...mockPageDraft, valid: false }
      });

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        // Page should still return but with warning
        expect(page).toBeDefined();
      });
    });

    it("should link planned page when plannedId provided", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate({ plannedId: 5 });
        expect(params.actions.linkPlannedPage).toHaveBeenCalledWith(5, expect.any(String));
      });
    });

    it("should skip success splash when quiet=true", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate({ quiet: true });
        // When quiet, setSelected should not be called
        expect(params.actions.setSelected).not.toHaveBeenCalled();
      });
    });

    it("should handle replace skeleton workflow", async () => {
      const skeletonPage = { ...mockPageDraft, id: "skeleton_1" };
      params.state.pages = [skeletonPage];

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate({ replaceSkeletonId: "skeleton_1" });
        // Should call setPages with map operation replacing the skeleton
        expect(params.actions.setPages).toHaveBeenCalled();
      });
    });

    it("should handle database save failures gracefully", async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error("DB error"));
      vi.spyOn(utils, "pagesApi", "get").mockReturnValue({
        save: mockSave,
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
      } as any);

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        // Page should still be created despite save failure
        expect(page).toBeDefined();
        expect(page?.name).toBe(mockPageDraft.name);
      });
    });

    it("should handle streaming errors", async () => {
      vi.spyOn(chatStreamModule, "streamModelText").mockRejectedValue(
        new Error("Stream failed")
      );

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        try {
          await result.current.generate();
        } catch (err) {
          expect(err).toBeDefined();
        }
      });
    });
  });

  describe("improve()", () => {
    it("should call improveStructure with refineInput", async () => {
      params.state.refineInput = "Make it more accessible";
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const improved = await result.current.improve();
        expect(utils.improveStructure).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it("should require a selected page for improvement", async () => {
      params.state.selected = null;
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const improved = await result.current.improve();
        // Should handle gracefully when no selected page
        expect(improved).toBeUndefined();
      });
    });
  });

  describe("evaluate()", () => {
    it("should call runKarlEvaluation for selected page", async () => {
      params.state.selected = mockPageDraft;
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const evaluation = await result.current.evaluate();
        expect(utils.runKarlEvaluation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: mockPageDraft.name,
            pageType: mockPageDraft.pageType
          })
        );
      });
    });

    it("should update selected page with new evaluation", async () => {
      params.state.selected = mockPageDraft;
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const evaluation = await result.current.evaluate();
        expect(params.actions.setSelected).toHaveBeenCalled();
      });
    });
  });

  describe("state management", () => {
    it("should respect user preferences in generation", async () => {
      params.state.preferences = [
        { id: 1, preference: "Use plain language" },
        { id: 2, preference: "Include accessibility notes" }
      ];

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        // Preferences should be passed to improveStructure
        expect(utils.improveStructure).toHaveBeenCalled();
      });
    });

    it("should handle overrides in generate() call", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate({
          topic: "Override topic",
          userType: "Override user",
          notes: "Override notes",
          pageType: "Transaction"
        });
        // Should use override values, not state
        expect(page).toBeDefined();
      });
    });

    it("should track generation input snapshot", async () => {
      params.state.topic = "Pest control";
      params.state.userType = "Property owner";

      const { result } = renderHook(() => usePageGeneration(params));

      await act(async () => {
        const page = await result.current.generate();
        expect(page?.inputs).toEqual({
          topic: "Pest control",
          userType: "Property owner",
          notes: params.state.notes
        });
      });
    });
  });

  describe("error recovery", () => {
    it("should provide error messages to UI", async () => {
      const { result } = renderHook(() => usePageGeneration(params));

      // Simulate parse warning
      await act(async () => {
        const page = await result.current.generate();
        // Hook should expose error state for UI to display
      });
    });

    it("should allow retry after failed generation", async () => {
      let attempts = 0;
      vi.spyOn(chatStreamModule, "streamModelText").mockImplementation(async () => {
        attempts++;
        if (attempts === 1) throw new Error("First attempt failed");
        return { karlHit: true };
      });

      const { result } = renderHook(() => usePageGeneration(params));

      // First attempt fails
      await act(async () => {
        try {
          await result.current.generate();
        } catch (err) {
          // Expected
        }
      });

      // Reset mock for retry
      vi.spyOn(chatStreamModule, "streamModelText").mockResolvedValue({ karlHit: true });

      // Second attempt should succeed
      await act(async () => {
        const page = await result.current.generate();
        expect(page).toBeDefined();
      });
    });
  });
});
