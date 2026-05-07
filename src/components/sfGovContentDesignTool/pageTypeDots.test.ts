import { describe, expect, it } from "vitest";
import { normalizePageTypeKey, pageTypeToDotClass } from "./pageTypeDots";

describe("pageTypeToDotClass", () => {
  it("maps canonical page types", () => {
    expect(pageTypeToDotClass("Transaction")).toBe("type-dot-transaction");
    expect(pageTypeToDotClass("Step-by-step")).toBe("type-dot-step-by-step");
    expect(pageTypeToDotClass("Campaign")).toBe("type-dot-campaign");
    expect(pageTypeToDotClass("Resource Collection")).toBe("type-dot-resource-collection");
    expect(pageTypeToDotClass("Form")).toBe("type-dot-form");
  });

  it("normalizes spacing and case", () => {
    expect(pageTypeToDotClass("  topic  ")).toBe("type-dot-topic");
    expect(normalizePageTypeKey("Step by step")).toBe("step-by-step");
    expect(pageTypeToDotClass("Step by step")).toBe("type-dot-step-by-step");
  });

  it("falls back for unknown types", () => {
    expect(pageTypeToDotClass("Custom")).toBe("type-dot-default");
  });
});
