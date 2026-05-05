import React, { useState } from "react";
import "./ui.css";
import { LEGACY_PAGE_TYPES, MILESTONE_DOTS } from "../constants";
import { clean, parseRel } from "../utils/core";
import { KarlEvaluation } from "../types";

export const Badge: React.FC<{ type: string; small?: boolean }> = ({ type, small }) => {
  const t = clean(type);
  const isLegacy = LEGACY_PAGE_TYPES.includes(t);
  return (
    <span
      className={[
        "ui-badge",
        small ? "ui-badge--sm" : "ui-badge--lg",
        isLegacy ? "ui-badge--legacy" : ""
      ].filter(Boolean).join(" ")}
      data-page-type={!isLegacy && t ? t : undefined}
    >
      {isLegacy && (
        <span className="ui-badge__warn" title="Legacy type — not a real Karl content type">⚠</span>
      )}
      {t || "—"}
    </span>
  );
};

export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={["ui-label", className].filter(Boolean).join(" ")}>{children}</p>
);

export type DividerVariant = "default" | "plan" | "suggested";

export const Divider: React.FC<{ variant?: DividerVariant }> = ({ variant = "default" }) => (
  <div
    role="separator"
    className={variant === "default" ? "ui-divider" : `ui-divider ui-divider--${variant}`}
  />
);

/** Standard text field / select appearance — use with `className="ui-input"` (optional modifiers: `ui-input--search`, `ui-input--filter`). */
export const UI_INPUT_CLASS = "ui-input";

interface BtnProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "style"> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}

