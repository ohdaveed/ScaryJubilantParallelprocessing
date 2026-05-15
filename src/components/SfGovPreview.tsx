import React from "react";
import { clean } from "../utils/core";
import { parseDraftSections } from "../utils/parsing";
import { TYPE_META } from "../constants";
import { SF, PREVIEW_FRAME_MAX_WIDTH, PREVIEW_CONTENT_MAX_WIDTH } from "./sfGovPreview/constants";
import { SfGovHeader, SfGovFooter, PreviewBrowserChrome, PreviewPageTypeBadge } from "./sfGovPreview/SfGovUi";
import { PreviewSection } from "./sfGovPreview/SfGovSections";

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
        <PreviewBrowserChrome titleText="SF.gov / HHVC preview" />

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
          {typeLabel && <PreviewPageTypeBadge typeLabel={typeLabel} typeColor={typeColor} />}

          {sections.map((sec, i) => (
            <PreviewSection key={i} sec={sec} pageTitle={pageTitle} />
          ))}
        </div>

        <SfGovFooter />
      </div>
    </div>
  );
}
);
SfGovPagePreview.displayName = "SfGovPagePreview";
