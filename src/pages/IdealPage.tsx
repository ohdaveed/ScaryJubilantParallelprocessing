import React, { Suspense, lazy, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext";
import { MapTab } from "../components/tabs/MapTab";
import { IdealTabQueuePanel } from "../components/IdealTabQueuePanel";
import { PlanDiagram } from "../components/PlanDiagram";
import { PlanSidebar } from "../components/PlanSidebar";
import { Card } from "../components/ui";
import { TodoItem } from "../types";

const LazyIdealSiteMap = lazy(() => import("../components/IdealSiteMap"));

export default function IdealPage() {
  const ctx = useWorkspace();

  const {
    pages, plannedPages, references, setSelectedPlanned,
    openPageById, generate
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

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        <div>
          <Card className="ui-card--map">
            <Suspense fallback={<div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>Loading site map…</div>}>
              <LazyIdealSiteMap references={references} />
            </Suspense>
          </Card>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E8EFFA", color: "#185FA5", border: "1px solid #185FA533" }}>reference</span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-tertiary)", border: "0.5px dashed var(--color-border-secondary)" }}>not working IA</span>
          </div>
        </div>
        <IdealTabQueuePanel generateForQueue={generateForQueue} onOpenPage={(id) => { void openPageById(id); }} />
      </div>
    </div>
  );
}