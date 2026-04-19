import { describe, expect, it } from "vitest";
import { assignHub } from "./IdealSiteMap";
import type { PageDraft } from "../types";

function stub(overrides: Partial<PageDraft>): PageDraft {
  return {
    id: "1",
    name: "",
    userType: "",
    userGoal: "",
    purpose: "",
    pageType: "",
    components: "",
    relationships: "",
    duplication: "",
    enforcement: "",
    draft: "",
    integration: "",
    valid: true,
    raw: "",
    createdAt: "",
    karlConnected: false,
    inputs: { topic: "", userType: "", notes: "" },
    ...overrides,
  };
}

describe("assignHub", () => {
  it("classifies West Nile dead bird reporting under programs, not report", () => {
    const page = stub({
      name: "Report a dead bird for West Nile Virus testing",
      relationships: "Programs and Services; West Nile surveillance",
    });
    expect(assignHub(page)).toBe("programs");
  });

  it("still classifies 311 housing reports under report when not West Nile", () => {
    const page = stub({ name: "Report a housing or pest problem" });
    expect(assignHub(page)).toBe("report");
  });

  it("classifies get-help page under resources, not report", () => {
    const page = stub({ name: "Get help with a housing or pest problem" });
    expect(assignHub(page)).toBe("resources");
  });
});
