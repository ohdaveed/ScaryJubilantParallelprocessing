import React, { memo } from "react";
import { PageDraft, PlannedPage } from "../types";
import { TYPE_META } from "../constants";

const W = 680, H = 400;

export const PlanDiagram = memo(function PlanDiagram({ planned, pages, onSelectPlanned }: { planned: PlannedPage[]; pages: PageDraft[]; onSelectPlanned: (p: PlannedPage) => void }) {
  if (!planned.length) return (
    <div className="app-plan-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" /><path d="M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" /></svg>
      <div className="app-plan-empty__text">
        <p className="app-plan-empty__title">No planned pages yet</p>
        <p className="app-plan-empty__sub">Add pages using the form to sketch your site architecture.</p>
      </div>
    </div>
  );

  const builtPageIds = new Set(pages.map(p => p.id));

  type PlanNode = { id: number; name: string; type: string; x: number; y: number; built: boolean; parentId: number | null };
  type PlanEdge = [number, number];

  const roots = planned.filter(p => !p.parentId);
  const children = planned.filter(p => p.parentId);

  const nodes: PlanNode[] = [];
  roots.forEach((p, i) => {
    const a = (2 * Math.PI * i / Math.max(roots.length, 1)) - Math.PI / 2;
    const r = roots.length === 1 ? 0 : 74;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + r * Math.cos(a), y: H / 2 + r * Math.sin(a) * 0.7, built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });
  children.forEach((p, i) => {
    const a = (2 * Math.PI * i / Math.max(children.length, 1)) - Math.PI / 2;
    nodes.push({ id: p.id, name: p.name, type: p.pageType, x: W / 2 + 205 * Math.cos(a), y: H / 2 + 176 * Math.sin(a), built: !!p.builtPageId && builtPageIds.has(p.builtPageId), parentId: p.parentId });
  });

  const edges: PlanEdge[] = [];
  planned.forEach(p => {
    if (p.parentId) edges.push([p.parentId, p.id]);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="app-plan-svg">
      <defs>
        <linearGradient id="plan-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCFBF8" />
          <stop offset="100%" stopColor="#F4F2EC" />
        </linearGradient>
        <filter id="plan-node-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#1B1A16" floodOpacity="0.18" />
        </filter>
        <marker id="plan-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#B4B2A9" />
        </marker>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#plan-bg)" rx="16" />
      {edges.map(([a, b], i) => {
        const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
        if (!na || !nb) return null;
        const ctrlY = na.y + (nb.y - na.y) * 0.35;
        return (
          <path
            key={i}
            d={`M ${na.x} ${na.y} C ${na.x} ${ctrlY}, ${nb.x} ${ctrlY}, ${nb.x} ${nb.y}`}
            fill="none"
            stroke="#CFCABF"
            strokeWidth="1.2"
            strokeLinecap="round"
            markerEnd="url(#plan-arr)"
          />
        );
      })}
      {nodes.map(n => {
        const c = TYPE_META[n.type] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };
        const label = n.name.length > 26 ? n.name.slice(0, 24) + "\u2026" : n.name;
        const isRoot = !n.parentId;
        const rx = isRoot ? 78 : 66, ry = isRoot ? 28 : 23;
        const fill = n.built ? c.fill : "var(--color-background-primary)";
        const stroke = n.built ? c.stroke : "#B9B3A6";
        return (
          <g
            key={n.id}
            className="app-plan-node"
            style={{ cursor: "pointer" }}
            onClick={() => { const pp = planned.find(p => p.id === n.id); if (pp) onSelectPlanned(pp); }}
          >
            <ellipse cx={n.x} cy={n.y} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={isRoot ? "2.2" : "1.6"} strokeDasharray={n.built ? "none" : "4,3"} filter="url(#plan-node-shadow)" />
            <ellipse cx={n.x} cy={n.y - 1} rx={rx - 8} ry={Math.max(ry - 12, 8)} fill="#FFFFFF" opacity={n.built ? 0.2 : 0.28} />
            <text x={n.x} y={n.y + 2} textAnchor="middle" fontSize={isRoot ? 12.5 : 11.5} fontWeight={isRoot ? "600" : "500"} fill={c.text}>{label}</text>
            <g transform={`translate(${n.x}, ${n.y + (isRoot ? 14 : 12)})`}>
              <rect x={-22} y={-7} width={44} height={14} rx={7} fill={n.built ? "#E1F5EE" : "#F8F4EB"} stroke={n.built ? "#0F6E5638" : "#B9B3A655"} />
              <text textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="600" fill={n.built ? "#0F6E56" : "#7B7569"}>
                {n.built ? "BUILT" : "PLANNED"}
              </text>
            </g>
          </g>
        );
      })}
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#9A958A" fontWeight="500">{planned.length} planned · {nodes.filter(n => n.built).length} built · click a node to manage</text>
    </svg>
  );
});