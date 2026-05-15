import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "../context/WorkspaceContext";
import { MapTab } from "../components/tabs/MapTab";
import { PlanDiagram } from "../components/PlanDiagram";
import { PlanSidebar } from "../components/PlanSidebar";
import { TodoPanel } from "../components/TodoPanel";
import { CanonicalIaInspector } from "../components/CanonicalIaInspector";
import { TodoItem } from "../types";
import { useReferenceGenerationNavigation } from "../hooks/useReferenceGenerationNavigation";

export default function PlanPage() {
  const ctx = useWorkspace();
  const navigate = useNavigate();

  const {
    pages, plannedPages, plannedLoading, selectedPlanned,
    setSelectedPlanned, mapMode, setMapMode, addPlannedPage,
    deletePlannedPage, openPageById, generate, linkPlannedPage,
    setTopic, setTopicTouched, setNotes, setPendingPageType, setPendingPlannedId
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
      const { todosApi } = await import("../api");
      await todosApi.create(p.name, p.userType, { plannedId: p.id });
    } catch (err) {
      console.error("Failed to enqueue planned page:", err);
    }
  }, []);

  const handleLinkExistingPage = useCallback(
    async (plannedId: number, pageId: string) => {
      await linkPlannedPage(plannedId, pageId);
    },
    [linkPlannedPage]
  );

  const handleUnlinkPage = useCallback(
    async (plannedId: number) => {
      await linkPlannedPage(plannedId, null);
    },
    [linkPlannedPage]
  );

  // REFACTORED: Reused shared hook for reference->generate navigation flow to remove duplicated page logic.
  const handleGenerateFromReference = useReferenceGenerationNavigation({
    navigate,
    setTopic,
    setTopicTouched,
    setNotes,
    setPendingPageType,
    setPendingPlannedId
  });

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
        onLinkExistingPage={handleLinkExistingPage}
        onUnlinkPage={handleUnlinkPage}
        onGenerateFromReference={handleGenerateFromReference}
      />
      <div style={{ marginTop: 20 }}>
        <CanonicalIaInspector concepts={ctx.concepts} nodes={ctx.nodes} />
      </div>
    </div>
  );
}
