import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SfGovContentDesignTool } from "./SfGovContentDesignTool";

const tabs = [
  { id: "plan", label: "Site Plan" },
  { id: "generate", label: "Generate" },
  { id: "library", label: "Library" }
] as const;

describe("SfGovContentDesignTool", () => {
  it("renders the scoped shell and preview slot", () => {
    const html = renderToStaticMarkup(
      <SfGovContentDesignTool
        tabs={tabs}
        activeTabId="generate"
        userType="Resident"
        activePageType="Transaction"
        pageGoal="Apply for a business permit"
        additionalContext="Test context"
        previewSlot={<div className="test-preview">Preview body</div>}
        brandTitle="SF.gov Content Design Tool"
      />
    );
    expect(html).toContain("sf-cdt");
    expect(html).toContain("SF.gov Content Design Tool");
    expect(html).toContain("test-preview");
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
  });

  it("uses type=button on icon actions", () => {
    const html = renderToStaticMarkup(
      <SfGovContentDesignTool
        tabs={tabs}
        activeTabId="generate"
        userType="Resident"
        activePageType="Transaction"
        pageGoal=""
        additionalContext=""
        previewSlot={<span />}
        onSettingsClick={() => {}}
      />
    );
    const settingsButtons = html.match(/aria-label="Settings"/g);
    expect(settingsButtons?.length).toBe(1);
    expect(html).toContain('type="button"');
  });

  it("renders the editorial shell landmarks for the generate workspace", () => {
    const html = renderToStaticMarkup(
      <SfGovContentDesignTool
        tabs={tabs}
        activeTabId="generate"
        userType="Resident"
        activePageType="Transaction"
        pageGoal="Apply for a business permit"
        additionalContext="Include permit wait times and eligibility details."
        previewSlot={<div className="test-preview">Preview body</div>}
      />
    );

    expect(html).toContain("editorial-shell");
    expect(html).toContain("authoring-rail");
    expect(html).toContain("preview-workbench");
    expect(html).not.toContain("preview-notes");
    expect(html).not.toContain("Draft board");
    expect(html).not.toContain("Ready for Karl review");
  });

  it("keeps the generate workspace controls visible after shell restyling", () => {
    const html = renderToStaticMarkup(
      <SfGovContentDesignTool
        tabs={tabs}
        activeTabId="generate"
        userType="Resident"
        activePageType="Transaction"
        pageGoal="Apply for a business permit"
        additionalContext=""
        previewSlot={<div>Preview body</div>}
      />
    );

    expect(html).toContain(">Generate<");
    expect(html).toContain("Generate page draft");
  });

  it("renders proofing chrome for the preview workbench", () => {
    const html = renderToStaticMarkup(
      <SfGovContentDesignTool
        tabs={tabs}
        activeTabId="generate"
        userType="Resident"
        activePageType="Transaction"
        pageGoal="Apply for a business permit"
        additionalContext=""
        previewSlot={<div className="test-preview">Preview body</div>}
      />
    );

    expect(html).toContain("preview-sheet-frame");
    expect(html).toContain("workbench-chrome");
  });
});
