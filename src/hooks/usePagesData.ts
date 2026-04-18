import { useCallback, useEffect, useState } from "react";
import { PageDraft, TodoItem } from "../types";
import { lsLegacy, pagesApi, todosApi } from "../utils";
import { ImportResult } from "../state/appTypes";

export function usePagesData() {
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        const dbPages = await pagesApi.list();

        const lsPageKeys = lsLegacy.listPageKeys();
        const migrated: PageDraft[] = [];
        for (const k of lsPageKeys) {
          try {
            const val = lsLegacy.getPage(k);
            if (val) {
              const p = JSON.parse(val) as PageDraft;
              const newId = p.id.startsWith("hhvc:") ? `page_${p.id.slice(5)}` : p.id;
              const updated = { ...p, id: newId };
              await pagesApi.save(newId, updated);
              migrated.push(updated);
              lsLegacy.removePage(k);
            }
          } catch {
            // Ignore malformed legacy records and continue migration.
          }
        }

        const lsTodosRaw = lsLegacy.getTodos();
        if (lsTodosRaw) {
          try {
            const lsTodos = JSON.parse(lsTodosRaw) as TodoItem[];
            let allOk = true;
            for (const t of lsTodos) {
              try {
                await todosApi.create(t.topic, t.userType);
              } catch {
                allOk = false;
              }
            }
            if (allOk) lsLegacy.removeTodos();
          } catch {
            // Ignore malformed legacy todo payload.
          }
        }

        setPages([...dbPages, ...migrated]);
      } catch (err) {
        console.error("Failed to load pages:", err);
      }
      setPagesLoading(false);
    };

    loadAndMigrate();
  }, []);

  const refreshPages = useCallback(async () => {
    const updated = await pagesApi.list();
    setPages(updated);
  }, []);

  const deletePage = useCallback(async (id: string) => {
    await pagesApi.delete(id).catch(() => {});
    setPages((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const importPages = useCallback(async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await pagesApi.import();
      setImportResult(result);
      const updated = await pagesApi.list();
      setPages(updated);
    } catch (err) {
      console.error("Import error:", err);
      setImportResult({ inserted: -1, skipped: 0, skippedPlaceholders: 0 });
    } finally {
      setImporting(false);
    }
  }, []);

  return {
    pages,
    setPages,
    pagesLoading,
    refreshPages,
    deletePage,
    importing,
    importResult,
    importPages
  };
}
