import { useCallback } from "react";
import { ReferenceExample } from "../types";

type UseReferenceGenerationNavigationOptions = {
  navigate: (path: string) => void;
  setTopic: (value: string) => void;
  setTopicTouched: (value: boolean) => void;
  setNotes: (value: string) => void;
  setPendingPageType: (value: string) => void;
  setPendingPlannedId: (value: number | null) => void;
};

// REFACTORED: Extract shared reference-to-generate navigation logic used by multiple pages.
export function useReferenceGenerationNavigation({
  navigate,
  setTopic,
  setTopicTouched,
  setNotes,
  setPendingPageType,
  setPendingPlannedId
}: UseReferenceGenerationNavigationOptions) {
  return useCallback(
    (reference: ReferenceExample, suggestedPageType: string) => {
      const goal = reference.title?.trim() || "";
      const benchmarkNotes =
        `Benchmark reference: ${reference.title} (source: ${reference.sourceSystem}, type: ${reference.referenceType.replace(/_/g, " ")}, pattern: ${reference.mappedPattern}).` +
        (reference.notes ? `\n\nNotes: ${reference.notes}` : "");

      if (goal) {
        setTopic(goal);
        setTopicTouched(true);
      }

      setNotes(benchmarkNotes);
      if (suggestedPageType) setPendingPageType(suggestedPageType);
      setPendingPlannedId(null);
      navigate("/generate");
    },
    [navigate, setTopic, setTopicTouched, setNotes, setPendingPageType, setPendingPlannedId]
  );
}
