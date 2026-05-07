import React from "react";

type PageTypeButtonProps = {
  pageType: string;
  description: string;
  active: boolean;
  onSelect: (pageType: string) => void;
};

// REFACTORED: Extracted reusable page type card renderer from SfGovContentDesignTool.
export function PageTypeButton({ pageType, description, active, onSelect }: PageTypeButtonProps) {
  return (
    <button
      type="button"
      className={`page-type-card${active ? " active" : ""}`}
      onClick={() => onSelect(pageType)}
    >
      <span className="page-type-card__name">{pageType}</span>
      <span className="page-type-card__meta">{description}</span>
    </button>
  );
}
