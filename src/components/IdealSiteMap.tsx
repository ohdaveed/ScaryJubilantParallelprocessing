import React, { useRef } from "react";
import { toPng } from "html-to-image";
import { PageDraft } from "../types";
import { clean } from "../utils";
import { TYPE_META } from "../constants";

export type Hub = "tenant" | "owner" | "community" | "unplaced";

export function assignHub(page: PageDraft): Hub {
  const userType = (page.userType || "").toLowerCase();
  if (userType.includes("resident") || userType.includes("tenant")) return "tenant";
  if (userType.includes("owner") || userType.includes("landlord")) return "owner";
  if (userType.includes("general public")) return "community";

  const pageType = (page.pageType || "").toLowerCase();
  if (pageType.includes("campaign")) return "community";

  const rel = (page.relationships || "").toLowerCase();
  if (rel.includes("tenant") || rel.includes("renter") || rel.includes("pests, mold")) return "tenant";
  if (rel.includes("owner") || rel.includes("landlord") || rel.includes("building fee")) return "owner";
  if (rel.includes("community") || rel.includes("mosquito") || rel.includes("school")) return "community";

  return "unplaced";
}

const HUB_META: Record<Hub, { label: string; color: string; dashed: boolean }> = {
  tenant:    { label: "Tenant Hub",    color: "#185FA5", dashed: false },
  owner:     { label: "Owner Hub",     color: "#0F6E56", dashed: false },
  community: { label: "Community Hub", color: "#854F0B", dashed: false },
  unplaced:  { label: "Unplaced",      color: "#888780", dashed: true  },
};

const REVIEW_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#FAEEDA", color: "#854F0B" },
  approved: { bg: "#E1F5EE", color: "#0F6E56" },
  rejected: { bg: "#FCEBEB", color: "#A32D2D" },
};

export default function IdealSiteMap({ pages, onSelect }: { pages: PageDraft[]; onSelect: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);

  const grouped: Record<Hub, PageDraft[]> = { tenant: [], owner: [], community: [], unplaced: [] };
  pages.forEach(p => grouped[assignHub(p)].push(p));

  const handleDownload = async () => {
    if (!mapRef.current) return;
    await document.fonts.ready;
    try {
      const dataUrl = await toPng(mapRef.current, { backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "hhvc-sitemap.png";
      a.click();
    } catch (err) {
      console.error("Site map download failed:", err);
    }
  };

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

        {(["tenant", "owner", "community", "unplaced"] as Hub[]).map(hub => {
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
