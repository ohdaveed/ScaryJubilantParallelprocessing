declare module "../lib/persistence.js" {
  import { PersistenceStore } from "./persistence";
  export const PAGE_VERSION_RETENTION: number;
  export function createPersistence(opts?: { databaseUrl?: string; fallbackMode?: string; localPath?: string }): Promise<PersistenceStore>;
}

declare module "../lib/karlCitations.js" {
  export function withKarlCitations(input: string): string;
  export function enforceKarlCitationsOnEvaluation(obj: any): any;
}

declare module "../lib/karlMcp.js" {
  export function fetchKarlGuidance(...args: any[]): Promise<any>;
}

declare module "../server.js" {
  // server.js exports `app` (Express app) at runtime; tests import it via dynamic import
  import type { Express } from "express";
  export const app: Express;
}
