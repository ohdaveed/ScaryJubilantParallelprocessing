export interface ConceptValidationFlag {
  id: string;
  severity: "error" | "warning";
  message: string;
}

export interface ConceptDraftInput {
  canonicalTitle?: string;
  taskStatement?: string;
  contentType?: string;
}

export interface ConceptRecord {
  id: number | string;
  status?: string;
  canonicalTitle: string;
  intentKey?: string;
}

export interface ConceptCandidate {
  canonicalTitle?: string;
  taskStatement?: string;
  audience?: string;
  serviceArea?: string;
}

export function normalizeTitleForComparison(value?: string): string;
export function normalizeTaskForIntent(value?: string): string;
export function slugifyIntent(value?: string): string;
export function contentTypeLabel(type?: string): string;
export function contentTypeFromPageType(value?: string): string;
export function pageTypeFromContentType(type?: string): string;
export function buildIntentKey(taskStatement?: string, audience?: string, serviceArea?: string): string;
export function validateConceptDraft(input: ConceptDraftInput): ConceptValidationFlag[];
export function findConceptConflicts(
  concepts: ConceptRecord[],
  candidate: ConceptCandidate,
  excludeId?: number | string
): ConceptValidationFlag[];
export function artifactKindFromPage(page?: Record<string, unknown>): string;
export function artifactWorkflowFromPage(page?: Record<string, unknown>): string;
