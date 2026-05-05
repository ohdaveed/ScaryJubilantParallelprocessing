import React, { useCallback, useMemo, useRef } from "react";
import { PageDraft } from "../types";
import { clean } from "../utils/core";
import { TYPE_META } from "../constants";

type Hub =
  | "main"
  | "report"
  | "fix"
  | "prevent"
  | "programs"
  | "tools"
  | "fees"
  | "resources"
  | "unplaced";

export function assignHub(page: PageDraft): Hub {
  const name = (page.name || "").toLowerCase();
  if (name.includes("healthy housing and pests")) return "main";
  if (name.includes("dead bird") && name.includes("west nile")) return "programs";
  if (name.includes("get help with a housing or pest problem")) return "resources";
  if (name.includes("report a housing or pest problem")) return "report";
  if (name.startsWith("report ") || name.includes("311")) return "report";
  if (name.includes("inspection") || name.includes("notice of violation") || name.includes("enforcement") || name.includes("reinspection") || name.includes("fix a problem in your building")) return "fix";
  if (name.startsWith("prevent") || name.startsWith("keep") || name.startsWith("store") || name.startsWith("reduce") || name.includes("prevent pests and health problems")) return "prevent";
  if (name.includes("programs and services") || name.includes("workshop") || name.includes("west nile") || name.includes("healthy housing program") || name.includes("what we inspect") || name.includes("respond to complaints")) return "programs";
  if (name.includes("tools and lookup") || name.includes("tools, fees, and help") || name.includes("look up") || name.includes("find your healthy housing inspector")) return "tools";
  if (name.includes("fees and payments") || name.includes("pay your healthy housing fee")) return "fees";
  if (name.includes("resources and help") || name.includes("guides and resources") || name.includes("contact healthy housing and vector control")) return "resources";

  const userType = (page.userType || "").toLowerCase();
  if (userType.includes("owner") || userType.includes("landlord")) return "fees";

  const pageType = (page.pageType || "").toLowerCase();
  if (pageType.includes("topic")) return "main";

  const rel = (page.relationships || "").toLowerCase();
  if (rel.includes("report") || rel.includes("311")) return "report";
  if (rel.includes("inspection") || rel.includes("violation") || rel.includes("enforcement")) return "fix";
  if (rel.includes("prevent") || rel.includes("prevention")) return "prevent";
  if (rel.includes("program") || rel.includes("workshop") || rel.includes("west nile")) return "programs";
  if (rel.includes("lookup") || rel.includes("inspector") || rel.includes("violations")) return "tools";
  if (rel.includes("fee") || rel.includes("payment")) return "fees";
  if (rel.includes("resource") || rel.includes("contact") || rel.includes("help")) return "resources";

  return "unplaced";
}

const HUB_META: Record<Hub, { label: string; color: string; dashed: boolean }> = {
  main:      { label: "Main Topic",             color: "#3B6D11", dashed: false },
  report:    { label: "Report and 311",         color: "#185FA5", dashed: false },
  fix:       { label: "Fix and Enforcement",    color: "#854F0B", dashed: false },
  prevent:   { label: "Prevention",             color: "#6B21A8", dashed: false },
  programs:  { label: "Programs and Services",  color: "#0E766E", dashed: false },
  tools:     { label: "Tools and Lookup",       color: "#3730A3", dashed: false },
  fees:      { label: "Fees and Payments",      color: "#9A3412", dashed: false },
  resources: { label: "Resources and Help",     color: "#0F6E56", dashed: false },
  unplaced:  { label: "Unplaced",               color: "#888780", dashed: true  },
};

const REVIEW_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#FAEEDA", color: "#854F0B" },
  approved: { bg: "#E1F5EE", color: "#0F6E56" },
  rejected: { bg: "#FCEBEB", color: "#A32D2D" },
};

const HUB_ORDER: Hub[] = ["main", "report", "fix", "prevent", "programs", "tools", "fees", "resources", "unplaced"];

export default function IdealSiteMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const byHub: Record<Hub, PageDraft[]> = {
      main: [], report: [], fix: [], prevent: [], programs: [], tools: [], fees: [], resources: [], unplaced: []
    };
    pages.forEach((p) => {
      byHub[assignHub(p)].push(p);
    });
    return byHub;
  }, [pages]);

  const handleDownload = useCallback(async () => {
    if (!mapRef.current) return;
    await document.fonts.ready;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(mapRef.current, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "hhvc-sitemap.png";
      a.click();
    } catch (err) {
      console.error("Site map download failed:", err);
    }
  }, []);

  if (!pages.length) {
    return (
      <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No pages yet</p>
        <p style={{ fontSize: 13, margin: 0 }}>Generate pages in the Builder tab to populate the site map.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)", background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)",
          }}
        >
          Download Site Map
        </button>
      </div>

      <div ref={mapRef} style={{ background: "#ffffff", padding: 24, borderRadius: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C8B87", marginBottom: 20, marginTop: 0 }}>
          HHVC Site Map · {pages.length} page{pages.length !== 1 ? "s" : ""}
        </p>

        {HUB_ORDER.map(hub => {
          const hubPages = grouped[hub];
          if (!hubPages.length) return null;
          const meta = HUB_META[hub];
          return (
            <div key={hub} style={{
              marginBottom: 16,
              border: `1px ${meta.dashed ? "dashed" : "solid"} ${meta.color}40`,
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "8px 16px",
                background: `${meta.color}10`,
                borderBottom: `1px ${meta.dashed ? "dashed" : "solid"} ${meta.color}30`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: meta.color, opacity: 0.7 }}>{hubPages.length}</span>
              </div>
              <div style={{ padding: "8px 0" }}>
                {hubPages.map(p => {
                  const typeMeta = TYPE_META[clean(p.pageType)] || { dot: "#888" };
                  const review = p.imported && p.reviewStatus ? REVIEW_COLORS[p.reviewStatus] : null;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelect(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "7px 16px", cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F7F6F2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: typeMeta.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#3D3C38", flex: 1, lineHeight: 1.4 }}>{clean(p.name) || "Untitled"}</span>
                      <span style={{ fontSize: 10, color: "#8C8B87", flexShrink: 0 }}>{clean(p.pageType)}</span>
                      {review && (
                        <span style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 4,
                          background: review.bg, color: review.color, flexShrink: 0,
                        }}>
                          {p.reviewStatus}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}