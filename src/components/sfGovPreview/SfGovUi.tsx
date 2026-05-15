import React from "react";
import { SF, PREVIEW_CONTENT_MAX_WIDTH } from "./constants";

export const SfGovHeader: React.FC = () => (
  <div
    style={{
      background: `linear-gradient(180deg, ${SF.white} 0%, #FDFDFC 100%)`,
      borderBottom: `1px solid ${SF.lightBorder}`,
      boxShadow: SF.headerShadow,
      padding: "0 24px",
      position: "relative" as const,
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: 3,
        background: `linear-gradient(90deg, ${SF.blue} 0%, #2D8B84 38%, #C75D2C 72%, #D4A017 100%)`,
        opacity: 0.85,
      }}
    />
    <div
      style={{
        maxWidth: PREVIEW_CONTENT_MAX_WIDTH,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        height: 58,
        gap: 8,
        paddingTop: 3
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: `conic-gradient(from 210deg, ${SF.slate4}, ${SF.blue}, ${SF.slate4})`,
            padding: 2,
            boxSizing: "border-box" as const,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: SF.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke={SF.slate4} strokeWidth="1.5" fill="none" />
              <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill={SF.slate4} fontFamily={SF.font}>SF</text>
            </svg>
          </div>
        </div>
        <span style={{ fontFamily: SF.fontDisplay, fontSize: 22, fontWeight: 700, color: SF.slate4, letterSpacing: "-0.02em" }}>SF.gov</span>
      </div>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, flexWrap: "wrap" }}>
        {["Services", "Departments", "Jobs", "Contact"].map(item => (
          <span
            key={item}
            style={{
              fontFamily: SF.font,
              fontSize: 13,
              fontWeight: 500,
              color: SF.slate4,
              cursor: "default",
              padding: "6px 10px",
              borderRadius: 6,
            }}
          >
            {item}
          </span>
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: `linear-gradient(180deg, ${SF.bg} 0%, #EBEBE5 100%)`,
            borderRadius: 8,
            marginLeft: 6,
            border: `1px solid ${SF.lightBorder}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SF.slate2} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <span style={{ fontFamily: SF.font, fontSize: 13, color: SF.slate2, fontWeight: 500 }}>Search</span>
        </div>
      </nav>
    </div>
  </div>
);

export const SfGovFooter: React.FC = () => (
  <div
    style={{
      background: `linear-gradient(180deg, #002B48 0%, ${SF.footerBg} 55%, #000814 100%)`,
      padding: "40px 24px 36px",
      marginTop: 0,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    <div style={{ maxWidth: PREVIEW_CONTENT_MAX_WIDTH, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="1.5" fill="none" />
              <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily={SF.font}>SF</text>
            </svg>
            <div>
              <div style={{ fontFamily: SF.font, fontSize: 11, fontWeight: 300, color: "#94A3B8", lineHeight: 1.3 }}>City and County of</div>
              <div style={{ fontFamily: SF.font, fontSize: 13, fontWeight: 600, color: SF.white, letterSpacing: "0.5px" }}>SAN FRANCISCO</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {["fb", "ig", "tw"].map(s => (
              <div key={s} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid #4A6880", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "#94A3B8" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
        {[
          { title: "Our City", links: ["Services", "Departments", "Jobs", "City Hall"] },
          { title: "Policy", links: ["Privacy policy", "Disclaimer"] },
          { title: "Get Help", links: ["Contact the City", "Report a Problem", "Contact 311", "Accessibility"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontFamily: SF.font, fontSize: 14, fontWeight: 600, color: SF.white, marginBottom: 12 }}>{col.title}</div>
            {col.links.map(link => (
              <div key={link} style={{ fontFamily: SF.font, fontSize: 13, color: "#94A3B8", marginBottom: 8, cursor: "default" }}>{link}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

type PreviewBrowserChromeProps = { titleText: string };

export function PreviewBrowserChrome({ titleText }: PreviewBrowserChromeProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px",
        background: "linear-gradient(180deg, #F3F5F7 0%, #E8ECF0 100%)",
        borderBottom: `1px solid ${SF.lightBorder}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }} aria-hidden>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57", boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.15)" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E", boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.12)" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840", boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.12)" }} />
        </span>
        <span
          style={{
            fontFamily: SF.mono,
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: "0.04em",
            color: SF.slate2,
          }}
        >
          {titleText}
        </span>
      </div>
      <span
        style={{
          fontFamily: SF.mono,
          fontSize: 10,
          color: SF.blue,
          padding: "4px 10px",
          borderRadius: 999,
          background: `${SF.blue}12`,
          border: `1px solid ${SF.blue}30`,
          fontWeight: 600,
        }}
      >
        Karl CMS reference
      </span>
    </div>
  );
}

type PreviewPageTypeBadgeProps = { typeLabel: string; typeColor: string };

export function PreviewPageTypeBadge({ typeLabel, typeColor }: PreviewPageTypeBadgeProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span
        style={{
          display: "inline-block",
          fontFamily: SF.font,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: typeColor,
          textTransform: "uppercase" as const,
          padding: "6px 12px",
          borderRadius: 999,
          background: `${typeColor}14`,
          border: `1px solid ${typeColor}33`,
          boxShadow: "0 2px 8px rgba(0,43,72,0.06)",
        }}
      >
        {typeLabel}
      </span>
    </div>
  );
}
