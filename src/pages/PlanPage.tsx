import React, { useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { MapTab } from "../components/tabs/MapTab";
import { PlanDiagram } from "../components/PlanDiagram";
import { PlanSidebar } from "../components/PlanSidebar";
import { TodoPanel } from "../components/TodoPanel";
import { CanonicalIaInspector } from "../components/CanonicalIaInspector";
import { TodoItem } from "../types";

export default function PlanPage() {
  const ctx = useWorkspace();

  const {
    pages, plannedPages, plannedLoading, selectedPlanned,
    setSelectedPlanned, mapMode, setMapMode, addPlannedPage,
    deletePlannedPage, openPageById, generate
  } = ctx;

  const generateForQueue = useCallback(
    async (todo: TodoItem) => {
      const planned =
        todo.plannedId != null ? plannedPages.find((p) => p.id === todo.plannedId) : undefined;
      return generate({
        topic: todo.topic,
        userType: todo.userType,
        quiet: true,
        ...(planned ? { pageType: planned.pageType, plannedId: planned.id } : {})
      });
    },
    [generate, plannedPages]
  );

  const generateFromPlanned = useCallback(async (p: any) => {
    try {
      const { todosApi } = await import("../utils/api");
      await todosApi.create(p.name, p.userType, { plannedId: p.id });
    } catch (err) {
      console.error("Failed to enqueue planned page:", err);
    }
  }, []);

  return (
    <div className="app-studio-tab-pad">
      <MapTab
        mapMode={mapMode}
        setMapMode={setMapMode}
        pages={pages}
        plannedPages={plannedPages}
        references={ctx.references}
        plannedLoading={plannedLoading}
        selectedPlanned={selectedPlanned}
        setSelectedPlanned={setSelectedPlanned}
        addPlannedPage={addPlannedPage}
        deletePlannedPage={deletePlannedPage}
        selectById={(id) => { void openPageById(id); }}
        generateFromPlanned={generateFromPlanned}
        generateForQueue={generateForQueue}
        PlanDiagramComponent={PlanDiagram}
        PlanSidebarComponent={PlanSidebar}
        TodoPanelComponent={TodoPanel}
        onOpenQueuedPage={(id) => { void openPageById(id); }}
      />
      <div style={{ marginTop: 20 }}>
        <CanonicalIaInspector concepts={ctx.concepts} nodes={ctx.nodes} />
      </div>
    </div>
  );
}
