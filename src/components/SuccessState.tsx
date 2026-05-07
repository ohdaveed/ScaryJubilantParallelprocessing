import React, { memo } from "react";
import { PageDraft } from "../types";
import { Badge, Btn } from "./ui";
import { clean } from "../utils";

export const SuccessState = memo(function SuccessState({ page, onView }: { page: PageDraft; onView: () => void }) {
  const ev = page.karlEvaluation;
  const grade = ev?.grade || "—";
  const versionNumber = page.currentVersionNumber;

  const gradeKey = ["A", "B", "C", "D", "F"].includes(grade) ? grade : "none";

  return (
    <div className="app-success">
      <div className="app-success__icon-wrap">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11" /></svg>
      </div>
      <div className="app-success__body">
        <p className="app-success__name">{clean(page?.name) || "Page generated"}</p>
        <p className="app-success__desc">
          {versionNumber != null
            ? `Draft v${versionNumber} saved for this page and evaluated against Karl content standards.`
            : "Draft saved for this page and evaluated against Karl content standards."}
        </p>
      </div>

      <div className="app-success__badges">
        <Badge type={clean(page?.pageType)} />
        {ev && (
          <div className="app-grade-chip" data-grade={gradeKey}>
            <span className="app-grade-chip__letter">{grade}</span>
            <span className="app-grade-chip__score">{ev.score}/100</span>
          </div>
        )}
      </div>

      {ev && (
        <div className="app-success__eval-wrap">
          <div className="app-success__eval-box">
            <p className="app-success__eval-summary">{ev.summary}</p>
            <div className="app-success__stat-row">
              {ev.passed.length > 0 && <span className="app-stat-pill app-stat-pill--pass">✓ {ev.passed.length} passed</span>}
              {ev.warnings.length > 0 && <span className="app-stat-pill app-stat-pill--warn">⚠ {ev.warnings.length} warnings</span>}
              {ev.failed.length > 0 && <span className="app-stat-pill app-stat-pill--fail">✗ {ev.failed.length} failed</span>}
            </div>
          </div>
        </div>
      )}

      <Btn onClick={onView} variant="primary" size="md">View full page →</Btn>
    </div>
  );
});