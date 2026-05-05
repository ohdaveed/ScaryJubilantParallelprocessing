import type {
  ArtifactKind,
  ArtifactWorkflowStatus,
  ContentType,
  GovernanceFlag,
  PageArtifact,
  PageConcept
} from "../types";

const PLACEHOLDER_TITLE_RE = /\b(page\s+[a-z]|\btbd\b|\bstub\b|\bdraft\b|\bv\d+\b)\b/i;
const TITLE_SUFFIX_RE = /\s*(\((?:v\d+|stub|draft)\)|\bv\d+\b|\bstub\b|\bdraft\b)\s*$/gi;

export function normalizeTitleForComparison(value: string): string {
  return value
    .replace(TITLE_SUFFIX_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeTaskForIntent(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyIntent(value: string): string {
  return normalizeTaskForIntent(value).replace(/\s+/g, "-");
}

export function contentTypeLabel(type: ContentType): string {
  switch (type) {
    case "topic":
      return "Topic";
    case "transaction":
      return "Transaction";
    case "information":
      return "Information";
    case "step_by_step":
      return "Step by step";
    default:
      return type;
  }
}

export function contentTypeFromPageType(value: string): ContentType {
  const key = value.trim().toLowerCase();
  if (key === "topic") return "topic";
  if (key === "transaction") return "transaction";
  if (key === "information") return "information";
  if (key === "step by step" || key === "step-by-step") return "step_by_step";
  return "information";
}

export function pageTypeFromContentType(type: ContentType): string {
  return contentTypeLabel(type);
}

export function artifactRoleLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "experiment":
      return "Experiment";
    case "imported":
      return "Import triage";
    case "built":
      return "Built";
    case "published_snapshot":
      return "Snapshot";
    default:
      return "Draft";
  }
}

export function artifactWorkflowLabel(status: ArtifactWorkflowStatus): string {
  switch (status) {
    case "in_review":
      return "In review";
    case "approved":
      return "Approved";
    case "built":
      return "Built";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

export function buildIntentKey(taskStatement: string, audience: string, serviceArea: string): string {
  return [taskStatement, audience, serviceArea]
    .map((part) => slugifyIntent(part))
    .filter(Boolean)
    .join("__");
}

export function validateConceptDraft(input: {
  canonicalTitle: string;
  taskStatement: string;
  contentType: ContentType;
}): GovernanceFlag[] {
  const flags: GovernanceFlag[] = [];
  const title = input.canonicalTitle.trim();
  const task = input.taskStatement.trim();

  if (!title) {
    flags.push({ id: "missing-title", severity: "error", message: "Canonical title is required." });
  } else if (PLACEHOLDER_TITLE_RE.test(title)) {
    flags.push({ id: "placeholder-title", severity: "error", message: "Placeholder or version-like titles cannot be canonical titles." });
  }

  if (!task) {
    flags.push({ id: "missing-task", severity: "error", message: "Task statement is required." });
  } else {
    const lowerTask = task.toLowerCase();
    if (input.contentType !== "topic" && /\band\b|,|\/|;/.test(lowerTask)) {
      flags.push({ id: "multi-task", severity: "warning", message: "This task may combine multiple user needs. Split review is recommended." });
    }
    if (input.contentType === "transaction" && /\bchoose\b|\bfind the right\b|\bdecide\b/.test(lowerTask)) {
      flags.push({ id: "topic-mismatch", severity: "warning", message: "Gateway-style tasks usually belong to Topic, not Transaction." });
    }
  }

  return flags;
}

export function findConceptConflicts(concepts: PageConcept[], candidate: {
  canonicalTitle: string;
  taskStatement: string;
  audience: string;
  serviceArea: string;
}, excludeId?: number): GovernanceFlag[] {
  const flags: GovernanceFlag[] = [];
  const titleKey = normalizeTitleForComparison(candidate.canonicalTitle);
  const intentKey = buildIntentKey(candidate.taskStatement, candidate.audience, candidate.serviceArea);

  const exactTitle = concepts.find((concept) =>
    concept.id !== excludeId &&
    concept.status !== "archived" &&
    normalizeTitleForComparison(concept.canonicalTitle) === titleKey
  );
  if (exactTitle) {
    flags.push({
      id: "duplicate-title",
      severity: "error",
      message: `Canonical title duplicates "${exactTitle.canonicalTitle}".`
    });
  }

  const exactIntent = concepts.find((concept) =>
    concept.id !== excludeId &&
    concept.status !== "archived" &&
    concept.intentKey === intentKey
  );
  if (exactIntent) {
    flags.push({
      id: "duplicate-intent",
      severity: "error",
      message: `Canonical intent duplicates "${exactIntent.canonicalTitle}".`
    });
  }

  const softMatches = concepts.filter((concept) =>
    concept.id !== excludeId &&
    concept.status !== "archived" &&
    normalizeTitleForComparison(concept.canonicalTitle).includes(titleKey) &&
    normalizeTitleForComparison(concept.canonicalTitle) !== titleKey
  );
  if (softMatches.length > 0) {
    flags.push({
      id: "near-duplicate-title",
      severity: "warning",
      message: `Possible duplicate of ${softMatches.slice(0, 2).map((concept) => `"${concept.canonicalTitle}"`).join(", ")}.`
    });
  }

  return flags;
}

export function artifactKindFromPage(page: {
  imported?: boolean;
  skeleton?: boolean;
  qualityGate?: { status: "pass" | "review_required" };
}): ArtifactKind {
  if (page.imported) return "imported";
  if (page.skeleton) return "experiment";
  if (page.qualityGate?.status === "pass") return "built";
  return "draft";
}

export function artifactWorkflowFromPage(page: {
  imported?: boolean;
  reviewStatus?: string;
  qualityGate?: { status: "pass" | "review_required" };
}): ArtifactWorkflowStatus {
  if (page.reviewStatus === "approved" || page.qualityGate?.status === "pass") return "approved";
  if (page.reviewStatus === "rejected") return "archived";
  if (page.imported) return "in_review";
  return "draft";
}

export function conceptSummaryFromArtifact(artifact: PageArtifact): string {
  const raw = artifact.bodyStructured;
  const maybeSummary = typeof raw === "object" && raw && "purpose" in raw ? raw.purpose : "";
  return typeof maybeSummary === "string" && maybeSummary.trim()
    ? maybeSummary.trim()
    : `Support the task: ${artifact.title}`;
}
