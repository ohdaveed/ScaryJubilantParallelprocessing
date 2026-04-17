import React from "react";
import { clean, parseDraftSections } from "../utils";
import { TYPE_META } from "../constants";

const SF = {
  slate4: "#002B48",
  slate2: "#5A7A92",
  blue: "#495ED4",
  white: "#FFFFFF",
  bg: "#F5F5F0",
  footerBg: "#002B48",
  border: "#D1D5DB",
  lightBorder: "#E8E8E3",
  calloutBg: "#E8F0FE",
  calloutBorder: "#B3C6E7",
  font: "'Rubik', 'Segoe UI', Roboto, sans-serif",
  mono: "'Roboto Mono', monospace",
};

const SfGovHeader: React.FC = () => (
  <div style={{ background: SF.white, borderBottom: `1px solid ${SF.lightBorder}`, padding: "0 24px" }}>
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="19" stroke={SF.slate4} strokeWidth="2" fill="none" />
          <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill={SF.slate4} fontFamily={SF.font}>SF</text>
        </svg>
        <span style={{ fontFamily: SF.font, fontSize: 20, fontWeight: 600, color: SF.slate4, letterSpacing: "-0.3px" }}>SF.gov</span>
      </div>
      <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {["Services", "Departments", "Jobs", "Contact"].map(item => (
          <span key={item} style={{ fontFamily: SF.font, fontSize: 14, fontWeight: 400, color: SF.slate4, cursor: "default" }}>{item}</span>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: SF.bg, borderRadius: 4, marginLeft: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SF.slate2} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <span style={{ fontFamily: SF.font, fontSize: 13, color: SF.slate2 }}>Search</span>
        </div>
      </nav>
    </div>
  </div>
);

const SfGovFooter: React.FC = () => (
  <div style={{ background: SF.footerBg, padding: "40px 24px 32px", marginTop: 0 }}>
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
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

function parseInlineLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push(
      <span key={m.index} style={{ color: SF.blue, textDecoration: "underline", textUnderlineOffset: 2, cursor: "default" }}>{m[1]}</span>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length <= 1 ? text : <>{parts}</>;
}

function renderSfGovLines(lines: string[]): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} style={{ margin: "8px 0 8px 20px", padding: 0, fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4 }}>
          {currentList.map((item, j) => <li key={j} style={{ marginBottom: 4 }}>{parseInlineLinks(item)}</li>)}
        </Tag>
      );
      currentList = [];
      listType = null;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);
      elements.push(
        <div key={`table-${elements.length}`} style={{ margin: "12px 0", borderRadius: 4, border: `1px solid ${SF.lightBorder}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SF.font, fontSize: 14 }}>
            <thead>
              <tr style={{ background: SF.bg }}>
                {headerRow.map((cell, ci) => (
                  <th key={ci} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: SF.slate4, borderBottom: `2px solid ${SF.lightBorder}`, fontSize: 13, letterSpacing: "0.02em" }}>{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? "#FAFAF7" : SF.white }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "10px 14px", color: SF.slate4, borderBottom: `1px solid ${SF.lightBorder}`, lineHeight: 1.5 }}>{parseInlineLinks(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); flushTable(); return; }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|[\s-:|]+\|$/.test(trimmed)) return;
      flushList();
      const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      return;
    } else {
      flushTable();
    }

    const checkMatch = trimmed.match(/^[-•*]\s+\[([ xX])\]\s+(.*)/);
    if (checkMatch) {
      flushList();
      const checked = checkMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`check-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: 4, background: SF.bg, marginBottom: 4 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 2,
            border: checked ? "none" : `2px solid ${SF.border}`,
            background: checked ? SF.blue : SF.white,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M4 12l5 5 11-11" /></svg>}
          </div>
          <span style={{ fontFamily: SF.font, fontSize: 15, lineHeight: 1.5, color: SF.slate4 }}>{parseInlineLinks(checkMatch[2])}</span>
        </div>
      );
      return;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
    const numMatch = trimmed.match(/^\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      if (listType === "ol") flushList();
      listType = "ul";
      currentList.push(bulletMatch[1]);
    } else if (numMatch) {
      if (listType === "ul") flushList();
      listType = "ol";
      currentList.push(numMatch[1]);
    } else {
      flushList();
      const isLabel = /^(phone number|email|button link|action link):/i.test(trimmed);
      if (isLabel) {
        const [label, ...rest] = trimmed.split(":");
        const value = rest.join(":").trim();
        if (/^(button link|action link)/i.test(label)) {
          elements.push(
            <div key={`cta-${i}`} style={{ margin: "12px 0" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", background: SF.blue, color: SF.white,
                fontFamily: SF.font, fontSize: 16, fontWeight: 500, borderRadius: 4,
                cursor: "default"
              }}>
                {value}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </div>
          );
        } else {
          elements.push(
            <div key={`contact-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0", padding: "10px 14px", background: SF.bg, borderRadius: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SF.blue} strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span style={{ fontFamily: SF.font, fontSize: 16, color: SF.blue, fontWeight: 500 }}>{value}</span>
            </div>
          );
        }
      } else {
        elements.push(
          <p key={`p-${i}`} style={{ fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4, margin: "0 0 12px" }}>{parseInlineLinks(trimmed)}</p>
        );
      }
    }
  });
  flushList();
  flushTable();
  return <>{elements}</>;
}

export const SfGovPagePreview = React.forwardRef<HTMLDivElement, { draft: string; pageType?: string; pageTitle?: string }>(
  ({ draft, pageType, pageTitle }, ref) => {
  if (!draft) return <p style={{ color: SF.slate2, fontSize: 14, fontFamily: SF.font }}>No draft content.</p>;
  const sections = parseDraftSections(draft);

  const typeMeta = pageType ? TYPE_META[clean(pageType)] : null;
  const typeLabel = pageType ? clean(pageType).toUpperCase() : "";
  const typeColor = typeMeta ? typeMeta.stroke : SF.blue;

  return (
    <div ref={ref} style={{ background: SF.white, fontFamily: SF.font }}>
      <SfGovHeader />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 48px" }}>
        {typeLabel && (
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontFamily: SF.font, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em",
              color: typeColor, textTransform: "uppercase" as const,
            }}>{typeLabel}</span>
            <div style={{ width: 40, height: 3, background: typeColor, marginTop: 4, borderRadius: 2 }} />
          </div>
        )}

        {sections.map((sec, i) => {
          if (sec.type === "title") {
            return (
              <div key={i} style={{ marginBottom: 24 }}>
                <h1 style={{
                  fontFamily: SF.font, fontSize: 36, fontWeight: 700, lineHeight: 1.15,
                  color: SF.slate4, margin: "0 0 12px", letterSpacing: "-0.5px"
                }}>{sec.title || pageTitle || "Untitled"}</h1>
                {sec.lines.filter((l: string) => clean(l)).map((l: string, j: number) => (
                  <p key={j} style={{ fontFamily: SF.font, fontSize: 18, lineHeight: 1.6, color: SF.slate2, margin: "0 0 6px", fontWeight: 300 }}>{clean(l)}</p>
                ))}
              </div>
            );
          }

          if (sec.type === "summary") {
            return (
              <div key={i} style={{ marginBottom: 24, padding: "14px 18px", background: "#F0F4F8", borderLeft: `4px solid ${SF.blue}`, borderRadius: "0 4px 4px 0" }}>
                <span style={{ fontFamily: SF.font, fontSize: 11, fontWeight: 600, color: SF.slate2, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Description</span>
                <p style={{ fontFamily: SF.font, fontSize: 15, color: SF.slate4, margin: "4px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>{sec.text}</p>
              </div>
            );
          }

          const titleLower = (sec.title || "").toLowerCase();
          const hasContent = sec.lines.some((l: string) => clean(l));
          if (!sec.title && !hasContent) return null;

          const isCallout = titleLower.includes("callout");
          const isRelated = titleLower.includes("related");
          const isH2 = titleLower.startsWith("what to know") || titleLower.startsWith("what to do");

          if (isCallout) {
            const calloutText = sec.lines.map((l: string) => clean(l)).filter(Boolean).join(" ");
            return (
              <div key={i} style={{
                margin: "16px 0", padding: "16px 20px",
                background: "#FFF8E1", borderLeft: "4px solid #F9A825",
                borderRadius: "0 4px 4px 0"
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p style={{ fontFamily: SF.font, fontSize: 15, lineHeight: 1.6, color: SF.slate4, margin: 0, fontWeight: 400 }}>
                    {calloutText || sec.title?.replace(/^callout:?\s*/i, "")}
                  </p>
                </div>
              </div>
            );
          }

          if (isRelated) {
            const bullets = sec.lines
              .filter((l: string) => /^[-•*]\s/.test(l.trim()))
              .map((l: string) => l.replace(/^[-•*]\s*/, "").trim())
              .filter(Boolean);
            return (
              <div key={i} style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${SF.lightBorder}` }}>
                <h2 style={{ fontFamily: SF.font, fontSize: 22, fontWeight: 600, color: SF.slate4, margin: "0 0 16px" }}>Related</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {bullets.map((item, j) => (
                    <div key={j} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 0", borderBottom: `1px solid ${SF.lightBorder}`,
                      cursor: "default"
                    }}>
                      <span style={{ fontFamily: SF.font, fontSize: 16, color: SF.blue, fontWeight: 400 }}>{item}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SF.blue} strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (isH2) {
            return (
              <div key={i} style={{ marginTop: 32, marginBottom: 8 }}>
                <h2 style={{
                  fontFamily: SF.font, fontSize: 26, fontWeight: 600,
                  color: SF.slate4, margin: "0 0 4px", letterSpacing: "-0.3px"
                }}>{sec.title}</h2>
                <div style={{ width: 32, height: 3, background: SF.blue, borderRadius: 2, marginBottom: 16 }} />
                {hasContent && renderSfGovLines(sec.lines)}
              </div>
            );
          }

          const sectionHeadingMatch = titleLower.startsWith("section heading");
          const headingText = sectionHeadingMatch
            ? (sec.title || "").replace(/^section heading:?\s*/i, "")
            : sec.title;

          return (
            <div key={i} style={{ marginBottom: 24 }}>
              {headingText && (
                <h3 style={{
                  fontFamily: SF.font, fontSize: 20, fontWeight: 600,
                  color: SF.slate4, margin: "0 0 10px", lineHeight: 1.3
                }}>{headingText}</h3>
              )}
              {hasContent && renderSfGovLines(sec.lines)}
            </div>
          );
        })}
      </div>

      <SfGovFooter />
    </div>
  );
}
);
SfGovPagePreview.displayName = "SfGovPagePreview";
