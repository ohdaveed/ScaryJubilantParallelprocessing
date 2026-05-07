export interface KarlEvaluation {
  score: number;
  grade: string;
  summary: string;
  passed: string[];
  warnings: string[];
  failed: string[];
  parseError?: boolean;
  parseFailureReason?: string;
  confidence?: "high" | "medium" | "low";
}

export type ParseErrorCode =
  | "missing_json_object"
  | "invalid_json"
  | "schema_invalid"
  | "missing_required_fields";

export interface ParseErrorDetail {
  code: ParseErrorCode;
  message: string;
}

// REFACTORED: Added explicit unions for core constrained page/user values.
export type PageType =
  | "Transaction"
  | "Information"
  | "Topic"
  | "Step by step"
  | "Location"
  | "Resource Collection"
  | "Campaign"
  | "News"
  | "Event"
  | "About"
  | "Meeting"
  | "Profile"
  | "Data story"
  | "Reports";

export type UserType =
  | "Resident / tenant"
  | "Property owner / landlord"
  | "General public"
  | "Property manager"
  | "HHVC staff";

export interface ParsedPageFields {
  raw: string;
  name: string;
  userType: string;
  userGoal: string;
  purpose: string;
  pageType: string;
  components: string;
  relationships: string;
  duplication: string;
  enforcement: string;
  draft: string;
  integration: string;
  valid: boolean;
}

export interface ParseStructuredResult {
  rawText: string;
  parsed: ParsedPageFields | null;
  parseError: ParseErrorDetail | null;
}

export interface GenerationValidationResult {
  ok: boolean;
  failures: string[];
  warnings: string[];
}

export interface StructuredPageOutput {
  page: {
    name: string;
    primaryUser: string;
    userGoal: string;
    primaryPurpose: string;
    pageType: string;
    recommendedComponents: string[];
    systemRelationships: {
      parent: string;
      siblings: string;
      children: string;
      entryPoints: string;
      nextSteps: string;
    };
    duplicationRisks: string[];
    enforcementCheck: {
      verifiable: string[];
      unclearOrNotEnforceable: string[];
    };
    pageDraft: string;
    integrationNotes: string[];
  };
}

export type ReviewStatus = "pending" | "approved" | "rejected";
export type VerificationState =
  | "verified"
  | "review_required"
  | "import_pending_review"
  | "import_approved"
  | "import_rejected"
  | "not_checked";

export type ContentType =
  | "topic"
  | "transaction"
  | "information"
  | "step_by_step"
  | "campaign"
  | "resource_collection";
export type ConceptStatus = "proposed" | "canonical" | "deferred" | "archived";
export type IAPlacementStatus = "placed" | "orphaned" | "deferred";
export type ArtifactKind = "draft" | "imported" | "built" | "published_snapshot" | "experiment";
export type ArtifactSource = "generate" | "import" | "manual";
export type ArtifactWorkflowStatus = "draft" | "in_review" | "approved" | "built" | "archived";
export type ArtifactStatus = "draft" | "needs_review" | "ready" | "published" | "archived";
export type CheckStatus = "not_checked" | "checking" | "passed" | "failed";
export type ImportStatus = "none" | "pending" | "approved" | "rejected";
export type VariantStatus = "exploring" | "shortlisted" | "accepted" | "rejected";
export type QueueStatus = "queued" | "generating" | "blocked" | "done" | "failed";

export interface GovernanceFlag {
  id: string;
  severity: "warning" | "error";
  message: string;
}

export interface PageConcept {
  id: number;
  intentKey: string;
  taskStatement: string;
  canonicalTitle: string;
  contentType: ContentType;
  audience: string;
  serviceArea: string;
  status: ConceptStatus;
  summary: string;
  parentConceptId: number | null;
  createdAt: string;
  updatedAt: string;
  governanceFlags?: GovernanceFlag[];
  canonicalArtifactId?: string | null;
}

