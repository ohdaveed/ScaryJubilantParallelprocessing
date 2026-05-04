import { useCallback, useEffect, useState } from "react";
import { PageDraft, TodoItem } from "../types";
import { lsLegacy, pagesApi, todosApi } from "../utils";

export function usePagesData() {
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
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
                await todosApi.create(t.topic, t.userType, t.plannedId != null ? { plannedId: t.plannedId } : undefined);
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

  return {
    pages,
    setPages,
    pagesLoading,
    refreshPages,
    deletePage
  };
}
