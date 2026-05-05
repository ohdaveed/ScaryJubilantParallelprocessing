import React from "react";
import { clean } from "../utils/core";
import { parseDraftSections } from "../utils/parsing";
import { TYPE_META } from "../constants";

const SF = {
  slate4: "#002B48",
  slate2: "#5A7A92",
  blue: "#495ED4",
  blueDeep: "#3A4BB8",
  white: "#FFFFFF",
  bg: "#F5F5F0",
  paper: "#FAFAF8",
  stageTop: "#E4EBF2",
  stageMid: "#D5DEE8",
  stageBottom: "#C5CFDB",
  footerBg: "#001E33",
  border: "#D1D5DB",
  lightBorder: "#E8E8E3",
  calloutBg: "#E8F0FE",
  calloutBorder: "#B3C6E7",
  font: "'Rubik', 'Segoe UI', Roboto, sans-serif",
  fontDisplay: "'Fraunces', 'Georgia', serif",
  mono: "'Roboto Mono', monospace",
  frameShadow: "0 32px 64px -16px rgba(0, 43, 72, 0.22), 0 0 0 1px rgba(0, 43, 72, 0.06)",
  headerShadow: "0 8px 24px rgba(0, 43, 72, 0.06)",
};

const PREVIEW_FRAME_MAX_WIDTH = "100%";
const PREVIEW_CONTENT_MAX_WIDTH = "min(980px, 100%)";

const SfGovHeader: React.FC = () => (
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

const SfGovFooter: React.FC = () => (
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
  if (parts.length === 0) return <>{text}</>;
  return <>{parts}</>;
}

const karlTooltip = (label: string) => `Karl CMS: ${label}`;

/** Strip list markers so `- Action link:` still renders as a CTA, not a bullet. */
function stripListLinePrefix(line: string): string {
  return line.trim().replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, "");
}

/** Show label text on the mock button; hide trailing bare URL (drafts often append `https://…`). */
function mockPrimaryActionLabel(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^(.+?)\s+(https?:\/\/\S+)$/i);
  return m ? m[1].trim() : t;
}

type ContactCtaKind = "button link" | "action link" | "phone number" | "email";

