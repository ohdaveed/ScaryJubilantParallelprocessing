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
      name: "Report mold",
      pageType: "Transaction",
      components: "- Section\n- Button link",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report mold\n\n[To be generated]",
      raw: "PAGE DRAFT\n\n[To be generated]"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures.some((x) => x.includes("Placeholder"))).toBe(true);
  });

  it("rejects report Transaction pages that do not include the required 311 flow", () => {
    const result = validateGeneratedPage({
      name: "Report rats or mice",
      pageType: "Transaction",
      components: "- Section\n- Button link\n- Action link\n- Phone number",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: "# Report rats or mice\n\nDescription: Report rats or mice to 311.\n\n## What to know\nText\n\n## What to do\nButton link: Report to 311",
      raw: "PAGE NAME:\nReport rats or mice\n\nPAGE TYPE:\nTransaction\n\nPAGE DRAFT\n\n# Report rats or mice\n\nDescription: Report rats or mice to 311.\n\n## What to know\nText\n\n## What to do\nButton link: Report to 311"
    } as any);

    expect(result.ok).toBe(false);
    expect(result.failures.some((x) => x.includes("landlord or property manager"))).toBe(true);
    expect(result.failures.some((x) => x.includes("72 hours"))).toBe(true);
  });

  it("accepts report Transaction pages with the required HHVC 311 flow", () => {
    const raw = `PAGE NAME:
Report rats or mice

PAGE TYPE:
Transaction

RECOMMENDED COMPONENTS:
- Section
- Button link
- Action link
- Phone number

SYSTEM RELATIONSHIPS:
Parent: Healthy housing and pests (Topic)

PAGE DRAFT

# Report rats or mice

Description: Report rats or mice to 311 and learn what happens next.

## What to know
Section heading: What this report covers
Section body: Use this page when rats or mice affect health or housing conditions.

## What to do
Section heading: Before you report to 311
Section body: Tell your landlord or property manager about the problem in writing. Wait 72 hours. If you still do not get a response or a fix, report to 311.
Button link: Report to 311
Action link: Report to 311 https://sf311.org
Phone number: 311

Section heading: What happens after you use 311
Section body: Your report goes through 311. 311 routes it to HHVC. HHVC assigns your case. An HHVC inspector reaches out to you within 72 hours of HHVC receiving the report.`;

    const result = validateGeneratedPage({
      name: "Report rats or mice",
      pageType: "Transaction",
      components: "- Section\n- Button link\n- Action link\n- Phone number",
      relationships: "Parent: Healthy housing and pests (Topic)",
      draft: raw.split("PAGE DRAFT")[1],
      raw
    } as any);

    expect(result).toEqual({ ok: true, failures: [], warnings: [] });
  });
});
