import type { PageDraft, VerificationState } from "../types";

export const VERIFICATION_FILTERS: ReadonlyArray<{ id: VerificationState | "all"; label: string }> = [
  { id: "all", label: "All verification states" },
  { id: "verified", label: "Verified" },
  { id: "review_required", label: "Needs manual review" },
  { id: "import_pending_review", label: "Import pending review" },
  { id: "import_approved", label: "Import approved" },
  { id: "import_rejected", label: "Import rejected" },
  { id: "not_checked", label: "Not checked" }
];

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

export interface ExportReadiness {
  managerApproved: boolean;
  standardsPass: boolean;
  karlBlockersCount: number;
  headerStatusText: string;
  readinessText: string;
  showKarlBlockers: boolean;
}

export const getExportReadiness = (page: PageDraft | null): ExportReadiness => {
  if (!page) {
    return {
      managerApproved: false,
      standardsPass: false,
      karlBlockersCount: 0,
      headerStatusText: "Not a published candidate",
      readinessText: "Submit for manager approval to publish",
      showKarlBlockers: false
    };
  }

  const managerApproved = page.reviewStatus === "approved";
  const karlBlockersCount = page.karlEvaluation?.failed?.length ?? 0;
  const standardsPass = page.qualityGate?.status === "pass" && karlBlockersCount === 0;

  if (!managerApproved) {
    return {
      managerApproved,
      standardsPass,
      karlBlockersCount,
      headerStatusText: "Not a published candidate",
      readinessText: "Submit for manager approval to publish",
      showKarlBlockers: false
    };
  }

  if (standardsPass) {
    return {
      managerApproved,
      standardsPass,
      karlBlockersCount,
      headerStatusText: "Published candidate",
      readinessText: "Standards pass (preview disabled for now)",
      showKarlBlockers: false
    };
  }

  return {
    managerApproved,
    standardsPass,
    karlBlockersCount,
    headerStatusText: "Published candidate",
    readinessText: "Export blocked: fix Karl issues first",
    showKarlBlockers: karlBlockersCount > 0
  };
};
