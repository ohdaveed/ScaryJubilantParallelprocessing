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
      />
    );
    const settingsButtons = html.match(/aria-label="Settings"/g);
    expect(settingsButtons?.length).toBe(1);
    expect(html).toContain('type="button"');
  });
});
