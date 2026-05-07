import React, { useMemo } from "react";
import type { IANode, PageConcept } from "../types";
import { hhvcCanonicalWorkingIaSeedSummary } from "../data/hhvcCanonicalWorkingIaSeed";
import { Badge, Card, Label } from "./ui";
import { contentTypeLabel } from "../utils/contentModel";
import { buildCanonicalIaInspectorModel, countTreeNodes, type CanonicalIaTreeNode } from "../utils/canonicalIa";

interface CanonicalIaInspectorProps {
  concepts: PageConcept[];
  nodes: IANode[];
}

const summaryChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)",
  fontSize: 11,
  color: "var(--color-text-secondary)"
};

const treeListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0
};

const treeNodeRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "start",
  padding: "10px 0",
  borderTop: "0.5px solid var(--color-border-tertiary)"
};

function TreeNodeView({ node, depth = 0 }: { node: CanonicalIaTreeNode; depth?: number }) {
  return (
    <li>
      <div style={{ ...treeNodeRowStyle, paddingLeft: depth * 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <strong style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{node.concept.canonicalTitle}</strong>
            <Badge type={contentTypeLabel(node.concept.contentType)} small />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>
            {node.concept.summary}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8, fontSize: 11, color: "var(--color-text-tertiary)" }}>
            <span>Audience: {node.concept.audience}</span>
            <span>Status: {node.concept.status}</span>
            <span>Position: {node.node.position}</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
          #{node.concept.id}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul style={treeListStyle}>
          {node.children.map((child) => (
            <TreeNodeView key={child.node.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CanonicalIaInspector({ concepts, nodes }: CanonicalIaInspectorProps) {
  const model = useMemo(() => buildCanonicalIaInspectorModel(concepts, nodes), [concepts, nodes]);
  const liveConceptCount = model.mappedConceptIds.length;
  const liveTreeNodeCount = countTreeNodes(model.root);
  const hasMismatch = liveConceptCount !== hhvcCanonicalWorkingIaSeedSummary.concepts || liveTreeNodeCount !== hhvcCanonicalWorkingIaSeedSummary.concepts;

  return (
    <Card className="ui-card--map">
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div>
            <Label>Live Canonical IA</Label>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "var(--color-text-primary)" }}>Seeded HHVC working tree</h2>
            <p style={{ margin: 0, maxWidth: 760, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Read-only view of the live <code>hhvc-working</code> canonical map from persistence. This shows what Neon currently has, not just the local fixture.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <span style={summaryChipStyle}>expected concepts {hhvcCanonicalWorkingIaSeedSummary.concepts}</span>
            <span style={summaryChipStyle}>live concepts {liveConceptCount}</span>
            <span style={summaryChipStyle}>live nodes {liveTreeNodeCount}</span>
            <span style={{ ...summaryChipStyle, background: hasMismatch ? "#fff1f2" : "#edf7ed", color: hasMismatch ? "#9f1239" : "#166534", borderColor: hasMismatch ? "#fecdd3" : "#bbf7d0" }}>
              {hasMismatch ? "fixture drift detected" : "fixture aligned"}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}>
          <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: 14, background: "var(--color-background-primary)" }}>
            <Label>Root</Label>
            <div style={{ fontSize: 14, color: "var(--color-text-primary)", fontWeight: 600 }}>
              {model.root?.concept.canonicalTitle ?? "No root in working map"}
            </div>
          </div>
          <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: 14, background: "var(--color-background-primary)" }}>
            <Label>Top-level Hubs</Label>
            <div style={{ fontSize: 24, color: "var(--color-text-primary)", fontWeight: 600 }}>
              {model.root?.children.length ?? 0}
            </div>
          </div>
          <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: 14, background: "var(--color-background-primary)" }}>
            <Label>Orphan Canonical Concepts</Label>
            <div style={{ fontSize: 24, color: model.orphanConceptIds.length > 0 ? "var(--color-text-danger)" : "var(--color-text-primary)", fontWeight: 600 }}>
              {model.orphanConceptIds.length}
            </div>
          </div>
        </div>

        {model.orphanConceptIds.length > 0 && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "#fff7ed", border: "0.5px solid #fed7aa", fontSize: 12, color: "#9a3412" }}>
            {model.orphanConceptIds.length} canonical concept{model.orphanConceptIds.length === 1 ? "" : "s"} exist in persistence but are not placed in <code>hhvc-working</code>.
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <Label>Tree</Label>
          {model.root ? (
            <ul style={treeListStyle}>
              <TreeNodeView node={model.root} />
            </ul>
          ) : (
            <div style={{ padding: "18px 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
              No working canonical tree is currently available.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
