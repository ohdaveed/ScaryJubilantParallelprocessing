import { describe, expect, it } from "vitest";
import { validateGeneratedPage } from "./generationValidation";

describe("validateGeneratedPage", () => {
  it("rejects invalid page types", () => {
    const result = validateGeneratedPage({
      pageType: "Guidance page",
      components: "- Section",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report mold\n\n## What to know\nText\n\n## What to do\nText",
      raw: "PAGE TYPE:\nGuidance page"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain("Invalid page type");
  });

  it("rejects placeholders in the page", () => {
    const result = validateGeneratedPage({
      pageType: "Transaction",
      components: "- Section\n- Button link",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report mold\n\n[To be generated]",
      raw: "PAGE DRAFT\n\n[To be generated]"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures.some((x) => x.includes("Placeholder"))).toBe(true);
  });
});
