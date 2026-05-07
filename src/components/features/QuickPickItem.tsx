import React, { memo, useEffect, useState } from "react";
import { pageTypeToDotClass } from "../sfGovContentDesignTool/pageTypeDots";

type QuickPickItemPage = {
  id: string;
  title: string;
  pageType: string;
  gradeLetter?: string;
};

type QuickPickItemProps = {
  page: QuickPickItemPage;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  dismissSignal: number;
};

// REFACTORED: Extracted quick pick row with inline delete confirmation into a reusable component.
export const QuickPickItem = memo(function QuickPickItem({
  page,
  active,
  onSelect,
  onDelete,
  dismissSignal
}: QuickPickItemProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [dismissSignal]);

  const dotClass = pageTypeToDotClass(page.pageType);

  return (
    <div className={`page-item${active ? " active" : ""}${confirming ? " confirming" : ""}`}>
      <button type="button" className="page-main" onClick={onSelect}>
        <span className={`page-dot ${dotClass}`} aria-hidden />
        <span className="page-name">{page.title}</span>
        {page.gradeLetter ? <span className="page-built">{page.gradeLetter}</span> : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="page-delete"
          title="Delete page"
          aria-label={`Delete ${page.title}`}
          onClick={(event) => {
            event.stopPropagation();
            setConfirming(true);
          }}
        >
          ✕
        </button>
      ) : null}
      <div className="confirm-row">
        <span className="confirm-text">Delete this page?</span>
        <button
          type="button"
          className="confirm-yes"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
        >
          Delete
        </button>
        <button
          type="button"
          className="confirm-no"
          onClick={(event) => {
            event.stopPropagation();
            setConfirming(false);
          }}
        >
          Keep
        </button>
      </div>
    </div>
  );
});
