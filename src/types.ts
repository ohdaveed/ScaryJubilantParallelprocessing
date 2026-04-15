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
  inputs: {
    topic: string;
    userType: string;
    notes: string;
  };
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