function parseContactOrCtaLine(line: string): { kind: ContactCtaKind; valueRaw: string } | null {
  const core = stripListLinePrefix(line);
  const m = core.match(/^(phone number|email|button link|action link)\s*:\s*(.*)$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase() as ContactCtaKind;
  if (kind !== "phone number" && kind !== "email" && kind !== "button link" && kind !== "action link") return null;
  return { kind, valueRaw: m[2].trim() };
}

function karlContactCtaTitle(kind: ContactCtaKind): string {
  if (kind === "button link") return "Button link";
  if (kind === "action link") return "Action link";
  if (kind === "phone number") return "Phone number";
  return "Email";
}

function renderSfGovLines(lines: string[], parentSection?: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableRows: string[][] = [];
  let subsectionActive = false;

  const bodyLabel = () =>
    parentSection ? karlTooltip(`${parentSection} > ${subsectionActive ? "Section body" : "Text"}`) : undefined;

  const blockLabel = (component: string) =>
    parentSection ? karlTooltip(`${parentSection} > ${component}`) : undefined;

  const appendContactOrCta = (lineIndex: number, parsed: { kind: ContactCtaKind; valueRaw: string }) => {
    const isCta = parsed.kind === "button link" || parsed.kind === "action link";
    if (isCta) {
      const caption = mockPrimaryActionLabel(parsed.valueRaw);
      elements.push(
        <div key={`cta-${lineIndex}`} title={blockLabel(karlContactCtaTitle(parsed.kind))} style={{ margin: "12px 0" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              color: SF.white,
              fontFamily: SF.font,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 8,
              cursor: "default",
              maxWidth: "100%",
              flexWrap: "wrap",
              rowGap: 8,
              lineHeight: 1.35,
              background: `linear-gradient(180deg, ${SF.blue} 0%, ${SF.blueDeep} 100%)`,
              boxShadow: "0 4px 14px rgba(73, 94, 212, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            {parseInlineLinks(caption)}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      );
    } else {
      elements.push(
        <div
          key={`contact-${lineIndex}`}
          title={blockLabel(parsed.kind === "phone number" ? "Phone number" : "Email")}
          style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0", padding: "10px 14px", background: SF.bg, borderRadius: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SF.blue} strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          <span style={{ fontFamily: SF.font, fontSize: 16, color: SF.blue, fontWeight: 500 }}>{parseInlineLinks(parsed.valueRaw)}</span>
        </div>
      );
    }
    subsectionActive = false;
  };

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag
          key={`list-${elements.length}`}
          title={bodyLabel()}
          style={{ margin: "8px 0 8px 20px", padding: 0, fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4 }}
        >
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
        <div
          key={`table-${elements.length}`}
          title={bodyLabel()}
          style={{ margin: "12px 0", borderRadius: 4, border: `1px solid ${SF.lightBorder}`, overflow: "hidden" }}
        >
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

  const isStructuredLine = (trimmed: string): boolean =>
    /^section heading:?\s*/i.test(trimmed) ||
    /^section body:?\s*/i.test(trimmed) ||
    /^callout:?\s*/i.test(trimmed) ||
    (/^\|/.test(trimmed) && /\|$/.test(trimmed)) ||
    /^[-•*]\s+\[([ xX])\]\s+/.test(trimmed) ||
    /^[-•*]\s+/.test(trimmed) ||
    /^\d+[.)]\s+/.test(trimmed);

  const renderPlainTextRun = (run: string[], keySeed: number) => {
    const introLine = run[0]?.endsWith(":") ? run[0] : null;
    const listItems = introLine ? run.slice(1) : run;

    if (introLine) {
      elements.push(
        <p
          key={`p-intro-${keySeed}`}
          title={bodyLabel()}
          style={{ fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4, margin: "0 0 12px" }}
        >
          {parseInlineLinks(introLine)}
        </p>
      );
    }

    if (listItems.length >= 3) {
      elements.push(
        <ul
          key={`plain-list-${keySeed}`}
          title={bodyLabel()}
          style={{ margin: "8px 0 12px 20px", padding: 0, fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4 }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {parseInlineLinks(item)}
            </li>
          ))}
        </ul>
      );
      return;
    }

    listItems.forEach((text, idx) => {
      elements.push(
        <p
          key={`p-${keySeed}-${idx}`}
          title={bodyLabel()}
          style={{ fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4, margin: "0 0 12px" }}
        >
          {parseInlineLinks(text)}
        </p>
      );
    });
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushTable();
      i += 1;
      continue;
    }

    const sectionHeadingMatch = trimmed.match(/^section heading:?\s*(.*)/i);
    if (sectionHeadingMatch) {
      flushList();
      flushTable();
      subsectionActive = true;
      elements.push(
        <h3
          key={`section-heading-${i}`}
          title={blockLabel("Section heading")}
          style={{
            fontFamily: SF.fontDisplay, fontSize: 21, fontWeight: 700,
            color: SF.slate4, margin: "0 0 12px", lineHeight: 1.28, letterSpacing: "-0.015em",
          }}
        >
          {sectionHeadingMatch[1]}
        </h3>
      );
      i += 1;
      continue;
    }

    const sectionBodyMatch = trimmed.match(/^section body:?\s*(.*)/i);
    if (sectionBodyMatch) {
      flushList();
      flushTable();
      subsectionActive = true;
      elements.push(
        <p
          key={`section-body-${i}`}
          title={blockLabel("Section body")}
          style={{ fontFamily: SF.font, fontSize: 16, lineHeight: 1.7, color: SF.slate4, margin: "0 0 12px" }}
        >
          {parseInlineLinks(sectionBodyMatch[1])}
        </p>
      );
      i += 1;
      continue;
    }

    const inlineCalloutMatch = trimmed.match(/^callout:?\s*(.*)/i);
    if (inlineCalloutMatch) {
      flushList();
      flushTable();
      elements.push(
        <div
          key={`callout-${i}`}
          title={blockLabel("Callout")}
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
              {parseInlineLinks(inlineCalloutMatch[1])}
            </p>
          </div>
        </div>
      );
      subsectionActive = false;
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (/^\|[\s-:|]+\|$/.test(trimmed)) {
        i += 1;
        continue;
      }
      flushList();
      const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());
      tableRows.push(cells);
      i += 1;
      continue;
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
      i += 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-•*]\s+(.*)/);
    const numMatch = trimmed.match(/^\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      const ctaOrContact = parseContactOrCtaLine(trimmed);
      if (ctaOrContact) {
        flushList();
        appendContactOrCta(i, ctaOrContact);
        i += 1;
        continue;
      }
      if (listType === "ol") flushList();
      listType = "ul";
      currentList.push(bulletMatch[1]);
      i += 1;
    } else if (numMatch) {
      const ctaOrContact = parseContactOrCtaLine(trimmed);
      if (ctaOrContact) {
        flushList();
        appendContactOrCta(i, ctaOrContact);
        i += 1;
        continue;
      }
      if (listType === "ul") flushList();
      listType = "ol";
      currentList.push(numMatch[1]);
      i += 1;
    } else {
      flushList();
      const ctaOrContact = parseContactOrCtaLine(trimmed);
      if (ctaOrContact) {
        appendContactOrCta(i, ctaOrContact);
        i += 1;
      } else {
        const run: string[] = [trimmed];
        let j = i + 1;
        while (j < lines.length) {
          const nextTrimmed = lines[j].trim();
          if (!nextTrimmed || isStructuredLine(nextTrimmed) || parseContactOrCtaLine(nextTrimmed)) break;
          run.push(nextTrimmed);
          j += 1;
        }
        renderPlainTextRun(run, i);
        i = j;
      }
    }
  }
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
    <div
      ref={ref}
      style={{
        fontFamily: SF.font,
          padding: "clamp(14px, 2.8vw, 28px) clamp(10px, 2.2vw, 20px) clamp(20px, 3.6vw, 36px)",
        background: `radial-gradient(1200px 600px at 10% -10%, rgba(73, 94, 212, 0.12), transparent 55%),
          radial-gradient(900px 500px at 100% 0%, rgba(45, 139, 132, 0.1), transparent 50%),
          linear-gradient(165deg, ${SF.stageTop} 0%, ${SF.stageMid} 48%, ${SF.stageBottom} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: PREVIEW_FRAME_MAX_WIDTH,
          margin: "0 auto",
          borderRadius: 16,
          boxShadow: SF.frameShadow,
          overflow: "hidden",
          background: SF.white,
          border: "1px solid rgba(255,255,255,0.75)",
        }}
      >
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
              SF.gov / HHVC preview
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

        <SfGovHeader />

        <div
          style={{
            maxWidth: PREVIEW_CONTENT_MAX_WIDTH,
            margin: "0 auto",
            padding: "clamp(20px, 4vw, 36px) clamp(14px, 3vw, 24px) clamp(30px, 5vw, 52px)",
            backgroundColor: SF.paper,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,43,72,0.06) 1px, transparent 0)`,
            backgroundSize: "22px 22px",
          }}
        >
        {typeLabel && (
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
        )}

        {sections.map((sec, i) => {
          if (sec.type === "title") {
            return (
              <div key={i} style={{ marginBottom: 28 }}>
                <h1 style={{
                  fontFamily: SF.fontDisplay, fontSize: "clamp(2rem, 4vw, 2.35rem)", fontWeight: 700, lineHeight: 1.12,
                  color: SF.slate4, margin: "0 0 14px", letterSpacing: "-0.02em",
                  wordBreak: "normal", overflowWrap: "break-word", maxWidth: "100%",
                }} title={karlTooltip("Title")}>{sec.title || pageTitle || "Untitled"}</h1>
                {sec.lines.filter((l: string) => clean(l)).map((l: string, j: number) => (
                  <p key={j} style={{ fontFamily: SF.font, fontSize: 18, lineHeight: 1.6, color: SF.slate2, margin: "0 0 6px", fontWeight: 300 }}>{clean(l)}</p>
                ))}
              </div>
            );
          }

          if (sec.type === "summary") {
            return (
              <div
                key={i}
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
                <p title={karlTooltip("Description")} style={{ fontFamily: SF.font, fontSize: 16, color: SF.slate4, margin: "8px 0 0", lineHeight: 1.55, fontStyle: "italic" }}>{sec.text}</p>
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
              <div
                key={i}
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
              <div key={i} style={{ marginTop: 36, paddingTop: 28, borderTop: `1px solid ${SF.lightBorder}` }}>
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
          }

          if (isH2) {
            return (
              <div key={i} style={{ marginTop: 36, marginBottom: 10 }}>
                <h2 style={{
                  fontFamily: SF.fontDisplay, fontSize: "clamp(1.45rem, 3vw, 1.65rem)", fontWeight: 700,
                  color: SF.slate4, margin: "0 0 6px", letterSpacing: "-0.02em",
                }} title={karlTooltip(sec.title || "")}>{sec.title}</h2>
                <div style={{ width: 48, height: 4, background: `linear-gradient(90deg, ${SF.blue}, #2D8B84)`, borderRadius: 4, marginBottom: 18 }} />
                {hasContent && renderSfGovLines(sec.lines, sec.title)}
              </div>
            );
          }

          const sectionHeadingMatch = titleLower.startsWith("section heading");
          const headingText = sectionHeadingMatch
            ? (sec.title || "").replace(/^section heading:?\s*/i, "")
            : sec.title;

          return (
            <div key={i} style={{ marginBottom: 26 }}>
              {headingText && (
                <h3 style={{
                  fontFamily: SF.fontDisplay, fontSize: 21, fontWeight: 700,
                  color: SF.slate4, margin: "0 0 12px", lineHeight: 1.28, letterSpacing: "-0.015em",
                }}>{headingText}</h3>
              )}
              {hasContent && renderSfGovLines(sec.lines, sec.title)}
            </div>
          );
        })}
        </div>

        <SfGovFooter />
      </div>
    </div>
  );
}
);
SfGovPagePreview.displayName = "SfGovPagePreview";
