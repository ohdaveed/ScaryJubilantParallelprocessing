import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./SfGovContentDesignTool.css";

export type ContentDesignTab = { id: string; label: string };

export type KarlCheckStatus = "pass" | "warn" | "fail";

export type KarlEvaluationView = {
  grade: string;
  score: number;
  maxScore?: number;
  warningsSummary?: string;
  checks: readonly { id: string; label: string; status: KarlCheckStatus }[];
};

export type LibraryPageRow = {
  id: string;
  title: string;
  pageType: string;
  gradeLetter?: string;
};

export type SfGovContentDesignToolProps = {
  className?: string;
  style?: React.CSSProperties;
  /** Semantic version or build label shown in the top bar */
  version?: string;
  tabs: readonly ContentDesignTab[];
  activeTabId: string;
  onTabChange?: (id: string) => void;
  onSettingsClick?: () => void;
  onExportClick?: () => void;
  userType: string;
  onUserTypeChange?: (value: string) => void;
  userTypeOptions?: readonly string[];
  pageTypeOptions?: readonly string[];
  activePageType: string;
  onPageTypeChange?: (value: string) => void;
  pageGoal: string;
  onPageGoalChange?: (value: string) => void;
  additionalContext: string;
  onAdditionalContextChange?: (value: string) => void;
  onGenerateClick?: () => void;
  generateLabel?: string;
  generateDisabled?: boolean;
  karlEvaluation?: KarlEvaluationView | null;
  libraryPages?: readonly LibraryPageRow[];
  selectedLibraryPageId?: string | null;
  onLibraryPageSelect?: (id: string) => void;
  onLibraryPageDelete?: (id: string) => void;
  previewUrlText?: string;
  previewSlot: React.ReactNode;
  onExpandPreview?: () => void;
  onExportPreview?: () => void;
  streamStatus?: string;
  streamMessage?: string;
  streamFooterMeta?: string;
  defaultLeftPanelWidth?: number;
  minLeftPanelWidth?: number;
  maxLeftPanelWidth?: number;
};

const DEFAULT_USER_TYPES = ["Resident", "Business Owner", "Contractor", "City Employee"] as const;

const DEFAULT_PAGE_TYPES = [
  "Transaction",
  "Information",
  "Department",
  "Topic",
  "Step-by-step",
  "Form"
] as const;

function normalizePageTypeKey(pageType: string): string {
  return pageType.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Maps page type labels to the reference design’s dot color classes */
export function pageTypeToDotClass(pageType: string): string {
  const key = normalizePageTypeKey(pageType);
  if (key === "transaction") return "type-dot-transaction";
  if (key === "information") return "type-dot-information";
  if (key === "department") return "type-dot-department";
  if (key === "topic") return "type-dot-topic";
  if (key === "step-by-step" || key === "step-by-step".replace(/\s+/g, "-") || key === "step-by-step") return "type-dot-step-by-step";
  if (key === "step-by-step" || key === "step-by-step") {
    return "type-dot-step-by-step";
  }
  if (key === "step-by-step" || key === "step-by-step") {
    return "type-dot-step-by-step";
  }
  if (key === "form") return "type-dot-form";
  return "type-dot-default";
}

function gradeToBadgeClass(grade: string): string {
  const g = grade.trim().toUpperCase().charAt(0);
  if (g === "A") return "grade-A";
  if (g === "B") return "grade-B";
  if (g === "C") return "grade-C";
  if (g === "D" || g === "F") return "grade-D";
  return "grade-B";
}

function IconSettings() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

type LibraryRowProps = {
  page: LibraryPageRow;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  dismissSignal: number;
};

function LibraryPageItem({ page, active, onSelect, onDelete, dismissSignal }: LibraryRowProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [dismissSignal]);

  const dotClass = pageTypeToDotClass(page.pageType);

  return (
    <div className={`page-item${active ? " active" : ""}${confirming ? " confirming" : ""}`}>
      <button type="button" className="page-main" onClick={onSelect}>
        <span className={`page-dot ${dotClass}`} aria-hidden />
        <span className="page-name">{page.title}</span>
        {page.gradeLetter ? <span className="page-built">{page.gradeLetter}</span> : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="page-delete"
          title="Delete page"
          aria-label={`Delete ${page.title}`}
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          <IconTrash />
        </button>
      ) : null}
      <div className="confirm-row">
        <span className="confirm-text">Delete this page?</span>
        <button type="button" className="confirm-yes" onClick={() => onDelete?.()}>
          Delete
        </button>
        <button type="button" className="confirm-no" onClick={() => setConfirming(false)}>
          Keep
        </button>
      </div>
    </div>
  );
}

