import {
  SITEMAP_SKELETON,
  REPORT_TRANSACTION_BEFORE_311_BODY,
  REPORT_TRANSACTION_POST_CTA_ROUTING_BODY
} from "../constants";
import type {
  ArtifactKind,
  ArtifactWorkflowStatus,
  ContentType,
  GovernanceFlag,
  PageArtifact,
  PageConcept,
  PageDraft,
  KarlEvaluation
} from "../types";
import { parsePage } from "./parsing";

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
    case "campaign":
      return "Campaign";
    case "resource_collection":
      return "Resource Collection";
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
  if (key === "campaign") return "campaign";
  if (key === "resource collection" || key === "resource-collection") return "resource_collection";
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

export const buildArtifactSearchHints = (artifacts: PageArtifact[], concepts: PageConcept[]) => {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  return artifacts.map((artifact) => {
    const concept = artifact.conceptId != null ? conceptById.get(artifact.conceptId) : undefined;
    return {
      artifactId: artifact.id,
      title: artifact.title,
      titleKey: normalizeTitleForComparison(artifact.title),
      role: artifactRoleLabel(artifact.artifactKind),
      workflow: artifactWorkflowLabel(artifact.workflowStatus),
      conceptTitle: concept?.canonicalTitle || null,
      contentTypeLabel: contentTypeLabel(artifact.contentType)
    };
  });
};

export const findPossibleConceptDuplicates = (concepts: PageConcept[], title: string) => {
  const titleKey = normalizeTitleForComparison(title);
  return concepts.filter((concept) => normalizeTitleForComparison(concept.canonicalTitle).includes(titleKey));
};

const QUALITY_GATE_MIN_SCORE: Record<string, number> = {
  Transaction: 85,
  "Step by step": 82,
  Information: 80,
  Topic: 78,
  "Resource Collection": 78,
  Campaign: 78
};

export const evaluateQualityGate = (pageType: string, evaluation: KarlEvaluation | null): { status: "pass" | "review_required"; reasons: string[] } => {
  if (!evaluation) {
    return { status: "review_required", reasons: ["Quality evaluation is unavailable. Manual review is required."] };
  }
  if (evaluation.parseError) {
    return { status: "review_required", reasons: [evaluation.parseFailureReason || "Evaluator parse failure. Manual review is required."] };
  }
  const minScore = QUALITY_GATE_MIN_SCORE[pageType] ?? 80;
  const reasons: string[] = [];
  if (evaluation.score < minScore) reasons.push(`Score ${evaluation.score} is below minimum ${minScore} for ${pageType}.`);
  if (evaluation.failed.length > 0) reasons.push(`${evaluation.failed.length} evaluator checks failed.`);
  return { status: reasons.length === 0 ? "pass" : "review_required", reasons: reasons.length === 0 ? ["Meets automatic quality gate."] : reasons };
};

