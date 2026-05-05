export interface PageData {
  id?: string;
  name?: string;
  raw?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface Version {
  id: number | string;
  pageId: string;
  versionNumber: number;
  notes?: string | null;
  trigger?: string;
  createdAt: string;
  data?: any;
}

export interface Todo {
  id: number | string;
  topic: string;
  userType: string;
  done: boolean;
  status?: string;
  errorMessage?: string | null;
  builtPageId?: string | null;
  karlGrade?: string | null;
  plannedId?: number | null;
  createdAt?: string;
  [key: string]: any;
}

export interface PlannedPage {
  id: number | string;
  name: string;
  pageType: string;
  userType: string;
  parentId?: number | null;
  builtPageId?: string | null;
  createdAt?: string;
}

export interface PersistenceListPagesOptions {
  fields?: string[];
  includeDraft?: boolean;
  includeRaw?: boolean;
  includeDraftPreview?: boolean;
  draftPreviewChars?: number;
  limit?: number;
  offset?: number;
}

export interface PersistenceStore {
  mode: "file" | "postgres";
  location?: string;

  listPreferences(pageId?: string | null): Promise<Array<any>>;
  createPreference(preference: string, source?: string, pageId?: string | null): Promise<any>;
  deletePreference(id: number | string): Promise<void>;

  listPages(options?: PersistenceListPagesOptions): Promise<PageData[]>;
  getPage(id: string): Promise<PageData | null>;
  savePage(id: string, data: any): Promise<void>;
  deletePage(id: string): Promise<void>;
  listPageNames(): Promise<Array<{ name: string }>>;
  insertImportedPage(id: string, data: any, createdAt?: string): Promise<void>;
  updatePageReview(id: string, status: string): Promise<any>;

  listTodos(): Promise<Todo[]>;
  createTodo(topic: string, userType: string, opts?: { plannedId?: number }): Promise<Todo>;
  updateTodo(id: number | string, done: boolean): Promise<Todo | null>;
  updateTodoQueue(id: number | string, patch: { status?: string; errorMessage?: string; builtPageId?: string; karlGrade?: string }): Promise<Todo | null>;
  deleteTodo(id: number | string): Promise<void>;

  listPlannedPages(): Promise<PlannedPage[]>;
  getPlannedPage(id: number | string): Promise<PlannedPage | null>;
  createPlannedPage(name: string, pageType: string, userType: string, parentId?: number | null): Promise<PlannedPage>;
  updatePlannedPage(id: number | string, patch: { name?: string; pageType?: string; userType?: string; parentId?: number | null; builtPageId?: string | null }): Promise<PlannedPage | null>;
  deletePlannedPage(id: number | string): Promise<void>;

  saveVersion(pageId: string, data: any, notes?: string | null, trigger?: string): Promise<void>;
  getVersions(pageId: string, opts?: { limit?: number; includeData?: boolean }): Promise<Version[]>;
  getVersion(versionId: number | string): Promise<Version | null>;
}

export function createPersistence(opts?: { databaseUrl?: string; fallbackMode?: string; localPath?: string }): Promise<PersistenceStore>;
export const PAGE_VERSION_RETENTION: number;
