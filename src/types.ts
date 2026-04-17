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
  integration: string;
  valid: boolean;
  raw: string;
  createdAt: string;
  karlConnected: boolean;
  karlEvaluation?: KarlEvaluation;
  skeleton?: boolean;
  imported?: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
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

export interface SuggestedPage {
  topic: string;
  userType: string;
  pageType: string;
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

export interface TodoItem {
  id: number;
  topic: string;
  userType: string;
  done: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
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
}
