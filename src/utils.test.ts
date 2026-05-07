import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildGenerationUserPrompt, PROMPT_CONTRACT_VERSION } from "./constants";
import {
  evaluateQualityGate,
  findOverlappingPageIds,
  formatVersionOrMonth,
  getVerificationLabel,
  getVerificationState,
  generateZip,
  parsePage,
  parseStructuredPage,
  replacePageDraftInRaw,
  renderPageAsPDF,
  renderPageAsPNG,
  sanitizeFilename,
  structuredToRawPage
} from "./utils";
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

describe("verification state helpers", () => {
  it("classifies imported pages by review status", () => {
    const pending = getVerificationState({ imported: true } as PageDraft);
    const approved = getVerificationState({ imported: true, reviewStatus: "approved" } as PageDraft);
    const rejected = getVerificationState({ imported: true, reviewStatus: "rejected" } as PageDraft);
    expect(pending).toBe("import_pending_review");
    expect(approved).toBe("import_approved");
    expect(rejected).toBe("import_rejected");
  });

  it("classifies generated pages by quality and Karl evaluation", () => {
    const reviewRequired = getVerificationState({
      qualityGate: { status: "review_required", reasons: ["low score"] }
    } as PageDraft);
    const verified = getVerificationState(({
      karlEvaluation: {
        score: 90,
        grade: "A",
        summary: "ok",
        passed: [],
        warnings: [],
        failed: []
      }
    } as unknown) as PageDraft);
    const notChecked = getVerificationState({} as PageDraft);
    expect(reviewRequired).toBe("review_required");
    expect(verified).toBe("verified");
    expect(notChecked).toBe("not_checked");
  });

  it("returns friendly labels", () => {
    expect(getVerificationLabel("verified")).toBe("verified");
    expect(getVerificationLabel("review_required")).toBe("needs review");
    expect(getVerificationLabel("import_pending_review")).toBe("import: pending");
  });
});

describe("overlap detection", () => {
  it("finds pages with duplicate normalized names", () => {
    const overlaps = findOverlappingPageIds([
      { id: "1", name: "Report Pests" } as PageDraft,
      { id: "2", name: " report pests " } as PageDraft,
      { id: "3", name: "Get help" } as PageDraft
    ]);
    expect(overlaps.has("1")).toBe(true);
    expect(overlaps.has("2")).toBe(true);
    expect(overlaps.has("3")).toBe(false);
  });

  it("treats near-duplicate possessive titles as overlaps", () => {
    const overlaps = findOverlappingPageIds([
      { id: "a", name: "Report flies in your home" } as PageDraft,
      { id: "b", name: "Report flies in my home" } as PageDraft,
      { id: "c", name: "Report rats in the home" } as PageDraft,
      { id: "d", name: "Schedule pickup" } as PageDraft
    ]);
    expect(overlaps.has("a")).toBe(true);
    expect(overlaps.has("b")).toBe(true);
    expect(overlaps.has("c")).toBe(false);
    expect(overlaps.has("d")).toBe(false);
  });

  it("ignores punctuation and articles", () => {
    const overlaps = findOverlappingPageIds([
      { id: "x", name: "Get a permit!" } as PageDraft,
      { id: "y", name: "Get the permit" } as PageDraft
    ]);
    expect(overlaps.has("x")).toBe(true);
    expect(overlaps.has("y")).toBe(true);
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

describe('formatVersionOrMonth', () => {
  it('should return version if provided', () => {
    const page = { version: 'v1.2.3', created_at: '2026-01-15' };
    expect(formatVersionOrMonth(page as any)).toBe('v1.2.3');
  });
  it('should return formatted month if version is empty', () => {
    const page = { version: '', created_at: '2026-04-17' };
    expect(formatVersionOrMonth(page as any)).toBe('April 2026');
  });
  it('should return formatted month if version is undefined', () => {
    const page = { version: undefined, created_at: '2026-02-28' };
    expect(formatVersionOrMonth(page as any)).toBe('February 2026');
  });
  it('should fall back to createdAt (camelCase) when created_at is absent', () => {
    const page = { createdAt: '2026-03-10' };
    expect(formatVersionOrMonth(page as any)).toBe('March 2026');
  });
  it('should return Unknown for missing date', () => {
    const page = { version: undefined };
    expect(formatVersionOrMonth(page as any)).toBe('Unknown');
  });
});

describe('sanitizeFilename', () => {
  it('should remove invalid filename characters', () => {
    expect(sanitizeFilename('Page: "v1"')).toBe('Page v1');
    expect(sanitizeFilename('File|Name')).toBe('FileName');
  });
  it('should preserve valid characters', () => {
    expect(sanitizeFilename('SF-Housing_Authority.v1')).toBe('SF-Housing_Authority.v1');
  });
  it('should collapse multiple spaces', () => {
    expect(sanitizeFilename('SF  Housing')).toBe('SF Housing');
  });
  it('should remove all invalid characters: \\ / * ? < >', () => {
    expect(sanitizeFilename('a\\b/c*d?e<f>g')).toBe('abcdefg');
  });
  it('should trim leading and trailing whitespace', () => {
    expect(sanitizeFilename('  hello  ')).toBe('hello');
  });
});

describe('generateZip', () => {
  it('should create zip blob with content', async () => {
    const files = [
      { blob: new Blob(['content1'], { type: 'image/png' }), filename: 'page1.png' },
      { blob: new Blob(['content2'], { type: 'image/png' }), filename: 'page2.png' }
    ];
    const zipBlob = await generateZip(files);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
  });
});

describe('renderPageAsPNG', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { getElementById: () => null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('should throw if element not found', async () => {
    await expect(renderPageAsPNG({ name: 'Test', created_at: '2026-01-01' }, 'nonexistent-id-xyz')).rejects.toThrow('Element not found');
  });
});

describe('renderPageAsPDF', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { getElementById: () => null });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('should throw if element not found', async () => {
    await expect(renderPageAsPDF({ name: 'Test', created_at: '2026-01-01' }, 'nonexistent-id-xyz')).rejects.toThrow('Element not found');
  });
});