export const Btn: React.FC<BtnProps> = ({
  children,
  variant = "ghost",
  size = "sm",
  fullWidth,
  className = "",
  type = "button",
  disabled,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    className={[
      "ui-btn",
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      fullWidth ? "ui-btn--block" : "",
      className
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {children}
  </button>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="ui-field">
    <div className="ui-field__row">
      <label className="ui-field__label">{label}</label>
      {hint && <span className="ui-field__hint">{hint}</span>}
    </div>
    {children}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}> = ({ children, onClick, selected, className = "" }) => (
  <div
    className={[
      "ui-card",
      onClick ? "ui-card--interactive" : "",
      selected ? "ui-card--selected" : "",
      className
    ].filter(Boolean).join(" ")}
    onClick={onClick}
  >
    {children}
  </div>
);

export const ComponentChips: React.FC<{ components: string }> = ({ components }) => {
  if (!components) return null;
  const items = components.split("\n").map(l => clean(l.replace(/^[-•]\s*/, ""))).filter(s => s.length > 2);
  if (!items.length) return null;
  return (
    <div className="ui-comp-chips">
      <Label>Recommended components</Label>
      <div className="ui-comp-chips__list">
        {items.map(c => <span key={c} className="ui-comp-chips__chip">{c}</span>)}
      </div>
    </div>
  );
};

export const RelPanel: React.FC<{ rel: string }> = ({ rel }) => {
  const r = parseRel(rel);
  const rows = [["Parent", r.parent], ["Siblings", r.siblings], ["Children", r.children], ["Entry points", r.entry], ["Next steps", r.next]].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div className="ui-rel">
      <Label>System relationships</Label>
      {rows.map(([k, v]) => (
        <div key={k} className="ui-rel__row">
          <span className="ui-rel__key">{k}</span>
          <span className="ui-rel__val">{v}</span>
        </div>
      ))}
    </div>
  );
};

export const KarlStatus: React.FC<{ status: string }> = ({ status }) => {
  const keys = ["idle", "connecting", "active", "fallback"] as const;
  const key = keys.includes(status as (typeof keys)[number]) ? status : "idle";
  const labels: Record<string, string> = {
    idle: "Content checks offline",
    connecting: "Connecting to content standards…",
    active: "Content checks connected",
    fallback: "Live standards unavailable — using baseline rules"
  };
  const hints: Record<string, string> = {
    idle: "You can still generate drafts. Evaluation uses baseline SF.gov rules until the service connects.",
    connecting: "Hang on — verifying against Karl content standards.",
    active: "Drafts are scored against live Karl guidance when you generate or regenerate.",
    fallback: "Generation and grading continue with bundled standards."
  };
  return (
    <div className="ui-karl-status" data-status={key}>
      <span className="ui-karl-status__dot" aria-hidden />
      <div className="ui-karl-status__text">
        <span className="ui-karl-status__label">{labels[key]}</span>
        <span className="ui-karl-status__hint">{hints[key]}</span>
      </div>
    </div>
  );
};

export const KarlEvalPanel: React.FC<{ evaluation: KarlEvaluation }> = ({ evaluation }) => {
  const [expanded, setExpanded] = useState(false);
  const grade = evaluation.grade || "—";
  const dataGrade = ["A", "B", "C", "D", "F"].includes(grade) ? grade : undefined;
  const score = Math.min(100, evaluation.score || 0);

  return (
    <div
      className={["ui-karl-eval", expanded ? "ui-karl-eval--open" : ""].filter(Boolean).join(" ")}
      data-grade={dataGrade}
    >
      <div className="ui-karl-eval__head">
        <div className="ui-karl-eval__grade-wrap">
          <span className="ui-karl-eval__grade-letter">{grade}</span>
        </div>
        <div className="ui-karl-eval__main">
          <div className="ui-karl-eval__title-row">
            <span className="ui-karl-eval__title">Karl evaluation · {evaluation.score}/100</span>
            <div className="ui-karl-eval__counts">
              {evaluation.passed.length > 0 && <span className="ui-karl-eval__pill-pass">✓ {evaluation.passed.length}</span>}
              {evaluation.warnings.length > 0 && <span className="ui-karl-eval__pill-warn">⚠ {evaluation.warnings.length}</span>}
              {evaluation.failed.length > 0 && <span className="ui-karl-eval__pill-fail">✗ {evaluation.failed.length}</span>}
            </div>
          </div>
          <svg className="ui-karl-eval__track-svg" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden>
            <rect className="ui-karl-eval__track-bg" x="0" y="0" width="100" height="3" rx="1.5" />
            <rect className="ui-karl-eval__track-fill" x="0" y="0" width={score} height="3" rx="1.5" />
          </svg>
        </div>
        <button
          type="button"
          className="ui-karl-eval__toggle"
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? "Collapse Karl evaluation details" : "Expand Karl evaluation details"}
          title={expanded ? "Show less" : "Show more"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d={expanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      </div>
      {expanded && (
        <div className="ui-karl-eval__body">
          <p className="ui-karl-eval__summary">{evaluation.summary}</p>
          {evaluation.passed.length > 0 && (
            <div className="ui-karl-eval__section">
              <p className="ui-karl-eval__section-title ui-karl-eval__section-title--pass">Passed</p>
              {evaluation.passed.map((item, i) => (
                <div key={i} className="ui-karl-eval__item">
                  <span className="ui-karl-eval__icon-pass">✓</span>
                  <span className="ui-karl-eval__item-text">{item}</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.warnings.length > 0 && (
            <div className="ui-karl-eval__section">
              <p className="ui-karl-eval__section-title ui-karl-eval__section-title--warn">Warnings</p>
              {evaluation.warnings.map((item, i) => (
                <div key={i} className="ui-karl-eval__item">
                  <span className="ui-karl-eval__icon-warn">⚠</span>
                  <span className="ui-karl-eval__item-text">{item}</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.failed.length > 0 && (
            <div className="ui-karl-eval__section">
              <p className="ui-karl-eval__section-title ui-karl-eval__section-title--fail">Failed</p>
              {evaluation.failed.map((item, i) => (
                <div key={i} className="ui-karl-eval__item">
                  <span className="ui-karl-eval__icon-fail">✗</span>
                  <span className="ui-karl-eval__item-text">{item}</span>
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
  /** Used for bulk Library delete when `message` is omitted */
  count?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  loadingConfirmLabel?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  count = 0,
  onConfirm,
  onCancel,
  isLoading = false,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  loadingConfirmLabel
}) => {
  if (!isOpen) return null;

  const modalTitle = title ?? "Confirm Delete";
  const modalMessage =
    message ??
    `Delete ${count} selected page${count !== 1 ? "s" : ""}? This cannot be undone.`;
  const btnLabel = confirmLabel ?? "Delete";
  const loadingText =
    loadingConfirmLabel ?? (confirmVariant === "danger" ? "Deleting…" : "Working…");
  const confirmBtnVariant = confirmVariant === "primary" ? "primary" : "danger";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", padding: 24, maxWidth: 360, width: "100%", margin: "0 16px", border: "0.5px solid var(--color-border-secondary)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}>{modalTitle}</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.55 }}>
          {modalMessage}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="md" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Btn>
          <Btn variant={confirmBtnVariant} size="md" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? loadingText : btnLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
};

export const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => {
  const eased = progress < 80 ? progress : 80 + (progress - 80) * 1.8;
  const clamped = Math.min(100, eased);
  const done = progress === 100;
  return (
    <div className="ui-progress">
      <div className="ui-progress__head">
        <span className="ui-progress__label">{label}</span>
        <span className="ui-progress__pct">{Math.round(progress)}%</span>
      </div>
      <svg className="ui-progress__svg" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden>
        <rect className="ui-progress__track-rect" x="0" y="0" width="100" height="3" rx="1.5" />
        <rect
          className={["ui-progress__fill-rect", done ? "ui-progress__fill-rect--done" : ""].filter(Boolean).join(" ")}
          x="0"
          y="0"
          width={clamped}
          height="3"
          rx="1.5"
        />
      </svg>
      <div className="ui-progress__milestones">
        {MILESTONE_DOTS.map(step => {
          const active = progress >= step.pct;
          return (
            <div key={step.label} className={["ui-progress__ms", active ? "ui-progress__ms--active" : ""].filter(Boolean).join(" ")}>
              <div className="ui-progress__ms-dot" />
              <span className="ui-progress__ms-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