export const skeletonToPageDraft = (tmpl: (typeof SITEMAP_SKELETON)[number]): PageDraft => {
  const parentLine = "Parent: Healthy housing and pests (Topic)";
  const isReportTransaction = tmpl.pageType === "Transaction" && /^report\s/i.test(tmpl.name);
  const sectionFallback = (heading: string) => {
    const key = heading.toLowerCase();
    if (key.includes("what to report")) return "Describe what you saw, where it is, and when it started. Include photos when possible.";
    if (key.includes("what happens after reporting")) return "311 routes your report to HHVC. Staff review the details and contact you with next steps when needed.";
    if (key.includes("what happens after 311")) return "311 sends eligible reports to HHVC for review, inspection planning, and follow-up guidance.";
    if (key.includes("choose your report")) return "Pick the page that matches your issue so you can submit the right 311 request quickly.";
    if (key.includes("report, fix, and prevent")) return "Use report pages for active problems, fix pages for notices and inspections, and prevention pages for home care steps.";
    if (key.includes("find services and tools")) return "Use this hub for inspector lookup, fee payment, practical guides, and HHVC contact options.";
    if (key.includes("inspection process")) return "Inspectors review visible health risks, document findings, and explain required corrections.";
    if (key.includes("follow-up process")) return "Follow-up visits confirm repairs and record whether the case can close or needs more action.";
    if (key.includes("required tenant actions")) return "Allow access, share details accurately, and keep copies of requests you send to your landlord.";
    if (key.includes("required owner actions")) return "Fix cited conditions by the deadline, document repairs, and coordinate access with tenants.";
    if (key.includes("show what was fixed")) return "Bring repair records, receipts, and photos so staff can verify completed work.";
    if (key.includes("what to do if issues remain")) return "Report unresolved items clearly and ask what evidence is needed for the next follow-up.";
    if (key.includes("when fees apply")) return "Reinspection fees may apply when extra visits are required to verify unresolved violations.";
    if (key.includes("how fees are handled")) return "Always use the current official fee page and keep payment confirmations for your records.";
    if (key.includes("choose prevention by problem")) return "Start with the guide that matches your issue, then follow the simple home prevention steps.";
    if (key.includes("when to report")) return "If prevention steps do not help or risks grow, use the matching report page and contact 311.";
    if (key.includes("available services")) return "Find workshop requests, surveillance reporting, and program support services in this section.";
    if (key.includes("program information")) return "Learn how HHVC responds to complaints and what inspection services are in scope.";
    if (key.includes("property lookup tools")) return "Use official lookup tools to review violations history and related public records.";
    if (key.includes("inspector lookup")) return "Find your neighborhood inspector contact so you can route non-urgent questions correctly.";
    if (key.includes("from report to enforcement")) return "After a report, HHVC may inspect, issue notices, and schedule follow-up visits until conditions improve.";
    if (key.includes("tenant and owner roles")) return "Tenants support access and communication; owners complete repairs and document compliance.";
    if (key.includes("save your case details")) return "Keep your case number, dates, and photos together so inspection follow-up is easier.";
    if (key.includes("prepare the inspection area")) return "Clear access to affected rooms so inspectors can verify visible conditions quickly.";
    if (key.includes("enforcement outcomes")) return "If conditions remain unresolved, you may receive additional notices or hearing instructions.";
    if (key.includes("how to avoid enforcement")) return "Respond early, complete repairs, and document progress before follow-up deadlines.";
    return "Use this section to explain the user’s next clear action in plain language.";
  };
  const normalizeSectionBody = (body: string, heading: string) => (body.includes("[Content to be generated]") ? sectionFallback(heading) : body);
  const relatedList = (tmpl.related || []).map((r) => `- ${r}`).join("\n");
  const sectionBlocks = tmpl.sections.map((s) => `Section heading: ${s.heading}\nSection body: ${normalizeSectionBody(s.body, s.heading)}`).join("\n\n");
  const calloutBlocks = (tmpl.callouts || []).map((c) => `Callout: ${c}`).join("\n\n");
  const ctaLabel = tmpl.cta || "Report to 311";
  const ctaBlock = tmpl.cta ? `\nButton link: ${tmpl.cta}\n` : "";

  const reportWhatToDoBlock = isReportTransaction
    ? `Section heading: Before you report to 311\nSection body: ${REPORT_TRANSACTION_BEFORE_311_BODY}\nButton link: ${ctaLabel}\nAction link: Report to 311 https://sf311.org\nPhone number: 311\n\nSection heading: What happens after you use 311\nSection body: ${REPORT_TRANSACTION_POST_CTA_ROUTING_BODY}\n\n`
    : ctaBlock;

  const raw = `PAGE NAME:\n${tmpl.name}\n\nPRIMARY USER:\n${tmpl.userType}\n\nUSER GOAL:\nComplete the main task for this page quickly.\n\nPRIMARY PURPOSE:\n${tmpl.summary}\n\nPAGE TYPE:\n${tmpl.pageType}\n\nRECOMMENDED COMPONENTS:\n- Section\n- Callout\n- Text${tmpl.cta || isReportTransaction ? "\n- Button link" : ""}${isReportTransaction ? "\n- Action link\n- Phone number" : ""}\n\nSYSTEM RELATIONSHIPS:\n${parentLine}\nSiblings: See related pages below.\nChildren: None by default.\nEntry Points: SF.gov search and HHVC hub navigation.\nNext Steps: Follow linked report, prevention, or support pages.\n\nDUPLICATION RISKS:\n- Check overlap with existing HHVC pages before publish.\n\nENFORCEMENT CHECK:\n- What can be verified: visible conditions, submitted reports, and documented repairs.\n- What is unclear or not enforceable: assumptions without inspection evidence.\n\nPAGE DRAFT\n\n# ${tmpl.serviceTitle}\n\nDescription: ${tmpl.summary}\n\n## What to know\n${sectionBlocks}\n\n${calloutBlocks ? calloutBlocks + "\n\n" : ""}## What to do\n${reportWhatToDoBlock}## Related\n${relatedList}\n\nINTEGRATION NOTES:\n- Content Title: ${tmpl.contentTitle}\n- Hub: ${tmpl.hub}\n- Seed draft generated with concrete starter copy for all sections.`;

  const parsed = parsePage(raw);
  return {
    ...parsed,
    id: `skeleton_${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    createdAt: new Date().toISOString(),
    karlConnected: false,
    skeleton: true,
    inputs: { topic: tmpl.name, userType: tmpl.userType, notes: `Hub: ${tmpl.hub}` }
  } as PageDraft;
};
