import { describe, expect, it } from "vitest";
import {
  HHVC_WORKING_IA_MAP_ID,
  hhvcCanonicalWorkingKarlConnectionSummary,
  hhvcCanonicalWorkingIaNodes,
  hhvcCanonicalWorkingIaSeed
} from "./data/hhvcCanonicalWorkingIaSeed";

describe("HHVC canonical working IA seed", () => {
  it("uses unique slugs and valid parent references", () => {
    const slugs = hhvcCanonicalWorkingIaSeed.map((concept) => concept.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const slugSet = new Set(slugs);
    for (const concept of hhvcCanonicalWorkingIaSeed) {
      if (concept.parentSlug) {
        expect(slugSet.has(concept.parentSlug)).toBe(true);
      }
    }
  });

  it("builds a complete placed working map", () => {
    expect(hhvcCanonicalWorkingIaNodes).toHaveLength(hhvcCanonicalWorkingIaSeed.length);
    expect(hhvcCanonicalWorkingIaNodes.every((node) => node.iaMapId === HHVC_WORKING_IA_MAP_ID)).toBe(true);
    expect(hhvcCanonicalWorkingIaNodes.every((node) => node.placementStatus === "placed")).toBe(true);
  });

  it("keeps a single root and five top-level hubs", () => {
    const roots = hhvcCanonicalWorkingIaSeed.filter((concept) => concept.parentSlug === null);
    expect(roots).toHaveLength(1);
    expect(roots[0].slug).toBe("hhvc-root");

    const topLevel = hhvcCanonicalWorkingIaSeed.filter((concept) => concept.parentSlug === "hhvc-root");
    expect(topLevel).toHaveLength(5);
  });

  it("preserves campaign and resource collection as first-class content types", () => {
    const campaign = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "request-mosquito-education-workshop");
    const resourceCollection = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "healthy-housing-guides-and-resources");

    expect(campaign?.contentType).toBe("campaign");
    expect(resourceCollection?.contentType).toBe("resource_collection");
  });

  it("captures Karl placement modes explicitly", () => {
    expect(hhvcCanonicalWorkingKarlConnectionSummary.rootTopicSlug).toBe("hhvc-root");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.childTopicSlugs).toHaveLength(5);
    expect(hhvcCanonicalWorkingKarlConnectionSummary.autoServiceSlugs).toHaveLength(15);
    expect(hhvcCanonicalWorkingKarlConnectionSummary.manualSectionSlugs).toHaveLength(26);

    const reportRats = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "report-rats-or-mice");
    const fixHub = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "fix-housing-or-pest-problem");
    const workshop = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "request-mosquito-education-workshop");
    const fixInspection = hhvcCanonicalWorkingIaSeed.find((concept) => concept.slug === "get-ready-housing-inspection");

    expect(reportRats?.karlConnection).toEqual({
      placementKind: "auto_service",
      placementMode: "auto_service",
      parentTopicSlug: "report-pest-or-housing-problem",
      topicTagSlug: "report-pest-or-housing-problem",
      sectionSurface: "services",
      sectionHeading: "More services",
      sectionOrder: null,
      relatedEligible: true,
      resourcesEligible: false
    });

    expect(fixHub?.karlConnection).toEqual({
      placementKind: "child_topic",
      placementMode: "none",
      parentTopicSlug: "hhvc-root",
      topicTagSlug: null,
      sectionSurface: null,
      sectionHeading: null,
      sectionOrder: null,
      relatedEligible: true,
      resourcesEligible: true
    });

    expect(workshop?.karlConnection).toEqual({
      placementKind: "manual_section",
      placementMode: "manual_section",
      parentTopicSlug: "learn-about-programs-and-services",
      topicTagSlug: "learn-about-programs-and-services",
      sectionSurface: "resources",
      sectionHeading: "Programs and outreach",
      sectionOrder: 3,
      relatedEligible: true,
      resourcesEligible: true
    });

    expect(fixInspection?.karlConnection).toEqual({
      placementKind: "manual_section",
      placementMode: "manual_section",
      parentTopicSlug: "fix-housing-or-pest-problem",
      topicTagSlug: "fix-housing-or-pest-problem",
      sectionSurface: "services",
      sectionHeading: "After you report",
      sectionOrder: 0,
      relatedEligible: true,
      resourcesEligible: false
    });
  });

  it("tracks Karl section assignment and eligibility by content type", () => {
    expect(hhvcCanonicalWorkingKarlConnectionSummary.servicesSectionSlugs).toContain("report-rats-or-mice");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.servicesSectionSlugs).toContain("get-ready-housing-inspection");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.servicesSectionSlugs).not.toContain("healthy-housing-guides-and-resources");

    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesSectionSlugs).toContain("request-mosquito-education-workshop");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesSectionSlugs).toContain("healthy-housing-guides-and-resources");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesSectionSlugs).not.toContain("report-rats-or-mice");

    expect(hhvcCanonicalWorkingKarlConnectionSummary.manualSectionHeadings["After you report"]).toContain("get-ready-housing-inspection");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.manualSectionHeadings["Programs and outreach"]).toContain("request-mosquito-education-workshop");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.manualSectionHeadings["Guides and resources"]).toContain("healthy-housing-guides-and-resources");

    expect(hhvcCanonicalWorkingKarlConnectionSummary.relatedEligibleSlugs).toContain("report-rats-or-mice");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.relatedEligibleSlugs).toContain("request-mosquito-education-workshop");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.relatedEligibleSlugs).not.toContain("healthy-housing-guides-and-resources");

    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesEligibleSlugs).toContain("hhvc-root");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesEligibleSlugs).toContain("request-mosquito-education-workshop");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesEligibleSlugs).toContain("healthy-housing-guides-and-resources");
    expect(hhvcCanonicalWorkingKarlConnectionSummary.resourcesEligibleSlugs).not.toContain("report-rats-or-mice");
  });
});
