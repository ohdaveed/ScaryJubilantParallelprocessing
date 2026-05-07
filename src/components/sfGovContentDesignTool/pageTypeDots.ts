/**
 * Maps SF.gov-style page type labels to the design system dot color classes.
 * Keys are normalized: lowercase, runs of whitespace collapsed to a single hyphen.
 */
const PAGE_TYPE_DOT_MAP: Record<string, string> = {
  transaction: "type-dot-transaction",
  information: "type-dot-information",
  department: "type-dot-department",
  topic: "type-dot-topic",
  "step-by-step": "type-dot-step-by-step",
  campaign: "type-dot-campaign",
  "resource-collection": "type-dot-resource-collection",
  form: "type-dot-form"
};

export function normalizePageTypeKey(pageType: string): string {
  return pageType.trim().toLowerCase().replace(/\s+/g, "-");
}

export function pageTypeToDotClass(pageType: string): string {
  const key = normalizePageTypeKey(pageType);
  return PAGE_TYPE_DOT_MAP[key] ?? "type-dot-default";
}
