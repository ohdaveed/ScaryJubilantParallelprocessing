import React from "react";
import { SF, karlTooltip } from "./constants";
import { renderSfGovLines } from "./SfGovRenderer";
import { clean } from "../../utils/core";
import { PreviewPageTypeBadge } from "./SfGovUi";
import { TYPE_META } from "../../constants";

export const PreviewTitleSection: React.FC<{ title?: string; lines: string[]; pageTitle?: string }> = ({ title, lines, pageTitle }) => (
  <div style={{ marginBottom: 28 }}>
    <h1 style={{
      fontFamily: SF.fontDisplay, fontSize: "clamp(2rem, 4vw, 2.35rem)", fontWeight: 700, lineHeight: 1.12,
      color: SF.slate4, margin: "0 0 14px", letterSpacing: "-0.02em",
      wordBreak: "normal", overflowWrap: "break-word", maxWidth: "100%",
    }} title={karlTooltip("Title")}>{title || pageTitle || "Untitled"}</h1>
    {lines.filter((l: string) => clean(l)).map((l: string, j: number) => (
      <p key={j} style={{ fontFamily: SF.font, fontSize: 18, lineHeight: 1.6, color: SF.slate2, margin: "0 0 6px", fontWeight: 300 }}>{clean(l)}</p>
    ))}
  </div>
);

export const PreviewSummarySection: React.FC<{ text?: string }> = ({ text }) => (
  <div
    style={{
      marginBottom: 28,
      padding: "18px 22px",
      background: "linear-gradient(135deg, #EEF3F9 0%, #E4ECF6 100%)",
      borderLeft: `4px solid ${SF.blue}`,
      borderRadius: "0 12px 12px 0",
      boxShadow: "0 8px 24px rgba(0, 43, 72, 0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    }}
  >
    <span style={{ fontFamily: SF.mono, fontSize: 10, fontWeight: 600, color: SF.slate2, textTransform: "uppercase" as const, letterSpacing: "0.12em" }}>Description</span>
    <p title={karlTooltip("Description")} style={{ fontFamily: SF.font, fontSize: 16, color: SF.slate4, margin: "8px 0 0", lineHeight: 1.55, fontStyle: "italic" }}>{text}</p>
  </div>
);

export const PreviewCalloutSection: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => {
  const calloutText = lines.map((l: string) => clean(l)).filter(Boolean).join(" ");
  return (
    <div
      style={{
        margin: "20px 0",
        padding: "18px 22px",
        background: "linear-gradient(120deg, #FFF9E8 0%, #FFF3D0 100%)",
        borderLeft: "4px solid #E65100",
        borderRadius: "0 12px 12px 0",
        boxShadow: "0 10px 28px rgba(230, 81, 0, 0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <p style={{ fontFamily: SF.font, fontSize: 15, lineHeight: 1.65, color: SF.slate4, margin: 0, fontWeight: 500 }}>
          {calloutText || title?.replace(/^callout:?\s*/i, "")}
        </p>
      </div>
    </div>
  );
};

export const PreviewRelatedSection: React.FC<{ lines: string[] }> = ({ lines }) => {
  const bullets = lines
    .filter((l: string) => /^[-•*]\s/.test(l.trim()))
    .map((l: string) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return (
    <div style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${SF.lightBorder}` }}>
      <h2 style={{ fontFamily: SF.fontDisplay, fontSize: 24, fontWeight: 700, color: SF.slate4, margin: "0 0 18px", letterSpacing: "-0.02em" }}>Related</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {bullets.map((item, j) => (
          <div key={j} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 0", borderBottom: `1px solid ${SF.lightBorder}`,
            cursor: "default"
          }} title={karlTooltip("Related > item")}>
            <span style={{ fontFamily: SF.font, fontSize: 16, color: SF.blue, fontWeight: 400 }}>{item}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SF.blue} strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PreviewH2Section: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => (
  <div style={{ marginTop: 36, marginBottom: 10 }}>
    <h2 style={{
      fontFamily: SF.fontDisplay, fontSize: "clamp(1.45rem, 3vw, 1.65rem)", fontWeight: 700,
      color: SF.slate4, margin: "0 0 6px", letterSpacing: "-0.02em",
    }} title={karlTooltip(title || "")}>{title}</h2>
    <div style={{ width: 48, height: 4, background: `linear-gradient(90deg, ${SF.blue}, #2D8B84)`, borderRadius: 4, marginBottom: 18 }} />
    {lines.some(l => clean(l)) && renderSfGovLines(lines, title)}
  </div>
);

export const PreviewGenericSection: React.FC<{ title?: string; lines: string[] }> = ({ title, lines }) => {
  const titleLower = (title || "").toLowerCase();
  const sectionHeadingMatch = titleLower.startsWith("section heading");
  const headingText = sectionHeadingMatch
    ? (title || "").replace(/^section heading:?\s*/i, "")
    : title;

  return (
    <div style={{ marginBottom: 26 }}>
      {headingText && (
        <h3 style={{
          fontFamily: SF.fontDisplay, fontSize: 21, fontWeight: 700,
          color: SF.slate4, margin: "0 0 12px", lineHeight: 1.28, letterSpacing: "-0.015em",
        }}>{headingText}</h3>
      )}
      {lines.some(l => clean(l)) && renderSfGovLines(lines, title)}
    </div>
  );
};

export const PreviewSection: React.FC<{ sec: { type: string; title?: string; text?: string; lines: string[] }; pageTitle?: string }> = ({ sec, pageTitle }) => {
  if (sec.type === "title") return <PreviewTitleSection title={sec.title} lines={sec.lines} pageTitle={pageTitle} />;
  if (sec.type === "summary") return <PreviewSummarySection text={sec.text} />;

  const titleLower = (sec.title || "").toLowerCase();
  const hasContent = sec.lines.some((l: string) => clean(l));
  if (!sec.title && !hasContent) return null;

  if (titleLower.includes("callout")) return <PreviewCalloutSection title={sec.title} lines={sec.lines} />;
  if (titleLower.includes("related")) return <PreviewRelatedSection lines={sec.lines} />;
  if (titleLower.startsWith("what to know") || titleLower.startsWith("what to do")) return <PreviewH2Section title={sec.title} lines={sec.lines} />;

  return <PreviewGenericSection title={sec.title} lines={sec.lines} />;
};
