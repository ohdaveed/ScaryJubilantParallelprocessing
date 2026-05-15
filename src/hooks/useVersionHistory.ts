import { useCallback, useRef, useState } from "react";
import { PageDraft, PageVersion } from "../types";
import { versionsApi } from "../api";

export function useVersionHistory() {
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const [historyVersions, setHistoryVersions] = useState<PageVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const openRequestRef = useRef(0);

  const openHistory = useCallback(async (pageId: string) => {
    const requestId = openRequestRef.current + 1;
    openRequestRef.current = requestId;
    setHistoryPageId(pageId);
    setHistoryLoading(true);
    try {
      const versions = await versionsApi.list(pageId);
      if (openRequestRef.current !== requestId) return;
      setHistoryVersions(versions);
    } catch {
      if (openRequestRef.current !== requestId) return;
      setHistoryVersions([]);
    }
    if (openRequestRef.current === requestId) setHistoryLoading(false);
  }, []);

  const restoreVersion = useCallback(async (
    pageId: string,
    versionId: number,
    versionNumber: number,
    onRestored: (data: PageDraft) => void
  ) => {
    if (!window.confirm(`Restore v${versionNumber}? This will replace the current page content. The current state will be saved as a new version automatically.`)) return;
    try {
      const restoredData = await versionsApi.restore(pageId, versionId);
      onRestored(restoredData);
      setHistoryPageId(null);
    } catch {
      alert("Failed to restore version. Please try again.");
    }
  }, []);

  return {
    historyPageId,
    setHistoryPageId,
    historyVersions,
    historyLoading,
    openHistory,
    restoreVersion
  };
}
