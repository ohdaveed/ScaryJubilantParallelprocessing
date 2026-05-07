import { useCallback, useEffect, useState } from "react";
import { PageDraft, TodoItem } from "../types";
import { lsLegacy } from "../utils/core";
import { pagesApi, todosApi } from "../utils/api";

export function usePagesData() {
  const [pages, setPages] = useState<PageDraft[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        const dbPages = await pagesApi.list();

        const lsPageKeys = lsLegacy.listPageKeys();
        const migratedResults = await Promise.all(lsPageKeys.map(async (k) => {
          try {
            const val = lsLegacy.getPage(k);
            if (!val) return null;
            const p = JSON.parse(val) as PageDraft;
            const newId = p.id.startsWith("hhvc:") ? `page_${p.id.slice(5)}` : p.id;
            const updated = { ...p, id: newId };
            await pagesApi.save(newId, updated);
            lsLegacy.removePage(k);
            return updated;
          } catch {
            // Ignore malformed legacy records and continue migration.
            return null;
          }
        }));
        const migrated: PageDraft[] = migratedResults.filter((page): page is PageDraft => page != null);

        const lsTodosRaw = lsLegacy.getTodos();
        if (lsTodosRaw) {
          try {
            const lsTodos = JSON.parse(lsTodosRaw) as TodoItem[];
            const todoResults = await Promise.all(lsTodos.map(async (t) => {
              try {
                await todosApi.create(t.topic, t.userType, t.plannedId != null ? { plannedId: t.plannedId } : undefined);
                return { ok: true as const };
              } catch {
                return { ok: false as const };
              }
            }));
            const failedTodos = lsTodos.filter((_, index) => !todoResults[index].ok);
            if (failedTodos.length === 0) {
              lsLegacy.removeTodos();
            } else {
              localStorage.setItem("hhvc:todos", JSON.stringify(failedTodos));
            }
          } catch {
            // Ignore malformed legacy todo payload.
          }
        }

        const byId = new Map<string, PageDraft>();
        [...dbPages, ...migrated].forEach((page) => {
          if (!page?.id) return;
          byId.set(page.id, page);
        });
        setPages(Array.from(byId.values()));
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

  const hydratePage = useCallback(async (id: string): Promise<PageDraft | null> => {
    const existing = pages.find((p) => p.id === id);
    if (existing?.contentHydrated && existing.raw) return existing;
    try {
      const full = await pagesApi.get(id);
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...full, contentHydrated: true } : p)));
      return full;
    } catch (err) {
      const status = typeof err === "object" && err !== null && "httpStatus" in err ? (err as { httpStatus?: number }).httpStatus : undefined;
      if (status === 404) {
        setPages((prev) => prev.filter((p) => p.id !== id));
      }
      return null;
    }
  }, [pages]);

  const deletePage = useCallback(async (id: string) => {
    await pagesApi.delete(id).catch(() => {});
    setPages((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    pages,
    setPages,
    pagesLoading,
    refreshPages,
    hydratePage,
    deletePage
  };
}
