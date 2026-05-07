import React, { Suspense, lazy, useCallback, useMemo } from "react";
import { PAGE_TYPES, TYPE_META } from "../../constants";
import { PageDraft, PlannedPage, ReferenceExample, TodoItem } from "../../types";
import { Card } from "../ui";
const LazyIdealSiteMap = lazy(() => import("../IdealSiteMap"));

type GenerateFromReferenceHandler = (reference: ReferenceExample, suggestedPageType: string) => void;

type MapTabProps = {
  mapMode: "plan" | "view";
  setMapMode: React.Dispatch<React.SetStateAction<"plan" | "view">>;
  pages: PageDraft[];
  plannedPages: PlannedPage[];
  references: ReferenceExample[];
  plannedLoading: boolean;
  selectedPlanned: PlannedPage | null;
  setSelectedPlanned: React.Dispatch<React.SetStateAction<PlannedPage | null>>;
  addPlannedPage: (name: string, pageType: string, userType: string, parentId: number | null) => Promise<void>;
  deletePlannedPage: (id: number) => Promise<void>;
  selectById: (id: string) => void;
  generateFromPlanned: (p: PlannedPage) => void | Promise<void>;
  generateForQueue: (todo: TodoItem) => Promise<PageDraft | null>;
  onOpenQueuedPage: (pageId: string) => void;
  onLinkExistingPage?: (plannedId: number, pageId: string) => void | Promise<void>;
  onUnlinkPage?: (plannedId: number) => void | Promise<void>;
  onGenerateFromReference?: GenerateFromReferenceHandler;
  PlanDiagramComponent: React.ComponentType<{ planned: PlannedPage[]; pages: PageDraft[]; onSelectPlanned: (p: PlannedPage) => void }>;
  PlanSidebarComponent: React.ComponentType<{
    planned: PlannedPage[];
    pages: PageDraft[];
    selectedPlanned: PlannedPage | null;
    onSelectPlanned: (p: PlannedPage | null) => void;
    onAdd: (name: string, pageType: string, userType: string, parentId: number | null) => void;
    onDelete: (id: number) => void;
    onGenerate: (p: PlannedPage) => void | Promise<void>;
    onViewPage: (pageId: string) => void;
    onLinkExistingPage?: (plannedId: number, pageId: string) => void | Promise<void>;
    onUnlinkPage?: (plannedId: number) => void | Promise<void>;
  }>;
  TodoPanelComponent: React.ComponentType<{
    generateForQueue: (todo: TodoItem) => Promise<PageDraft | null>;
    onOpenPage: (pageId: string) => void;
    plannedPages?: PlannedPage[];
  }>;
};

export function MapTab(props: MapTabProps) {
  const {
    mapMode,
    setMapMode,
    pages,
    plannedPages,
    references,
    plannedLoading,
    selectedPlanned,
    setSelectedPlanned,
    addPlannedPage,
    deletePlannedPage,
    selectById,
    generateFromPlanned,
    generateForQueue,
    onOpenQueuedPage,
    onLinkExistingPage,
    onUnlinkPage,
    onGenerateFromReference,
    PlanDiagramComponent,
    PlanSidebarComponent,
    TodoPanelComponent
  } = props;

  const pageTypeLegend = useMemo(() => PAGE_TYPES.map((t) => {
      const c = TYPE_META[t];
      return (
        <span
          key={t}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            borderRadius: 20,
            background: c.fill,
            color: c.text,
            border: `1px solid ${c.stroke}`
          }}
        >
          {t}
        </span>
      );
    }), []);

  const handleMapModeChange = useCallback(
    (mode: "plan" | "view") => setMapMode(mode),
    [setMapMode]
  );

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 2, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: 3, width: "fit-content" }}>
                {(["plan", "view"] as const).map((m) => (
            <button key={m} onClick={() => handleMapModeChange(m)}
              style={{
                fontSize: 12, fontWeight: mapMode === m ? 500 : 400,
                color: mapMode === m ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                background: mapMode === m ? "var(--color-background-primary)" : "transparent",
                border: mapMode === m ? "0.5px solid var(--color-border-tertiary)" : "0.5px solid transparent",
                borderRadius: "var(--border-radius-sm, 4px)", padding: "5px 14px", cursor: "pointer",
                transition: "all 0.15s"
              }}>
              {m === "plan" ? "Plan" : "View"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        {mapMode === "view" ? (
          <>
            <div>
              <Card className="ui-card--map">
                <Suspense fallback={<div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>Loading site map…</div>}>
                  <LazyIdealSiteMap references={references} onGenerateFromReference={onGenerateFromReference} />
                </Suspense>
              </Card>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E8EFFA", color: "#185FA5", border: "1px solid #185FA533" }}>reference</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px dashed var(--color-border-secondary)" }}>not working IA</span>
              </div>
            </div>
            <TodoPanelComponent generateForQueue={generateForQueue} onOpenPage={onOpenQueuedPage} plannedPages={plannedPages} />
          </>
        ) : (
          <>
            <div>
              <Card className="ui-card--map">
                {plannedLoading ? (
                  <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--color-border-secondary)", borderTopColor: "var(--color-text-secondary)", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Loading canonical site plan…</p>
                  </div>
                ) : (
                  <PlanDiagramComponent planned={plannedPages} pages={pages} onSelectPlanned={setSelectedPlanned} />
                )}
              </Card>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                {pageTypeLegend}
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-primary)", color: "var(--color-text-tertiary)", border: "0.5px dashed var(--color-border-secondary)" }}>canonical concept</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "#0F6E56", border: "1px solid #0F6E5640" }}>current artifact linked</span>
              </div>
            </div>
            <PlanSidebarComponent
              planned={plannedPages}
              pages={pages}
              selectedPlanned={selectedPlanned}
              onSelectPlanned={setSelectedPlanned}
              onAdd={addPlannedPage}
              onDelete={deletePlannedPage}
              onGenerate={generateFromPlanned}
              onViewPage={selectById}
              onLinkExistingPage={onLinkExistingPage}
              onUnlinkPage={onUnlinkPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
