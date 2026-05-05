import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import IdealSiteMap from "./IdealSiteMap";

describe("IdealSiteMap", () => {
  it("renders reference examples without mixing working IA copy", () => {
    const html = renderToStaticMarkup(
      <IdealSiteMap
        references={[
          {
            id: 1,
            title: "Healthy housing and pests",
            sourceSystem: "HHVC reference benchmark",
            referenceType: "topic_hub",
            notes: "Reference-only benchmark for the root HHVC topic structure.",
            mappedPattern: "Root topic hub",
            referenceMapId: "hhvc-reference"
          }
        ]}
      />
    );

    expect(html).toContain("Reference benchmark only");
    expect(html).toContain("Healthy housing and pests");
    expect(html).not.toContain("No pages yet");
  });
});
