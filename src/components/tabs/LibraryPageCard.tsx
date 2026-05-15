import React from "react";
import { PageDraft, PlannedPage, ReviewStatus, VerificationState } from "../../types";
import { Badge, Btn, Card } from "../ui";
import { artifactKindFromPage, artifactRoleLabel } from "../../utils/contentModel";
import { clean } from "../../utils/core";
import { getVerificationLabel, getVerificationState } from "../../utils/viewState";
import { TYPE_META } from "../../constants";

type LibraryPageCardProps = {
  page: PageDraft;
  selected: boolean;
  groupedCount: number;
  alternates: PageDraft[];
  alternatesOpen: boolean;
  canPromoteAlternates: boolean;
  linkedPlanned: PlannedPage | null;
  canMarkAsBuilt: boolean;
  onSelectPage: (page: PageDraft) => void;
  onTogglePageSelection: (id: string, e: React.MouseEvent) => void;
  onPrimaryAction: (page: PageDraft) => void;
  onOpenHistory: (pageId: string) => void;
  onOpenAlternate: (page: PageDraft) => void;
  onToggleAlternates: (representativeId: string) => void;
  onStartPromoteAlternate: (representativeId: string, page: PageDraft) => void;
  onStartMarkAsBuilt: (pageId: string) => void;
  onUpdateReviewStatus: (id: string, status: ReviewStatus) => Promise<void>;
};

