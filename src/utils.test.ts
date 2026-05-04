import { describe, expect, it } from "vitest";
import { buildGenerationUserPrompt, PROMPT_CONTRACT_VERSION } from "./constants";
import { evaluateQualityGate, parsePage, parseStructuredPage, replacePageDraftInRaw, structuredToRawPage } from "./utils";
import type { PageDraft, StructuredPageOutput } from "./types";
import goldenPages from "./fixtures/golden-pages.json";

const validStructured: StructuredPageOutput = {
  page: {
    name: "Get help with pests",
    primaryUser: "Resident / tenant",
    userGoal: "Report pests quickly",
    primaryPurpose: "Direct users to reporting flow",
    pageType: "Transaction",
    recommendedComponents: ["Title", "Description", "Section"],
    systemRelationships: {
      parent: "Healthy housing and pests (Topic)",
      siblings: "Contact HHVC",
      children: "None",
      entryPoints: "311",
      nextSteps: "Inspection follow-up"
    },
    duplicationRisks: ["Potential overlap with city tenant support page"],
    enforcementCheck: {
      verifiable: ["Pest evidence during inspection"],
      unclearOrNotEnforceable: ["Unverified claims"]
    },
    pageDraft: "# I need pest help\n\nDescription: Report pests and get support.\n\n## What to know\nSection heading: What we inspect\nSection body: Pests and related health hazards.\n\n## What to do\nSection heading: Report now\nSection body: Call 311.\nPhone number: 311",
    integrationNotes: ["Tag to HHVC topic."]
  }
};

describe("parseStructuredPage", () => {
  it("parses valid structured payloads", () => {
    const payload = JSON.stringify(validStructured);
    const result = parseStructuredPage(payload);
    expect(result.parseError).toBeNull();
    expect(result.parsed?.valid).toBe(true);
    expect(result.parsed?.name).toContain("Get help");
  });

  it("returns typed parse error for malformed json", () => {
    const result = parseStructuredPage('{"page": {"name": "Broken"');
    expect(result.parsed).toBeNull();
    expect(result.parseError?.code).toBe("invalid_json");
  });

  it("returns typed parse error for schema mismatch", () => {
    const result = parseStructuredPage('{"foo":"bar"}');
    expect(result.parsed).toBeNull();
    expect(result.parseError?.code).toBe("schema_invalid");
  });
});

describe("structuredToRawPage", () => {
  it("materializes a normalized raw page format", () => {
    const raw = structuredToRawPage(validStructured);
    expect(raw).toContain("PAGE NAME:");
    expect(raw).toContain("INTEGRATION NOTES:");
    expect(raw).toContain("Get help with pests");
  });
});

describe("replacePageDraftInRaw", () => {
  it("replaces only the PAGE DRAFT body and keeps integration notes", () => {
    const raw = structuredToRawPage(validStructured);
    const newDraft = "# New title\n\nSummary: New summary line.\n\n## What to do\nSection body: Updated.";
    const out = replacePageDraftInRaw(raw, newDraft);
    const parsed = parsePage(out);
    expect(parsed.draft.trim()).toBe(newDraft.trim());
    expect(parsed.integration).toContain("Tag to HHVC");
    expect(out).toMatch(/INTEGRATION NOTES:\s*\n/);
  });

  it("returns the original string when PAGE DRAFT is missing", () => {
    const raw = "PAGE NAME:\nX\n\nPRIMARY USER:\nY";
    expect(replacePageDraftInRaw(raw, "new")).toBe(raw);
  });
});

describe("prompt contract", () => {
  it("includes contract metadata and schema requirements", () => {
    const prompt = buildGenerationUserPrompt("Design a page", "Transaction");
    expect(prompt).toContain(PROMPT_CONTRACT_VERSION);
    expect(prompt).toContain("STRUCTURED OUTPUT REQUIREMENT");
    expect(prompt).toContain("SELF-CHECK BEFORE FINAL ANSWER");

    expect(prompt).not.toContain("OUTPUT FORMAT — return EXACTLY this structure");
  });

  it("includes local Karl standards in the generation prompt", () => {
    const prompt = buildGenerationUserPrompt("Design a page", "Transaction");

    expect(prompt).toContain("VALID KARL PAGE TYPES");
    expect(prompt).toContain("VALID KARL COMPONENTS");
    expect(prompt).toContain("TRANSACTION REQUIRED SECTIONS");
  });
});

describe("quality gate", () => {
  it("flags low scoring transaction pages for review", () => {
    const result = evaluateQualityGate("Transaction", {
      score: 70,
      grade: "C",
      summary: "Needs work",
      passed: [],
      warnings: [],
      failed: [],
      confidence: "medium"
    });
    expect(result.status).toBe("review_required");
  });

  it("passes a high-quality page", () => {
    const result = evaluateQualityGate("Information", {
      score: 90,
      grade: "A",
      summary: "Strong",
      passed: ["All checks"],
      warnings: [],
      failed: [],
      confidence: "high"
    });
    expect(result.status).toBe("pass");
  });
});

describe("golden fixtures", () => {
  it("parses and materializes representative HHVC fixtures", () => {
    type Fixture = {
      name: string;
      topic: string;
      userType: string;
      pageType: string;
      structured: StructuredPageOutput;
    };

    const fixtures = goldenPages as Fixture[];
    expect(fixtures.length).toBeGreaterThanOrEqual(3);

    for (const fixture of fixtures) {
      const serialized = JSON.stringify(fixture.structured);
      const parsed = parseStructuredPage(serialized);
      expect(parsed.parseError, fixture.name).toBeNull();
      expect(parsed.parsed?.valid, fixture.name).toBe(true);
      expect(parsed.parsed?.pageType, fixture.name).toBe(fixture.pageType);
      const materialized = structuredToRawPage(fixture.structured);
      expect(materialized).toContain("PAGE NAME:");
      expect(materialized).toContain("PAGE DRAFT");
      expect(materialized).toContain("INTEGRATION NOTES:");
    }
  });
});

