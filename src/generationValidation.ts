import {
  PROHIBITED_PLACEHOLDER_PATTERNS,
  TRANSACTION_REQUIRED_SECTION_LABELS,
  VALID_KARL_COMPONENTS,
  VALID_KARL_PAGE_TYPES
} from "./karlStandards";
import { GenerationValidationResult, ParsedPageFields } from "./types";
import { parseRel } from "./utils/parsing";

const CANONICAL_PARENT = "Healthy housing and pests (Topic)";

const getDescription = (draft: string): string => {
  const match = draft.match(/^\s*(Description|Summary):\s*(.+)$/im);
  return match?.[2]?.trim() || "";
};

const containsAll = (value: string, patterns: RegExp[]): boolean =>
  patterns.every((pattern) => pattern.test(value));

export function validateGeneratedPage(page: ParsedPageFields): GenerationValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (!VALID_KARL_PAGE_TYPES.includes(page.pageType as (typeof VALID_KARL_PAGE_TYPES)[number])) {
    failures.push(`Invalid page type: ${page.pageType}.`);
  }

  for (const token of PROHIBITED_PLACEHOLDER_PATTERNS) {
    if (page.raw.includes(token) || page.draft.includes(token)) {
      failures.push(`Placeholder content found: ${token}.`);
    }
  }

  const componentLines = page.components
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  for (const component of componentLines) {
    if (!VALID_KARL_COMPONENTS.includes(component as (typeof VALID_KARL_COMPONENTS)[number])) {
      failures.push(`Invalid component detected: ${component}.`);
    }
  }

  const relationships = parseRel(page.relationships);
  if (relationships.parent !== CANONICAL_PARENT) {
    failures.push(`System Relationships parent must be "${CANONICAL_PARENT}".`);
  }

  const description = getDescription(page.draft);
  if (!description) {
    failures.push("Description field is required in the page draft.");
  } else if (description.length > 150) {
    failures.push(`Description must be 150 characters or fewer; found ${description.length}.`);
  }

  if (page.pageType === "Transaction") {
    const lowerDraft = page.draft.toLowerCase();
    for (const label of TRANSACTION_REQUIRED_SECTION_LABELS) {
      if (!lowerDraft.includes(label.toLowerCase())) {
        failures.push(`Transaction pages must include a "${label}" section.`);
      }
    }
  }

  const isReportTransaction = page.pageType === "Transaction" && /^report\b/i.test((page.name || "").trim());
  if (isReportTransaction) {
    const reportFlowChecks: Array<[string, RegExp[]]> = [
      ["Report Transaction pages must tell the user to contact their landlord or property manager in writing first.", [/\blandlord\b/i, /\bproperty manager\b/i, /\bin writing\b/i]],
      ["Report Transaction pages must tell the user to wait 72 hours before using 311.", [/\bwait\b/i, /\b72 hours\b/i]],
      ["Report Transaction pages must include the Report to 311 CTA, sf311.org link, and 311 phone number.", [/\bReport to 311\b/i, /\bsf311\.org\b/i, /\bPhone number:\s*311\b/i]],
      ["Report Transaction pages must explain 311 routing to HHVC and inspector contact within 72 hours of HHVC receiving the report.", [/\b311 routes\b/i, /\bHHVC\b/i, /\binspector reaches out\b/i, /\bwithin 72 hours\b/i, /\bHHVC receiving\b/i]]
    ];

    for (const [message, patterns] of reportFlowChecks) {
      if (!containsAll(page.raw, patterns)) {
        failures.push(message);
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings
  };
}