// REFACTORED: Extracted the large per-page Library card renderer from LibraryTab to reduce file size and isolate card concerns.
export function LibraryPageCard({
  page,
  selected,
  groupedCount,
  alternates,
  alternatesOpen,
  canPromoteAlternates,
  linkedPlanned,
  canMarkAsBuilt,
  onSelectPage,
  onTogglePageSelection,
  onPrimaryAction,
  onOpenHistory,
  onOpenAlternate,
  onToggleAlternates,
  onStartPromoteAlternate,
  onStartMarkAsBuilt,
  onUpdateReviewStatus
}: LibraryPageCardProps) {
  const c = TYPE_META[clean(page.pageType)] || { dot: "#888" };
  const ev = page.karlEvaluation;
  const verificationState = getVerificationState(page);
  const objectRole = artifactRoleLabel(artifactKindFromPage(page));
  const gradeColor: Record<string, string> = { A: "#0F6E56", B: "#185FA5", C: "#854F0B", D: "#A32D2D", F: "#A32D2D" };

  const primaryAction = page.imported && (page.reviewStatus || "pending") === "pending"
    ? "Review import"
    : verificationState === "review_required"
      ? "Fix issues"
      : verificationState === "verified"
        ? "Open publish review"
        : "Continue draft";

  return (
    <Card
      key={page.id}
      onClick={() => onSelectPage(page)}
      className={["ui-card--lib", selected ? "ui-card--bulk-selected" : ""].filter(Boolean).join(" ")}
    >
      <div
        onClick={(e) => onTogglePageSelection(page.id, e)}
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          width: 18,
          height: 18,
          borderRadius: 4,
          border: selected ? "none" : "1.5px solid #aaa",
          background: selected ? "#e53e3e" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
          flexShrink: 0
        }}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, paddingLeft: 22 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0, ...(page.skeleton ? { border: "1.5px dashed #6B21A8", background: "transparent" } : {}) }} />
        <Badge type={clean(page.pageType)} small />
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#EEF4FA", color: "#185FA5", border: "0.5px solid #185FA533" }}>
          {objectRole}
        </span>
        {page.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F3E8FF", color: "#6B21A8", border: "1px dashed #6B21A866" }}>skeleton</span>}
        {page.imported && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F1EFE8", color: "#6B4C00", border: "0.5px solid #6B4C0033" }}>imported</span>}
        {groupedCount > 1 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#EEF2FF", color: "#4338CA", border: "0.5px solid #4338CA33" }}>{groupedCount} alternate drafts</span>}
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#eef2f6", color: "#334155", border: "0.5px solid #cbd5e1" }}>
          {getVerificationLabel(verificationState)}
        </span>
        {page.currentVersionNumber != null && page.currentVersionNumber > 0 && (
          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E8EFFA", color: "#185FA5", border: "0.5px solid #185FA533", fontWeight: 600 }}>v{page.currentVersionNumber}</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {ev && <span style={{ fontSize: 10, fontWeight: 700, color: gradeColor[ev.grade] || "#888" }}>{ev.grade}</span>}
          {!page.karlConnected && !page.skeleton && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FAEEDA", color: "#854F0B" }}>no Karl</span>}
        </div>
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4, color: "var(--color-text-primary)" }}>{clean(page.name) || "Untitled"}</p>
      <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 6px", lineHeight: 1.4 }}>
        {page.skeleton ? "Draft not yet linked to a canonical page." : page.imported ? "Imported draft waiting for editor review." : groupedCount > 1 ? "Alternate drafts are collapsed under this canonical row." : "Canonical draft with version history."}
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>
        {(clean(page.userGoal) || "").slice(0, 70)}
        {(clean(page.userGoal) || "").length > 70 ? "…" : ""}
      </p>

      {ev && (
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {ev.passed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#E1F5EE", color: "#0F6E56" }}>✓ {ev.passed.length}</span>}
          {ev.warnings.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FAEEDA", color: "#854F0B" }}>⚠ {ev.warnings.length}</span>}
          {ev.failed.length > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D" }}>✗ {ev.failed.length}</span>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, flex: 1 }}>{new Date(page.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        <Btn
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPrimaryAction(page);
          }}
        >
          {primaryAction}
        </Btn>
        {!page.skeleton && (
          <Btn
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory(page.id);
            }}
          >
            History
          </Btn>
        )}
        {linkedPlanned && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 999,
              background: "#E1F5EE",
              color: "#0F6E56",
              border: "1px solid #0F6E5640"
            }}
            title={`Built artifact for plan node "${linkedPlanned.name}"`}
          >
            Built · {linkedPlanned.name.length > 22 ? `${linkedPlanned.name.slice(0, 22)}…` : linkedPlanned.name}
          </span>
        )}
        {canMarkAsBuilt && (
          <Btn
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onStartMarkAsBuilt(page.id);
            }}
          >
            Mark as built
          </Btn>
        )}
        {alternates.length > 0 && (
          <Btn
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAlternates(page.id);
            }}
          >
            {alternatesOpen ? "Hide alternate drafts" : `View alternate drafts (${alternates.length})`}
          </Btn>
        )}
        {page.imported && (
          <select
            aria-label="Review status"
            title="Review status"
            value={page.reviewStatus || "pending"}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              e.stopPropagation();
              const newStatus = e.target.value as ReviewStatus;
              await onUpdateReviewStatus(page.id, newStatus);
            }}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              border: "0.5px solid",
              background: ({ pending: "#FAEEDA", approved: "#E1F5EE", rejected: "#FCEBEB" } as Record<string, string>)[page.reviewStatus || "pending"] || "#FAEEDA",
              color: ({ pending: "#854F0B", approved: "#0F6E56", rejected: "#A32D2D" } as Record<string, string>)[page.reviewStatus || "pending"] || "#854F0B",
              borderColor: ({ pending: "#854F0B33", approved: "#0F6E5633", rejected: "#A32D2D33" } as Record<string, string>)[page.reviewStatus || "pending"] || "#854F0B33",
              cursor: "pointer",
              appearance: "none" as const,
              WebkitAppearance: "none" as const
            }}
          >
            <option value="pending">pending review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        )}
      </div>

      {alternatesOpen && alternates.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px dashed #d1d5db", paddingTop: 8 }}>
          <p style={{ fontSize: 10, margin: "0 0 6px", color: "#6b7280" }}>Alternate drafts (non-canonical)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alternates.map((alt) => (
              <div key={alt.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAlternate(alt);
                  }}
                  style={{
                    fontSize: 10,
                    padding: "3px 7px",
                    borderRadius: 999,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#334155",
                    cursor: "pointer"
                  }}
                >
                  {`v${alt.currentVersionNumber || "?"} · ${new Date(alt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </button>
                {canPromoteAlternates && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartPromoteAlternate(page.id, alt);
                    }}
                    style={{
                      fontSize: 10,
                      padding: "3px 7px",
                      borderRadius: 999,
                      border: "1px solid #16a34a33",
                      background: "#f0fdf4",
                      color: "#166534",
                      cursor: "pointer"
                    }}
                  >
                    Make canonical
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