export function SfGovContentDesignTool({
  className,
  style,
  version = "v0.9.4",
  tabs,
  activeTabId,
  onTabChange,
  onSettingsClick,
  onExportClick,
  userType,
  onUserTypeChange,
  userTypeOptions = DEFAULT_USER_TYPES,
  pageTypeOptions = DEFAULT_PAGE_TYPES,
  activePageType,
  onPageTypeChange,
  pageGoal,
  onPageGoalChange,
  additionalContext,
  onAdditionalContextChange,
  onGenerateClick,
  generateLabel = "Generate page draft",
  generateDisabled = false,
  karlEvaluation,
  libraryPages = [],
  selectedLibraryPageId,
  onLibraryPageSelect,
  onLibraryPageDelete,
  previewUrlText = "sf.gov / preview",
  previewSlot,
  onExpandPreview,
  onExportPreview,
  streamStatus = "Connected",
  streamMessage = "",
  streamFooterMeta,
  defaultLeftPanelWidth = 300,
  minLeftPanelWidth = 240,
  maxLeftPanelWidth = 480
}: SfGovContentDesignToolProps) {
  const baseId = useId();
  const userFieldId = `${baseId}-user-type`;
  const goalFieldId = `${baseId}-goal`;
  const contextFieldId = `${baseId}-context`;

  const [leftWidth, setLeftWidth] = useState(defaultLeftPanelWidth);
  const dragActive = useRef(false);
  const [dismissConfirm, setDismissConfirm] = useState(0);

  const shellStyle = useMemo(
    () =>
      ({
        ...style,
        ["--left-panel-width" as string]: `${leftWidth}px`
      }) as React.CSSProperties,
    [style, leftWidth]
  );

  const onPointerDownHandle = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragActive.current = true;
    },
    []
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragActive.current) return;
      const shell = document.getElementById(`${baseId}-shell`);
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      const next = e.clientX - rect.left;
      setLeftWidth(Math.min(maxLeftPanelWidth, Math.max(minLeftPanelWidth, next)));
    };
    const onUp = () => {
      dragActive.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [baseId, maxLeftPanelWidth, minLeftPanelWidth]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.(".page-item")) {
        setDismissConfirm((n) => n + 1);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const maxScore = karlEvaluation?.maxScore ?? 100;
  const scorePct = karlEvaluation ? Math.min(100, Math.max(0, (karlEvaluation.score / maxScore) * 100)) : 0;

  const rootClass = ["sf-cdt", className].filter(Boolean).join(" ");

  return (
    <div id={`${baseId}-shell`} className={rootClass} style={shellStyle}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon" aria-hidden>
              SF
            </div>
            <div>
              <div className="brand-text">SF.gov Content Tool</div>
              <div className="brand-sub">HHVC · Design System</div>
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Main">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`tab${isActive ? " active" : ""}`}
                  onClick={() => onTabChange?.(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="topbar-actions">
            <span className="pill-badge">{version}</span>
            <button type="button" className="icon-btn" title="Settings" aria-label="Settings" onClick={() => onSettingsClick?.()}>
              <IconSettings />
            </button>
            <button type="button" className="icon-btn" title="Export PNG" aria-label="Export PNG" onClick={() => onExportClick?.()}>
              <IconExport />
            </button>
          </div>
        </header>

        <div className="main">
          <aside className="left-panel" aria-label="Editor controls">
            <section className="panel-section">
              <div className="section-label">Context</div>
              <div className="field">
                <label className="field-label" htmlFor={userFieldId}>
                  User Type
                </label>
                <select
                  id={userFieldId}
                  className="field-select"
                  value={userType}
                  onChange={(e) => onUserTypeChange?.(e.target.value)}
                >
                  {userTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div className="field-label" id={`${baseId}-page-type-label`}>
                  Page Type
                </div>
                <div className="chips" role="group" aria-labelledby={`${baseId}-page-type-label`}>
                  {pageTypeOptions.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      className={`chip${pt === activePageType ? " active" : ""}`}
                      onClick={() => onPageTypeChange?.(pt)}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-label">Prompt</div>
              <div className="field">
                <label className="field-label" htmlFor={goalFieldId}>
                  Page Name / Goal
                </label>
                <input
                  id={goalFieldId}
                  className="field-input"
                  type="text"
                  placeholder="e.g. Apply for a business permit"
                  value={pageGoal}
                  onChange={(e) => onPageGoalChange?.(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor={contextFieldId}>
                  Additional Context
                </label>
                <textarea
                  id={contextFieldId}
                  className="field-textarea"
                  placeholder="Describe any requirements, tone, audience, or constraints…"
                  value={additionalContext}
                  onChange={(e) => onAdditionalContextChange?.(e.target.value)}
                />
              </div>
              <button type="button" className="generate-btn" disabled={generateDisabled} onClick={() => onGenerateClick?.()}>
                <IconSpark />
                {generateLabel}
              </button>
            </section>

            {karlEvaluation ? (
              <section className="panel-section">
                <div className="section-label">Karl Evaluation</div>
                <div className="karl-card">
                  <div className="karl-header">
                    <div className="karl-name">Content Grade</div>
                    <div className={`grade-badge ${gradeToBadgeClass(karlEvaluation.grade)}`} aria-label={`Grade ${karlEvaluation.grade}`}>
                      {karlEvaluation.grade.trim().charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="score-bar-wrap">
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${scorePct}%` }} />
                    </div>
                    <div className="score-text">
                      <span>
                        {karlEvaluation.score} / {maxScore}
                      </span>
                      <span>{karlEvaluation.warningsSummary ?? ""}</span>
                    </div>
                  </div>
                  <div className="karl-checks">
                    {karlEvaluation.checks.map((c) => (
                      <div key={c.id} className="karl-check">
                        <span className={`check-dot check-${c.status === "pass" ? "pass" : c.status === "warn" ? "warn" : "fail"}`} aria-hidden />
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="panel-section panel-section--grow">
              <div className="section-label">
                Library <span className="section-label-meta">{libraryPages.length} page{libraryPages.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="page-list">
                {libraryPages.map((p) => (
                  <LibraryPageItem
                    key={p.id}
                    page={p}
                    active={p.id === selectedLibraryPageId}
                    dismissSignal={dismissConfirm}
                    onSelect={() => onLibraryPageSelect?.(p.id)}
                    onDelete={onLibraryPageDelete ? () => onLibraryPageDelete(p.id) : undefined}
                  />
                ))}
              </div>
            </section>
          </aside>

          <div
            className={`drag-handle${dragActive.current ? " is-dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={leftWidth}
            aria-valuemin={minLeftPanelWidth}
            aria-valuemax={maxLeftPanelWidth}
            tabIndex={0}
            onPointerDown={onPointerDownHandle}
            onKeyDown={(e) => {
              const step = 10;
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                setLeftWidth((w) => Math.max(minLeftPanelWidth, w - step));
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                setLeftWidth((w) => Math.min(maxLeftPanelWidth, w + step));
              }
            }}
          />

          <section className="right-panel" aria-label="Preview">
            <div className="preview-topbar">
              <div className="browser-dots" aria-hidden>
                <div className="bdot bdot-r" />
                <div className="bdot bdot-y" />
                <div className="bdot bdot-g" />
              </div>
              <div className="url-bar">
                <span className="url-secure" title="Secure">
                  <IconLock />
                </span>
                <span className="url-text">{previewUrlText}</span>
              </div>
              <div className="preview-toolbar-actions">
                <button type="button" className="icon-btn icon-btn--preview" title="Fit" aria-label="Fit preview" onClick={() => onExpandPreview?.()}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--preview icon-btn--preview-active"
                  title="Export preview"
                  aria-label="Export preview"
                  onClick={() => onExportPreview?.()}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="preview-scroll anim-fade-up">{previewSlot}</div>
          </section>
        </div>

        <footer className="stream-bar">
          <div className="stream-status">
            <div className="status-dot" aria-hidden />
            <span>{streamStatus}</span>
          </div>
          <div className="stream-text">{streamMessage}</div>
          {streamFooterMeta ? <div className="stream-footer-meta">{streamFooterMeta}</div> : null}
        </footer>
      </div>
    </div>
  );
}

export default SfGovContentDesignTool;
