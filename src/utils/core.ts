import { PEST_KW, REPORT_TRANSACTION_BEFORE_311_BODY, REPORT_TRANSACTION_POST_CTA_ROUTING_BODY } from "../constants";
import type { PageDraft, PlannedPage, VerificationState } from "../types";

export const isPest = (t: string): boolean => {
  return PEST_KW.some((k) => t.toLowerCase().includes(k));
};

export const clean = (s?: string): string => {
  return (s || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/_{2}/g, "")
    .replace(/_/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/`/g, "")
    .replace(/^\s*[-–]\s*/gm, "")
    .trim();
};

export const parseRel = (rel: string): { parent: string; siblings: string; children: string; entry: string; next: string } => {
  const get = (label: string) => {
    const match = (rel || "").match(new RegExp(`${label}:([^\\n]*)`, "i"));
    return match ? clean(match[1]) : "";
  };

  return {
    parent: get("Parent"),
    siblings: get("Siblings"),
    children: get("Children"),
    entry: get("Entry Points"),
    next: get("Next Steps")
  };
};

export const getVerificationState = (page: PageDraft): VerificationState => {
  if (page.imported) {
    if (page.reviewStatus === "approved") return "import_approved";
    if (page.reviewStatus === "rejected") return "import_rejected";
    return "import_pending_review";
  }
  if (page.qualityGate?.status === "review_required") return "review_required";
  if (page.karlEvaluation) return "verified";
  return "not_checked";
};

export const getVerificationLabel = (state: VerificationState): string => {
  switch (state) {
    case "verified":
      return "verified";
    case "review_required":
      return "needs review";
    case "import_pending_review":
      return "import: pending";
    case "import_approved":
      return "import: approved";
    case "import_rejected":
      return "import: rejected";
    default:
      return "not checked";
  }
};

export const findOverlappingPageIds = (pages: PageDraft[]): Set<string> => {
  const byTitle = new Map<string, string[]>();
  for (const page of pages) {
    const key = clean(page.name).toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) continue;
    const existing = byTitle.get(key);
    if (existing) existing.push(page.id);
    else byTitle.set(key, [page.id]);
  }
  const overlapIds = new Set<string>();
  byTitle.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => overlapIds.add(id));
  });
  return overlapIds;
};

export const VERIFICATION_FILTERS: ReadonlyArray<{ id: VerificationState | "all"; label: string }> = [
  { id: "all", label: "All verification states" },
  { id: "verified", label: "Verified" },
  { id: "review_required", label: "Needs manual review" },
  { id: "import_pending_review", label: "Import pending review" },
  { id: "import_approved", label: "Import approved" },
  { id: "import_rejected", label: "Import rejected" },
  { id: "not_checked", label: "Not checked" }
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function formatVersionOrMonth(page: { version?: string; created_at?: string; createdAt?: string }): string {
  if (page.version && page.version.trim() !== "") {
    return page.version;
  }
  const dateStr = page.created_at || page.createdAt || "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function sanitizeFilename(filename: string): string {
  const sanitized = filename.replace(/[\\/"*?<>|:]/g, "").replace(/\s+/g, " ").trim();
  return sanitized || "untitled";
}

export const lsLegacy = {
  listPageKeys: (): string[] =>
    Object.keys(localStorage).filter((k) => k.startsWith("hhvc:") && k !== "hhvc:todos"),
  getPage: (key: string): string | null => localStorage.getItem(key),
  removePage: (key: string): void => {
    localStorage.removeItem(key);
  },
  getTodos: (): string | null => localStorage.getItem("hhvc:todos"),
  removeTodos: (): void => {
    localStorage.removeItem("hhvc:todos");
  }
};

export const REPORT_TRANSACTION_SEEDING_TEXT = {
  before311: REPORT_TRANSACTION_BEFORE_311_BODY,
  after311: REPORT_TRANSACTION_POST_CTA_ROUTING_BODY
};
