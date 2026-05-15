import React from "react";
import { SF, karlTooltip } from "./constants";

export function parseInlineLinks(text: string): React.ReactNode {
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

export function renderSfGovLines(lines: string[], parentSection?: string): React.ReactNode {
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
