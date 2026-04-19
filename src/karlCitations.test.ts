import { describe, expect, it, afterEach } from "vitest";
import {
  enforceKarlCitationsOnEvaluation,
  evaluationContainsOfficialKarlUrl,
  evaluationMentionsKarlTopics
} from "../lib/karlCitations.js";

afterEach(() => {
  delete process.env.KARL_CITATIONS_DISABLED;
});

describe("evaluationMentionsKarlTopics", () => {
  it("detects Karl and Wagtail", () => {
    expect(evaluationMentionsKarlTopics("Align with Karl Transaction rules")).toBe(true);
    expect(evaluationMentionsKarlTopics("Built on Wagtail")).toBe(true);
  });

  it("detects transaction page wording", () => {
    expect(evaluationMentionsKarlTopics("Use a Transaction page for 311")).toBe(true);
  });

  it("does not fire on generic English without CMS context", () => {
    expect(evaluationMentionsKarlTopics("Short sentences improve clarity")).toBe(false);
  });
});

describe("enforceKarlCitationsOnEvaluation", () => {
  it("appends a warning when Karl is discussed but no official URL appears", () => {
    const out = enforceKarlCitationsOnEvaluation({
      score: 80,
      grade: "B",
      summary: "Transaction page needs Related links per Karl.",
      passed: ["Plain language is fine"],
      warnings: [],
      failed: [],
      parseError: false,
      parseFailureReason: null,
      confidence: "high"
    });
    expect(out.warnings.length).toBe(1);
    expect(out.warnings[0]).toContain("[Karl cite enforced]");
    expect(out.warnings[0]).toContain("sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center");
  });

  it("does nothing when an official GitBook URL is already present", () => {
    const url = "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms";
    const out = enforceKarlCitationsOnEvaluation({
      score: 90,
      grade: "A",
      summary: `See ${url} for content types.`,
      passed: [],
      warnings: [],
      failed: [],
      parseError: false,
      parseFailureReason: null,
      confidence: "high"
    });
    expect(out.warnings.length).toBe(0);
  });

  it("skips when KARL_CITATIONS_DISABLED is set", () => {
    process.env.KARL_CITATIONS_DISABLED = "1";
    const out = enforceKarlCitationsOnEvaluation({
      score: 80,
      grade: "B",
      summary: "Transaction page per Karl.",
      passed: [],
      warnings: [],
      failed: [],
      parseError: false,
      parseFailureReason: null,
      confidence: "high"
    });
    expect(out.warnings.length).toBe(0);
  });
});

describe("evaluationContainsOfficialKarlUrl", () => {
  it("matches Karl editor help host and path", () => {
    expect(
      evaluationContainsOfficialKarlUrl(
        "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/foo"
      )
    ).toBe(true);
  });
});
