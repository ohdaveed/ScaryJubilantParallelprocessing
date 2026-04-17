import { describe, it, expect } from "vitest";
import { assignHub } from "./IdealSiteMap";
import type { PageDraft } from "../types";

const base: PageDraft = {
  id: "1", name: "Test", userType: "", userGoal: "", purpose: "",
  pageType: "Transaction", components: "", relationships: "", duplication: "",
  enforcement: "", draft: "", integration: "", valid: true, raw: "",
  createdAt: new Date().toISOString(), karlConnected: false,
  inputs: { topic: "", userType: "", notes: "" },
};

describe("assignHub", () => {
  it("assigns tenant for 'Resident / tenant' userType", () => {
    expect(assignHub({ ...base, userType: "Resident / tenant" })).toBe("tenant");
  });

  it("assigns owner for 'Property owner / landlord' userType", () => {
    expect(assignHub({ ...base, userType: "Property owner / landlord" })).toBe("owner");
  });

  it("assigns community for 'General public' userType", () => {
    expect(assignHub({ ...base, userType: "General public" })).toBe("community");
  });

  it("assigns community for Campaign Page type regardless of userType", () => {
    expect(assignHub({ ...base, userType: "", pageType: "Campaign Page" })).toBe("community");
  });

  it("falls back to relationships for tenant", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: pests, mold hub" })).toBe("tenant");
  });

  it("falls back to relationships for owner", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: building fee page" })).toBe("owner");
  });

  it("falls back to relationships for community", () => {
    expect(assignHub({ ...base, userType: "", relationships: "Parent: mosquito education" })).toBe("community");
  });

  it("returns unplaced when no signal matches", () => {
    expect(assignHub({ ...base, userType: "", pageType: "Information", relationships: "" })).toBe("unplaced");
  });
});