export interface IANode {
  id: number;
  conceptId: number;
  iaMapId: string;
  parentNodeId: number | null;
  position: number;
  placementStatus: IAPlacementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PageArtifact {
  id: string;
  conceptId: number | null;
  artifactKind: ArtifactKind;
  source: ArtifactSource;
  title: string;
  contentType: ContentType;
  bodyRaw: string;
  bodyStructured: Record<string, unknown>;
  workflowStatus: ArtifactWorkflowStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  reviewStatus?: ReviewStatus;
  inputs?: {
    topic: string;
    userType: string;
    notes: string;
  };
  karlConnected?: boolean;
  karlEvaluation?: KarlEvaluation;
  skeleton?: boolean;
  imported?: boolean;
  qualityGate?: {
    status: "pass" | "review_required";
    reasons: string[];
  };
  status?: ArtifactStatus;
  checkStatus?: CheckStatus;
  importStatus?: ImportStatus;
  activeVersionId?: number | null;
  verifiedVersionId?: number | null;
  isCanonical?: boolean;
}

export interface ArtifactVersion {
  id: number;
  artifactId: string;
  versionNumber: number;
  changeType: "generate" | "edit" | "refine" | "restore";
  snapshot?: PageArtifact;
  notes: string | null;
  createdAt: string;
}

export interface ArtifactVariant {
  id: number;
  conceptId: number;
  baseArtifactId: string;
  artifactId: string;
  variantLabel: string;
  reason: string;
  status: VariantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceExample {
  id: number;
  title: string;
  sourceSystem: string;
  referenceType: string;
  notes: string;
  mappedPattern: string;
  referenceMapId: string;
}

export interface BuildQueueItem {
  id: number;
  conceptId: number | null;
  artifactId: string | null;
  queueStatus: QueueStatus;
  priority: number;
  requestedBy: string;
  createdAt: string;
  topic: string;
  audience: string;
  errorMessage?: string | null;
  karlGrade?: string | null;
}

export interface PageDraft {
  id: string;
  name: string;
  userType: string;
  userGoal: string;
  purpose: string;
  pageType: string;
  components: string;
  relationships: string;
  duplication: string;
  enforcement: string;
  draft: string;
  draftPreview?: string;
  integration: string;
  valid: boolean;
  raw: string;
  createdAt: string;
  karlConnected: boolean;
  karlEvaluation?: KarlEvaluation;
  skeleton?: boolean;
  imported?: boolean;
  /** Latest snapshot number from page_versions (set by API on list; not persisted). */
  currentVersionNumber?: number;
  /** True when the record includes full draft/raw payloads from detail API. */
  contentHydrated?: boolean;
  version?: string;
  reviewStatus?: ReviewStatus;
  qualityGate?: {
    status: "pass" | "review_required";
    reasons: string[];
  };
  inputs: {
    topic: string;
    userType: string;
    notes: string;
  };
}

export interface SkeletonTemplate {
  name: string;
  contentTitle: string;
  serviceTitle: string;
  summary: string;
  pageType: string;
  userType: string;
  hub: string;
  parentName?: string;
  cta?: string;
  sections: { heading: string; body: string }[];
  callouts?: string[];
  related?: string[];
}

export interface Milestone {
  pct: number;
  label: string;
}

export interface ComponentStyle {
  accent: string;
  bg: string;
  icon: string;
}

export interface RelMap {
  parent: string;
  siblings: string;
  children: string;
  entry: string;
  next: string;
}

export type TodoStatus = "pending" | "generating" | "done" | "failed";

export interface TodoItem {
  id: number;
  topic: string;
  userType: string;
  done: boolean;
  status: TodoStatus;
  errorMessage: string | null;
  builtPageId: string | null;
  karlGrade: string | null;
  /** When set, queue generation links this build to the planned page row. */
  plannedId: number | null;
}

export interface UserPreference {
  id: number;
  preference: string;
  source: string;
  pageId?: string | null;
  createdAt: string;
}

export interface PlannedPage {
  id: number;
  name: string;
  pageType: string;
  userType: string;
  parentId: number | null;
  builtPageId: string | null;
  createdAt: string;
  conceptId?: number;
  status?: ConceptStatus;
  objectRole?: "concept";
  taskStatement?: string;
  governanceFlags?: GovernanceFlag[];
}

export interface PageVersion {
  id: number;
  pageId: string;
  versionNumber: number;
  data?: PageDraft;
  notes: string | null;
  trigger: "generate" | "refine" | "restore" | "manual";
  createdAt: string;
}
