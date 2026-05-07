import { RefObject, useCallback } from "react";
import { clean } from "../utils";

type UseGeneratePageActionsOptions = {
  selectedDraftText?: string;
  screenshotRef: RefObject<HTMLDivElement>;
  setCopied: (value: boolean) => void;
};

// REFACTORED: Extracted reusable clipboard/download/screenshot actions from GeneratePage.
export function useGeneratePageActions({
  selectedDraftText,
  screenshotRef,
  setCopied
}: UseGeneratePageActionsOptions) {
  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [setCopied]
  );

  const handleDownload = useCallback((text: string, name: string) => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    anchor.download = name;
    anchor.click();
  }, []);

  const handleExportScreenshot = useCallback(
    async (pageName: string) => {
      const screenshotElement = screenshotRef.current;
      if (!screenshotElement) return;
      await document.fonts.ready;
      const filename = `${(clean(pageName) || "page").toLowerCase().replace(/\s+/g, "-")}.png`;

      try {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(screenshotElement, { backgroundColor: "#ffffff" });
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = filename;
        anchor.click();
      } catch (error) {
        console.error("Screenshot export failed:", error);
        handleDownload(selectedDraftText ?? "", filename.replace(".png", "-draft.txt"));
      }
    },
    [screenshotRef, selectedDraftText, handleDownload]
  );

  return { handleCopy, handleDownload, handleExportScreenshot };
}
