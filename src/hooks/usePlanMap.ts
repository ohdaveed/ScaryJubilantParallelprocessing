import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { PageDraft, PlannedPage } from "../types";
import { SITEMAP_SKELETON } from "../constants";
import { pagesApi, plannedPagesApi, skeletonToPageDraft } from "../utils/api";

export function usePlanMap(setPages: Dispatch<SetStateAction<PageDraft[]>>) {
  const [plannedPages, setPlannedPages] = useState<PlannedPage[]>([]);
  const [plannedLoading, setPlannedLoading] = useState(true);
  const [selectedPlanned, setSelectedPlanned] = useState<PlannedPage | null>(null);
  const [mapMode, setMapMode] = useState<"plan" | "view">("plan");
  const [pendingPlannedId, setPendingPlannedId] = useState<number | null>(null);
  const [pendingPageType, setPendingPageType] = useState<string>("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    plannedPagesApi
      .list()
      .then(async (existing) => {
        if (existing.length > 0) {
          setPlannedPages(existing);
          return;
        }

        setSeeding(true);
        try {
          const rootTemplates = SITEMAP_SKELETON.filter((t) => !t.parentName);
          const createdRoots = await Promise.all(
            rootTemplates.map(async (tmpl) => ({
              tmpl,
              created: await plannedPagesApi.create(tmpl.name, tmpl.pageType, tmpl.userType, null)
            }))
          );
          const hubRoots = Object.fromEntries(createdRoots.map(({ tmpl, created }) => [tmpl.name, created.id]));

          const childTemplates = SITEMAP_SKELETON.filter((t) => t.parentName);
          const createdChildren = await Promise.all(
            childTemplates.map((tmpl) => {
              const parentId = hubRoots[tmpl.parentName!] || null;
              return plannedPagesApi.create(tmpl.name, tmpl.pageType, tmpl.userType, parentId);
            })
          );

          const seeded = [...createdRoots.map(({ created }) => created), ...createdChildren];
          setPlannedPages(seeded);

          const skeletons = SITEMAP_SKELETON.map((tmpl) => skeletonToPageDraft(tmpl));
          await Promise.allSettled(
            skeletons.map((skel) => pagesApi.save(skel.id, skel, { notes: "Site map skeleton", trigger: "generate" }))
          );

          setPages((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newSkels = skeletons.filter((s) => !existingIds.has(s.id));
            return [...prev, ...newSkels];
          });

          await Promise.allSettled(
            seeded.map((pp) => {
              const matchingSkel = skeletons.find((s) => s.inputs.topic === pp.name);
              if (!matchingSkel) return Promise.resolve();
              return plannedPagesApi.update(pp.id, { builtPageId: matchingSkel.id });
            })
          );

          const finalPlanned = await plannedPagesApi.list();
          setPlannedPages(finalPlanned);
        } catch {
          setPlannedPages([]);
        }

        setSeeding(false);
      })
      .catch(() => {
        setPlannedPages([]);
        setSeeding(false);
      })
      .finally(() => setPlannedLoading(false));
  }, [setPages]);

  useEffect(() => {
    if (!selectedPlanned) return;
    const updated = plannedPages.find((p) => p.id === selectedPlanned.id);
    if (!updated) setSelectedPlanned(null);
    else if (updated.builtPageId !== selectedPlanned.builtPageId) setSelectedPlanned(updated);
  }, [plannedPages, selectedPlanned]);

  const linkPlannedPage = useCallback(async (plannedId: number, builtPageId: string | null) => {
    try {
      const updated = await plannedPagesApi.update(plannedId, { builtPageId });
      setPlannedPages((prev) => prev.map((p) => (p.id === plannedId ? updated : p)));
    } catch {
      // Keep linking non-blocking.
    }
  }, []);

  const addPlannedPage = useCallback(async (name: string, pageType: string, userType: string, parentId: number | null) => {
    try {
      const created = await plannedPagesApi.create(name, pageType, userType, parentId);
      setPlannedPages((prev) => [...prev, created]);
    } catch {
      // Keep add best-effort and non-blocking.
    }
  }, []);

  const deletePlannedPage = useCallback(async (id: number) => {
    setPlannedPages((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p) => (p.parentId === id ? { ...p, parentId: null } : p))
    );
    setSelectedPlanned(null);
    try {
      await plannedPagesApi.delete(id);
    } catch {
      // Ignore delete failures here; list can be refreshed later.
    }
  }, []);

  return {
    plannedPages,
    setPlannedPages,
    plannedLoading,
    selectedPlanned,
    setSelectedPlanned,
    mapMode,
    setMapMode,
    pendingPlannedId,
    setPendingPlannedId,
    pendingPageType,
    setPendingPageType,
    seeding,
    linkPlannedPage,
    addPlannedPage,
    deletePlannedPage
  };
}
