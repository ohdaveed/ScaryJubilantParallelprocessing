import {
  PROHIBITED_PLACEHOLDER_PATTERNS,
  VALID_KARL_COMPONENTS,
  VALID_KARL_PAGE_TYPES
} from "./karlStandards";
import { GenerationValidationResult, ParsedPageFields } from "./types";

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

  return {
    ok: failures.length === 0,
    failures,
    warnings
  };
}
