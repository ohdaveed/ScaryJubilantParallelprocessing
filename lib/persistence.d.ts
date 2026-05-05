import { PersistenceStore } from "../src/types/persistence";
export const PAGE_VERSION_RETENTION: number;
export function createPersistence(opts?: { databaseUrl?: string; fallbackMode?: string; localPath?: string }): Promise<PersistenceStore>;
export type { PersistenceStore } from "../src/types/persistence";
