import React from "react";
import { ReferenceExample } from "../types";

const REFERENCE_PAGE_TYPE_MAP: Record<string, string> = {
  transaction: "Transaction",
  information: "Information",
  topic: "Topic",
  step_by_step: "Step by step",
  step: "Step by step",
  campaign: "Campaign",
  resource_collection: "Resource Collection",
  location: "Location",
  about: "Information",
  meeting: "Information",
  profile: "Information",
  data_story: "Information",
  reports: "Information",
  news: "Information",
  event: "Campaign"
};

function pageTypeFromReferenceType(referenceType: string): string {
  const key = referenceType.trim().toLowerCase().replace(/\s+/g, "_");
  return REFERENCE_PAGE_TYPE_MAP[key] || "Information";
}

export default function IdealSiteMap({
  references,
  onGenerateFromReference
}: {
  references: ReferenceExample[];
  onGenerateFromReference?: (reference: ReferenceExample, suggestedPageType: string) => void;
}) {
  if (!references.length) {
    return (
      <div style={{ textAlign: "center", padding: "56px 0", color: "var(--color-text-tertiary)" }}>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No reference examples yet</p>
        <p style={{ fontSize: 13, margin: 0 }}>Ideal Map is reserved for benchmark patterns and examples only.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ padding: "6px 0 2px" }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", fontWeight: 600 }}>
          Reference benchmark only
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          This view should never mix working drafts, queue items, or canonical HHVC architecture. It is only for reference structures and benchmark patterns.
        </p>
      </div>

      {references.map((reference) => {
        const suggestedPageType = pageTypeFromReferenceType(reference.referenceType);
        return (
          <section
            key={reference.id}
            style={{
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 10,
              background: "var(--color-background-primary)",
              padding: "14px 16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#185FA5" }}>
                Reference
              </span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#E8EFFA", color: "#185FA5", border: "1px solid #185FA533" }}>
                {reference.referenceType.replace(/_/g, " ")}
              </span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F7F6F2", color: "var(--color-text-secondary)" }}>
                {reference.mappedPattern}
              </span>
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--color-text-primary)" }}>{reference.title}</h3>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Source: {reference.sourceSystem}
            </p>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>{reference.notes}</p>
            {onGenerateFromReference && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => onGenerateFromReference(reference, suggestedPageType)}
                  style={{
                    fontSize: 12,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #185FA5",
                    background: "#fff",
                    color: "#0C447C",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                  title={`Pre-fill Generate with this benchmark as a ${suggestedPageType} page`}
                >
                  Generate from this benchmark →
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
