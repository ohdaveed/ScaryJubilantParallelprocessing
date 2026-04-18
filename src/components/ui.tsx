import React, { useState } from "react";
import { TYPE_META, LEGACY_PAGE_TYPES, MILESTONE_DOTS } from "../constants";
import { clean, parseRel } from "../utils";
import { KarlEvaluation } from "../types";

const LEGACY_STYLE = { fill: "#F7F6F2", stroke: "#B4B2A9", text: "#5F5E5A" };

export const Badge: React.FC<{ type: string; small?: boolean }> = ({ type, small }) => {
  const t = clean(type);
  const isLegacy = LEGACY_PAGE_TYPES.includes(t);
  const c = isLegacy ? LEGACY_STYLE : (TYPE_META[t] || { fill: "#F1EFE8", stroke: "#888", text: "#444" });

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: small ? 10 : 11,
      fontWeight: 500, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20,
      background: c.fill, color: c.text, border: `1px solid ${c.stroke}`,
      whiteSpace: "nowrap", lineHeight: 1.4
    }}>
      {isLegacy && (
        <span style={{ fontSize: small ? 8 : 9, opacity: 0.7, letterSpacing: 0 }} title="Legacy type — not a real Karl content type">⚠</span>
      )}
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

export const Btn: React.FC<BtnProps> = ({ children, variant = "ghost", size = "sm", fullWidth, style = {}, type = "button", ...props }) => {
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
      type={type}
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

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked = false,
  onChange,
  label,
  className = ""
}) => {
  return (
    <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }} className={className}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ width: 16, height: 16, cursor: "pointer" }}
      />
      {label && <span style={{ marginLeft: 8, fontSize: 13, color: "var(--color-text-primary)" }}>{label}</span>}
    </label>
  );
};

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  count,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: 24, maxWidth: 360, width: "100%", margin: "0 16px", border: "0.5px solid var(--color-border-secondary)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>Confirm Delete</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.55 }}>
          Delete {count} selected page{count !== 1 ? "s" : ""}? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="md" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Btn>
          <Btn variant="danger" size="md" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Deleting…" : "Delete"}
          </Btn>
        </div>
      </div>
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