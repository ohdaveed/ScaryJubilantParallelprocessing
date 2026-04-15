import React, { useState } from "react";
import { TYPE_META, MILESTONE_DOTS } from "../constants";
import { clean, parseRel } from "../utils";
import { KarlEvaluation } from "../types";

export const Badge: React.FC<{ type: string; small?: boolean }> = ({ type, small }) => {
  const t = clean(type);
  const c = TYPE_META[t] || { fill: "#F1EFE8", stroke: "#888", text: "#444" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: small ? 10 : 11,
      fontWeight: 500, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20,
      background: c.fill, color: c.text, border: `1px solid ${c.stroke}`,
      whiteSpace: "nowrap", lineHeight: 1.4
    }}>
      {t || "—"}
    </span>
  );
};

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style = {} }) => (
  <p style={{
    fontSize: 10, fontWeight: 500, color: "var(--color-text-tertiary)",
    textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 6px", ...style
  }}>
    {children}
  </p>
);

export const Divider: React.FC<{ m?: string }> = ({ m = "16px 0" }) => (
  <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: m }} />
);

export const iStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: "100%", padding: "8px 11px", fontSize: 13, border: "0.5px solid var(--color-border-secondary)",
  borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)",
  color: "var(--color-text-primary)", boxSizing: "border-box", transition: "border-color 0.15s",
  outline: "none", ...extra
});

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const Btn: React.FC<BtnProps> = ({ children, variant = "ghost", size = "sm", fullWidth, style = {}, ...props }) => {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-sans)", cursor: props.disabled ? "not-allowed" : "pointer",
    borderRadius: "var(--border-radius-md)", fontWeight: size === "lg" ? 500 : 400,
    transition: "all 0.12s ease", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 6, border: "none", outline: "none",
    ...(fullWidth ? { width: "100%" } : {}), ...style
  };

  const sizes = {
    sm: { fontSize: 12, padding: "5px 12px" },
    md: { fontSize: 13, padding: "7px 16px" },
    lg: { fontSize: 14, padding: "11px 20px" }
  };

  const variants = {
    primary: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" },
    ghost: { background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)" },
    danger: { background: "transparent", color: "var(--color-text-danger)", border: "0.5px solid var(--color-border-danger)" },
  };

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...(props.disabled ? { opacity: 0.4 } : {}) }}
      onMouseEnter={e => { if (!props.disabled) { e.currentTarget.style.opacity = "0.72"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      {...props}
    >
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{label}</label>
      {hint && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; onClick?: () => void; selected?: boolean; style?: React.CSSProperties }> = ({ children, onClick, selected, style = {} }) => {
  const [hov, setHov] = useState(false);
  return (
    <div 
      onClick={onClick} 
      onMouseEnter={() => onClick && setHov(true)} 
      onMouseLeave={() => setHov(false)}
      style={{
        background: "var(--color-background-primary)",
        border: `0.5px solid ${selected ? "var(--color-border-primary)" : hov && onClick ? "var(--color-border-secondary)" : "var(--color-border-tertiary)"}`,
        borderRadius: "var(--border-radius-lg)", padding: "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s,transform 0.12s",
        transform: hov && onClick ? "translateY(-1px)" : "none",
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const ComponentChips: React.FC<{ components: string }> = ({ components }) => {
  if (!components) return null;
  const items = components.split("\n").map(l => clean(l.replace(/^[-•]\s*/, ""))).filter(s => s.length > 2);
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>Recommended components</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {items.map(c => <span key={c} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)" }}>{c}</span>)}
      </div>
    </div>
  );
};

export const RelPanel: React.FC<{ rel: string }> = ({ rel }) => {
  const r = parseRel(rel);
  const rows = [["Parent", r.parent], ["Siblings", r.siblings], ["Children", r.children], ["Entry points", r.entry], ["Next steps", r.next]].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", marginBottom: 16 }}>
      <Label>System relationships</Label>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 10, marginBottom: 4, fontSize: 13 }}>
          <span style={{ color: "var(--color-text-tertiary)", minWidth: 84, flexShrink: 0 }}>{k}</span>
          <span style={{ color: "var(--color-text-primary)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
};

export const KarlStatus: React.FC<{ status: string }> = ({ status }) => {
  const states: Record<string, { dot: string; label: string; bg: string }> = {
    idle:       { dot: "#B4B2A9", label: "Karl not connected", bg: "var(--color-background-secondary)" },
    connecting: { dot: "#BA7517", label: "Connecting to Karl…", bg: "#FAEEDA" },
    active:     { dot: "#1D9E75", label: "Karl connected", bg: "#E1F5EE" },
    fallback:   { dot: "#E24B4A", label: "Karl unavailable — using base standards", bg: "#FCEBEB" },
  };
  const s = states[status] || states.idle;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: "var(--border-radius-md)", background: s.bg, marginBottom: 14 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, flexShrink: 0, animation: status === "connecting" ? "pulse 1.2s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.label}</span>
    </div>
  );
};

export const SectionIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: Record<string, React.ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" fill="none" />,
    list: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
    clock: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
    info: <><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></>,
  };
  return <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>{icons[type] || icons.info}</svg>;
};

export const KarlEvalPanel: React.FC<{ evaluation: KarlEvaluation }> = ({ evaluation }) => {
  const [expanded, setExpanded] = useState(false);
  const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };
  const gradeBg: Record<string, string> = { A: "#E1F5EE", B: "#E6F1FB", C: "#FAEEDA", D: "#FCEBEB", F: "#FCEBEB" };
  const grade = evaluation.grade || "—";
  const color = gradeColor[grade] || "#5F5E5A";
  const bg = gradeBg[grade] || "#F7F6F2";

  const scoreWidth = `${Math.min(100, evaluation.score || 0)}%`;

  return (
    <div style={{ borderRadius: "var(--border-radius-lg)", border: `0.5px solid ${color}33`, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: bg, borderBottom: expanded ? `0.5px solid ${color}22` : "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "white", border: `2px solid ${color}40`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color }}>{grade}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color }}>Karl evaluation · {evaluation.score}/100</span>
            <div style={{ display: "flex", gap: 6 }}>
              {evaluation.passed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#E1F5EE", color: "#0F6E56" }}>✓ {evaluation.passed.length}</span>}
              {evaluation.warnings.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FAEEDA", color: "#854F0B" }}>⚠ {evaluation.warnings.length}</span>}
              {evaluation.failed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D" }}>✗ {evaluation.failed.length}</span>}
            </div>
          </div>
          <div style={{ height: 3, background: `${color}20`, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: color, width: scoreWidth, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color, opacity: 0.7, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      </div>
      {expanded && (
        <div style={{ padding: "12px 14px", background: "var(--color-background-primary)" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.55, fontStyle: "italic" }}>{evaluation.summary}</p>
          {evaluation.passed.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Passed</p>
              {evaluation.passed.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#0F6E56", flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.warnings.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: "#854F0B", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Warnings</p>
              {evaluation.warnings.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#854F0B", flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.failed.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, color: "#A32D2D", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 5px" }}>Failed</p>
              {evaluation.failed.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#A32D2D", flexShrink: 0, marginTop: 1 }}>✗</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function highlightSpecial(text: string): React.ReactNode {
  const pattern = /10\s+square\s+feet/i;
  const match = text.match(pattern);
  if (!match || match.index === undefined) return text;
  const idx = match.index;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: "#FAEEDA", color: "#633806", padding: "1px 6px", borderRadius: 4, fontWeight: 600, fontSize: "0.94em", border: "0.5px solid #854F0B44" }}>
        {text.slice(idx, idx + match[0].length)}
      </span>
      {text.slice(idx + match[0].length)}
    </>
  );
}

export const ResponsibilitiesTable: React.FC<{ lines: string[] }> = ({ lines }) => {
  const landlord: string[] = [];
  const tenant: string[] = [];
  let current: "landlord" | "tenant" | null = null;

  lines.forEach(line => {
    const c = line.trim();
    if (!c) return;
    if (/^landlord\s*:/i.test(c)) { current = "landlord"; return; }
    if (/^tenant\s*:/i.test(c)) { current = "tenant"; return; }
    const item = c.replace(/^[-•*]\s*/, "");
    if (!item) return;
    if (current === "landlord") landlord.push(item);
    else if (current === "tenant") tenant.push(item);
    else tenant.push(item);
  });

  const maxRows = Math.max(landlord.length, tenant.length, 1);

  const tdStyle: React.CSSProperties = {
    padding: "8px 10px", fontSize: 12, lineHeight: 1.6,
    color: "var(--color-text-primary)", verticalAlign: "top",
    borderBottom: "0.5px solid var(--color-border-tertiary)", width: "50%"
  };
  const thStyle: React.CSSProperties = {
    padding: "6px 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.07em", textAlign: "left", borderBottom: "0.5px solid var(--color-border-secondary)"
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, color: "#185FA5", background: "#E6F1FB55" }}>Landlord</th>
          <th style={{ ...thStyle, color: "#854F0B", background: "#FAEEDA55", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>Tenant</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: maxRows }).map((_, i) => (
          <tr key={i}>
            <td style={{ ...tdStyle, background: "#E6F1FB18" }}>
              {landlord[i] ? <span style={{ display: "flex", gap: 7, alignItems: "flex-start" }}><span style={{ color: "#185FA5", flexShrink: 0, marginTop: 1 }}>•</span><span>{highlightSpecial(landlord[i])}</span></span> : null}
            </td>
            <td style={{ ...tdStyle, borderLeft: "0.5px solid var(--color-border-tertiary)", background: "#FAEEDA18" }}>
              {tenant[i] ? <span style={{ display: "flex", gap: 7, alignItems: "flex-start" }}><span style={{ color: "#854F0B", flexShrink: 0, marginTop: 1 }}>•</span><span>{highlightSpecial(tenant[i])}</span></span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function getStepIcon(text: string): React.ReactNode {
  const t = text.toLowerCase();
  if (t.includes("311") || t.includes("call") || t.includes("phone")) return <PhoneIcon />;
  if (t.includes("photo") || t.includes("picture") || t.includes("camera") || t.includes("document")) return <CameraIcon />;
  if (t.includes("72 hour") || t.includes("wait") || t.includes("hour") || t.includes("day")) return <ClockIcon />;
  return null;
}

function is311CallStep(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("call 311") || t.includes("contact 311") || t.includes("reach 311") || (t.includes("311") && (t.includes("call") || t.includes("contact") || t.includes("report")));
}

export const ActionStepList: React.FC<{ lines: string[] }> = ({ lines }) => {
  const bullets = lines
    .map(l => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  if (!bullets.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bullets.map((item, i) => {
        const icon = getStepIcon(item);
        const isCta = is311CallStep(item);
        return (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: isCta ? "10px 14px" : "8px 10px",
            borderRadius: "var(--border-radius-md)",
            background: isCta ? "#0F6E56" : "var(--color-background-secondary)",
            border: isCta ? "none" : "0.5px solid var(--color-border-tertiary)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: isCta ? "rgba(255,255,255,0.2)" : "var(--color-background-primary)",
              border: isCta ? "none" : "0.5px solid var(--color-border-secondary)",
              color: isCta ? "#fff" : "var(--color-text-secondary)",
              fontSize: 11, fontWeight: 600, gap: 2, flexDirection: "column"
            }}>
              {icon
                ? <>{icon}<span style={{ fontSize: 9, lineHeight: 1, marginTop: 1 }}>{i + 1}</span></>
                : <span>{i + 1}</span>}
            </div>
            <span style={{
              fontSize: 13, lineHeight: 1.6, fontWeight: isCta ? 500 : 400,
              color: isCta ? "#fff" : "var(--color-text-primary)", flex: 1
            }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ChecklistRow: React.FC<{ items: string[] }> = ({ items }) => {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 10px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-primary)" }}>{item}</span>
        </div>
      ))}
    </div>
  );
};

const DAILY_KEYWORDS = ["ventilat", "moisture", "clean", "wipe", "dry", "window", "fan", "air", "humid", "squeegee", "towel", "condensat", "bath"];
const EQUIPMENT_KEYWORDS = ["dehumidifier", "exhaust", "caulk", "seal", "fix leak", "repair", "grout", "paint", "plumb", "install", "replac", "waterproof"];

function classifyTip(text: string): "daily" | "equipment" | "other" {
  const t = text.toLowerCase();
  if (DAILY_KEYWORDS.some(k => t.includes(k))) return "daily";
  if (EQUIPMENT_KEYWORDS.some(k => t.includes(k))) return "equipment";
  return "other";
}

export const PreventionSection: React.FC<{ lines: string[] }> = ({ lines }) => {
  const bullets = lines.map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  const paras = lines.filter(l => !l.startsWith("- ") && !l.startsWith("• ") && !l.startsWith("* ") && l.trim()).map(l => l.trim());
  const daily: string[] = [], equipment: string[] = [], other: string[] = [];
  bullets.forEach(b => {
    const cat = classifyTip(b);
    if (cat === "daily") daily.push(b);
    else if (cat === "equipment") equipment.push(b);
    else other.push(b);
  });

  const dailyItems = [...daily, ...(equipment.length > 0 ? other : [])];
  const equipmentItems = equipment;
  const orphans = equipment.length === 0 ? other : [];

  const subHeadStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-tertiary)", margin: "0 0 6px" };
  const tipList = (items: string[]) => (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-text-tertiary)", flexShrink: 0, marginTop: 6 }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  const hasCols = dailyItems.length > 0 || equipmentItems.length > 0;

  return (
    <div>
      {paras.map((p, i) => <p key={i} style={{ fontSize: 13, margin: "0 0 10px", lineHeight: 1.7, color: "var(--color-text-primary)" }}>{p}</p>)}
      {hasCols ? (
        <div style={{ display: "grid", gridTemplateColumns: dailyItems.length > 0 && equipmentItems.length > 0 ? "1fr 1fr" : "1fr", gap: 12 }}>
          {dailyItems.length > 0 && (
            <div>
              <p style={subHeadStyle}>Daily habits</p>
              {tipList(dailyItems)}
            </div>
          )}
          {equipmentItems.length > 0 && (
            <div>
              <p style={subHeadStyle}>Equipment and setup</p>
              {tipList(equipmentItems)}
            </div>
          )}
        </div>
      ) : null}
      {orphans.length > 0 && (
        <div style={{ marginTop: hasCols ? 10 : 0 }}>
          {tipList(orphans)}
        </div>
      )}
    </div>
  );
};

export const RelatedPagePills: React.FC<{ lines: string[] }> = ({ lines }) => {
  const items = lines.map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <a key={i} href="#" onClick={e => e.preventDefault()} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)",
          cursor: "pointer", gap: 8, textDecoration: "none",
          transition: "border-color 0.15s, background 0.15s"
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-border-primary)"; e.currentTarget.style.background = "var(--color-background-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-secondary)"; e.currentTarget.style.background = "var(--color-background-secondary)"; }}>
          <span style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{item}</span>
          <span style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}><ArrowRightIcon /></span>
        </a>
      ))}
    </div>
  );
};

export const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => {
  const eased = progress < 80 ? progress : 80 + (progress - 80) * 1.8;
  const clamped = Math.min(100, eased);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{Math.round(progress)}%</span>
      </div>
      <div style={{ height: 3, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "var(--color-text-primary)", width: `${clamped}%`, transition: progress === 100 ? "width 0.15s ease" : "width 0.45s ease" }} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
        {MILESTONE_DOTS.map(step => {
          const active = progress >= step.pct;
          return (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 5, opacity: active ? 1 : 0.3, transition: "opacity 0.3s" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--color-text-primary)" : "var(--color-border-secondary)", transition: "background 0.3s ease" }} />
              <span style={{ fontSize: 11, color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)", transition: "color 0.3s ease" }}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};