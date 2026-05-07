import { buildIntentKey, contentTypeFromPageType } from "../../lib/contentModel.js";

export const HHVC_WORKING_IA_MAP_ID = "hhvc-working";
export const HHVC_SERVICE_AREA = "hhvc";

export interface CanonicalSeedConceptInput {
  slug: string;
  canonicalTitle: string;
  pageType: string;
  audience: string;
  summary: string;
  taskStatement: string;
  parentSlug: string | null;
  position: number;
}

export type KarlPlacementKind =
  | "root_topic"
  | "child_topic"
  | "auto_service"
  | "manual_section";

export type KarlPlacementMode = "none" | "auto_service" | "manual_section";
export type KarlSectionSurface = "services" | "resources";

export interface KarlConnectionMetadata {
  placementKind: KarlPlacementKind;
  placementMode: KarlPlacementMode;
  parentTopicSlug: string | null;
  topicTagSlug: string | null;
  sectionSurface: KarlSectionSurface | null;
  sectionHeading: string | null;
  sectionOrder: number | null;
  relatedEligible: boolean;
  resourcesEligible: boolean;
}

export interface CanonicalSeedConcept extends CanonicalSeedConceptInput {
  contentType: ReturnType<typeof contentTypeFromPageType>;
  serviceArea: string;
  status: "canonical";
  intentKey: string;
  karlConnection: KarlConnectionMetadata;
}

const RELATED_ELIGIBLE_CONTENT_TYPES = new Set([
  "topic",
  "transaction",
  "information",
  "campaign"
]);

const RESOURCES_ELIGIBLE_CONTENT_TYPES = new Set([
  "topic",
  "campaign",
  "resource_collection"
]);

const DEFAULT_MANUAL_SECTION_HEADINGS: Record<string, string> = {
  "fix-housing-or-pest-problem": "Fix and follow-up",
  "prevent-pests-keep-home-healthy": "Prevention guides",
  "learn-about-programs-and-services": "Program information",
  "find-tools-fees-and-help": "Tools and support"
};

const manualSectionConfig = (input: CanonicalSeedConceptInput, contentType: ReturnType<typeof contentTypeFromPageType>) => {
  const parentTopicSlug = input.parentSlug;
  const defaultHeading = parentTopicSlug ? DEFAULT_MANUAL_SECTION_HEADINGS[parentTopicSlug] ?? "More information" : "More information";

  if (contentType === "campaign") {
    return {
      sectionSurface: "resources" as const,
      sectionHeading: "Programs and outreach"
    };
  }

  if (contentType === "resource_collection") {
    return {
      sectionSurface: "resources" as const,
      sectionHeading: "Guides and resources"
    };
  }

  if (parentTopicSlug === "learn-about-programs-and-services" || parentTopicSlug === "find-tools-fees-and-help") {
    return {
      sectionSurface: "resources" as const,
      sectionHeading: defaultHeading
    };
  }

  return {
    sectionSurface: "services" as const,
    sectionHeading: defaultHeading
  };
};

const buildKarlConnection = (input: CanonicalSeedConceptInput, contentType: ReturnType<typeof contentTypeFromPageType>): KarlConnectionMetadata => {
  if (!input.parentSlug) {
    return {
      placementKind: "root_topic",
      placementMode: "none",
      parentTopicSlug: null,
      topicTagSlug: null,
      sectionSurface: null,
      sectionHeading: null,
      sectionOrder: null,
      relatedEligible: RELATED_ELIGIBLE_CONTENT_TYPES.has(contentType),
      resourcesEligible: RESOURCES_ELIGIBLE_CONTENT_TYPES.has(contentType)
    };
  }

  if (contentType === "topic") {
    return {
      placementKind: "child_topic",
      placementMode: "none",
      parentTopicSlug: input.parentSlug,
      topicTagSlug: null,
      sectionSurface: null,
      sectionHeading: null,
      sectionOrder: null,
      relatedEligible: true,
      resourcesEligible: true
    };
  }

  if (contentType === "transaction" || contentType === "step_by_step") {
    return {
      placementKind: "auto_service",
      placementMode: "auto_service",
      parentTopicSlug: input.parentSlug,
      topicTagSlug: input.parentSlug,
      sectionSurface: "services",
      sectionHeading: "More services",
      sectionOrder: null,
      relatedEligible: RELATED_ELIGIBLE_CONTENT_TYPES.has(contentType),
      resourcesEligible: RESOURCES_ELIGIBLE_CONTENT_TYPES.has(contentType)
    };
  }

  const manualSection = manualSectionConfig(input, contentType);

  return {
    placementKind: "manual_section",
    placementMode: "manual_section",
    parentTopicSlug: input.parentSlug,
    topicTagSlug: input.parentSlug,
    sectionSurface: manualSection.sectionSurface,
    sectionHeading: manualSection.sectionHeading,
    sectionOrder: input.position,
    relatedEligible: RELATED_ELIGIBLE_CONTENT_TYPES.has(contentType),
    resourcesEligible: RESOURCES_ELIGIBLE_CONTENT_TYPES.has(contentType)
  };
};

const defineConcept = (input: CanonicalSeedConceptInput): CanonicalSeedConcept => {
  const contentType = contentTypeFromPageType(input.pageType);

  return {
    ...input,
    contentType,
    serviceArea: HHVC_SERVICE_AREA,
    status: "canonical",
    intentKey: buildIntentKey(input.taskStatement, input.audience, HHVC_SERVICE_AREA),
    karlConnection: buildKarlConnection(input, contentType)
  };
};

export const hhvcCanonicalWorkingIaSeed: CanonicalSeedConcept[] = [
  defineConcept({
    slug: "hhvc-root",
    canonicalTitle: "Get help with pests and housing problems",
    pageType: "Topic",
    audience: "General public",
    summary: "Get help with pests, garbage, and moisture. Learn to report, fix, and prevent problems.",
    taskStatement: "Choose the right next step for a pest or housing problem.",
    parentSlug: null,
    position: 0
  }),
  defineConcept({
    slug: "report-pest-or-housing-problem",
    canonicalTitle: "Report a pest or housing problem",
    pageType: "Topic",
    audience: "General public",
    summary: "Report pests, garbage, or moisture issues. Submit a 311 request and get help.",
    taskStatement: "Choose the right report path for a pest or housing problem.",
    parentSlug: "hhvc-root",
    position: 0
  }),
  defineConcept({
    slug: "report-rats-or-mice",
    canonicalTitle: "Report rats or mice",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report rats or mice and request an inspection through 311.",
    taskStatement: "Report rats or mice and request city inspection.",
    parentSlug: "report-pest-or-housing-problem",
    position: 0
  }),
  defineConcept({
    slug: "report-cockroaches",
    canonicalTitle: "Report cockroaches",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report cockroaches and request an inspection through 311.",
    taskStatement: "Report cockroaches and request city inspection.",
    parentSlug: "report-pest-or-housing-problem",
    position: 1
  }),
  defineConcept({
    slug: "report-bed-bugs",
    canonicalTitle: "Report bed bugs",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report bed bugs and request an inspection through 311.",
    taskStatement: "Report bed bugs and request city inspection.",
    parentSlug: "report-pest-or-housing-problem",
    position: 2
  }),
  defineConcept({
    slug: "report-pigeons",
    canonicalTitle: "Report pigeons",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report pigeon problems and request City assistance.",
    taskStatement: "Report pigeon problems and request city assistance.",
    parentSlug: "report-pest-or-housing-problem",
    position: 3
  }),
  defineConcept({
    slug: "report-mosquitoes-home-yard",
    canonicalTitle: "Report mosquitoes in your home or yard",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report mosquitoes and standing water near your home.",
    taskStatement: "Report mosquitoes or standing water near a home.",
    parentSlug: "report-pest-or-housing-problem",
    position: 4
  }),
  defineConcept({
    slug: "report-yellow-jackets",
    canonicalTitle: "Report yellow jackets",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report yellow jacket nests or activity near your home.",
    taskStatement: "Report yellow jacket nests or activity near a home.",
    parentSlug: "report-pest-or-housing-problem",
    position: 5
  }),
  defineConcept({
    slug: "report-raccoons",
    canonicalTitle: "Report raccoons",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report raccoon problems or unsafe wildlife activity.",
    taskStatement: "Report raccoon problems or unsafe wildlife activity.",
    parentSlug: "report-pest-or-housing-problem",
    position: 6
  }),
  defineConcept({
    slug: "report-garbage-or-dirty-conditions",
    canonicalTitle: "Report garbage or dirty conditions",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report garbage or unsanitary conditions that attract pests.",
    taskStatement: "Report garbage or unsanitary conditions that attract pests.",
    parentSlug: "report-pest-or-housing-problem",
    position: 7
  }),
  defineConcept({
    slug: "report-animal-waste-flies-pest-conditions",
    canonicalTitle: "Report animal waste, flies, or pest conditions",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report animal waste, flies, or conditions attracting pests.",
    taskStatement: "Report animal waste, flies, or pest-attracting conditions.",
    parentSlug: "report-pest-or-housing-problem",
    position: 8
  }),
  defineConcept({
    slug: "report-clutter-or-too-many-materials",
    canonicalTitle: "Report clutter or too many materials",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report clutter or stored items causing health problems.",
    taskStatement: "Report clutter or stored materials causing health problems.",
    parentSlug: "report-pest-or-housing-problem",
    position: 9
  }),
  defineConcept({
    slug: "report-overgrown-plants-or-weeds",
    canonicalTitle: "Report overgrown plants or weeds",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report overgrown vegetation that may attract pests.",
    taskStatement: "Report overgrown vegetation that may attract pests.",
    parentSlug: "report-pest-or-housing-problem",
    position: 10
  }),
  defineConcept({
    slug: "report-indoor-moisture-problems",
    canonicalTitle: "Report indoor moisture problems (not leaks)",
    pageType: "Transaction",
    audience: "Resident / tenant",
    summary: "Report indoor moisture or condensation issues (not leaks).",
    taskStatement: "Report indoor moisture or condensation problems in a home.",
    parentSlug: "report-pest-or-housing-problem",
    position: 11
  }),
  defineConcept({
    slug: "report-health-problem-sro-hotel",
    canonicalTitle: "Report a health problem in an SRO or hotel",
    pageType: "Transaction",
    audience: "Resident / tenant",
    summary: "Report health or sanitation problems in an SRO or hotel. Submit a 311 request.",
    taskStatement: "Report a health or sanitation problem in an SRO or hotel.",
    parentSlug: "report-pest-or-housing-problem",
    position: 12
  }),
  defineConcept({
    slug: "fix-housing-or-pest-problem",
    canonicalTitle: "Fix a housing or pest problem",
    pageType: "Topic",
    audience: "General public",
    summary: "Learn what to do after reporting a problem and how to fix violations.",
    taskStatement: "Choose the right follow-up step after reporting a housing or pest problem.",
    parentSlug: "hhvc-root",
    position: 1
  }),
  defineConcept({
    slug: "get-ready-housing-inspection",
    canonicalTitle: "Get ready for a housing inspection after you report a problem",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to prepare for a housing inspection.",
    taskStatement: "Get ready for a housing inspection after reporting a problem.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 0
  }),
  defineConcept({
    slug: "understand-inspections-follow-up-visits",
    canonicalTitle: "Understand inspections and follow-up visits",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how inspections work and what happens after.",
    taskStatement: "Learn how inspections and follow-up visits work.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 1
  }),
  defineConcept({
    slug: "get-ready-follow-up-inspection",
    canonicalTitle: "Get ready for a follow-up inspection",
    pageType: "Information",
    audience: "General public",
    summary: "Prepare for a follow-up inspection and confirm problems are fixed.",
    taskStatement: "Prepare for a follow-up inspection after repairs.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 2
  }),
  defineConcept({
    slug: "tenants-after-notice-of-violation",
    canonicalTitle: "What tenants need to do after getting a notice of violation",
    pageType: "Information",
    audience: "Resident / tenant",
    summary: "Learn what tenants must do after a notice of violation.",
    taskStatement: "Learn what tenants need to do after getting a notice of violation.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 3
  }),
  defineConcept({
    slug: "owners-after-notice-of-violation",
    canonicalTitle: "What owners need to do after getting a notice of violation",
    pageType: "Information",
    audience: "Property owner / landlord",
    summary: "Learn what owners must do after a notice of violation.",
    taskStatement: "Learn what owners need to do after getting a notice of violation.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 4
  }),
  defineConcept({
    slug: "learn-about-reinspection-fees",
    canonicalTitle: "Learn about reinspection fees",
    pageType: "Information",
    audience: "Property owner / landlord",
    summary: "Learn when reinspection fees apply and how much they cost.",
    taskStatement: "Learn when reinspection fees apply and how much they cost.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 5
  }),
  defineConcept({
    slug: "what-happens-if-problems-not-fixed",
    canonicalTitle: "What happens if problems are not fixed",
    pageType: "Information",
    audience: "General public",
    summary: "Learn what happens if violations are not corrected.",
    taskStatement: "Learn what happens if reported problems are not fixed.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 6
  }),
  defineConcept({
    slug: "get-help-with-housing-or-pest-problem",
    canonicalTitle: "Get help with a housing or pest problem",
    pageType: "Information",
    audience: "General public",
    summary: "Follow steps to report a problem or get help.",
    taskStatement: "Follow the right steps to report a problem or get help.",
    parentSlug: "fix-housing-or-pest-problem",
    position: 7
  }),
  defineConcept({
    slug: "prevent-pests-keep-home-healthy",
    canonicalTitle: "Prevent pests and keep your home healthy",
    pageType: "Topic",
    audience: "General public",
    summary: "Learn how to prevent pests and keep your home clean and safe.",
    taskStatement: "Choose the right prevention guidance for pests and healthy housing.",
    parentSlug: "hhvc-root",
    position: 2
  }),
  defineConcept({
    slug: "prevent-rats-or-mice-home",
    canonicalTitle: "Prevent rats or mice in your home",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to keep rats and mice out of your home.",
    taskStatement: "Learn how to prevent rats or mice in a home.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 0
  }),
  defineConcept({
    slug: "prevent-cockroaches-other-pests",
    canonicalTitle: "Prevent cockroaches and other pests",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to prevent cockroaches and pests.",
    taskStatement: "Learn how to prevent cockroaches and other pests.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 1
  }),
  defineConcept({
    slug: "prevent-bed-bugs-home",
    canonicalTitle: "Prevent bed bugs in your home",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to avoid bed bugs and spot early signs.",
    taskStatement: "Learn how to prevent bed bugs in a home.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 2
  }),
  defineConcept({
    slug: "prevent-mosquitoes-standing-water",
    canonicalTitle: "Prevent mosquitoes by removing standing water",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to stop mosquitoes by removing standing water.",
    taskStatement: "Learn how to prevent mosquitoes by removing standing water.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 3
  }),
  defineConcept({
    slug: "prevent-raccoons-around-home",
    canonicalTitle: "Prevent raccoons around your home",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to keep raccoons away and reduce risks.",
    taskStatement: "Learn how to prevent raccoon problems around a home.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 4
  }),
  defineConcept({
    slug: "prevent-raccoon-roundworm-exposure",
    canonicalTitle: "Prevent raccoon roundworm exposure",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to avoid raccoon roundworm and stay safe.",
    taskStatement: "Learn how to prevent raccoon roundworm exposure.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 5
  }),
  defineConcept({
    slug: "prevent-yellow-jackets-around-home",
    canonicalTitle: "Prevent yellow jackets around your home",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how to avoid yellow jackets and reduce nest risks.",
    taskStatement: "Learn how to prevent yellow jacket problems around a home.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 6
  }),
  defineConcept({
    slug: "keep-home-clean-free-of-pests",
    canonicalTitle: "Keep your home clean and free of pests",
    pageType: "Information",
    audience: "General public",
    summary: "Simple steps to keep your home clean and pest-free.",
    taskStatement: "Learn how to keep a home clean and free of pests.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 7
  }),
  defineConcept({
    slug: "store-food-trash-materials-prevent-pests",
    canonicalTitle: "Store food, trash, and materials to prevent pests",
    pageType: "Information",
    audience: "General public",
    summary: "Store food and trash properly to prevent pests.",
    taskStatement: "Learn how to store food, trash, and materials to prevent pests.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 8
  }),
  defineConcept({
    slug: "reduce-indoor-moisture-prevent-mold",
    canonicalTitle: "Reduce indoor moisture and prevent mold (not leaks)",
    pageType: "Information",
    audience: "Resident / tenant",
    summary: "Reduce moisture and prevent mold from humidity.",
    taskStatement: "Learn how to reduce indoor moisture and prevent mold from condensation.",
    parentSlug: "prevent-pests-keep-home-healthy",
    position: 9
  }),
  defineConcept({
    slug: "learn-about-programs-and-services",
    canonicalTitle: "Learn about programs and services",
    pageType: "Topic",
    audience: "General public",
    summary: "Learn about inspections, programs, and services for healthy housing.",
    taskStatement: "Choose the right program or service information for healthy housing and pests.",
    parentSlug: "hhvc-root",
    position: 3
  }),
  defineConcept({
    slug: "about-healthy-housing-program-inspections",
    canonicalTitle: "About the healthy housing program and inspections",
    pageType: "Information",
    audience: "General public",
    summary: "Learn about the Healthy Housing program and inspections.",
    taskStatement: "Learn about the healthy housing program and inspections.",
    parentSlug: "learn-about-programs-and-services",
    position: 0
  }),
  defineConcept({
    slug: "learn-what-we-inspect",
    canonicalTitle: "Learn what we inspect in homes and buildings",
    pageType: "Information",
    audience: "General public",
    summary: "Learn what inspectors check during inspections.",
    taskStatement: "Learn what healthy housing inspectors check in homes and buildings.",
    parentSlug: "learn-about-programs-and-services",
    position: 1
  }),
  defineConcept({
    slug: "learn-how-we-respond-to-complaints",
    canonicalTitle: "Learn how we respond to complaints",
    pageType: "Information",
    audience: "General public",
    summary: "Learn how complaints are reviewed and handled.",
    taskStatement: "Learn how healthy housing complaints are reviewed and handled.",
    parentSlug: "learn-about-programs-and-services",
    position: 2
  }),
  defineConcept({
    slug: "request-mosquito-education-workshop",
    canonicalTitle: "Request a mosquito education workshop for students",
    pageType: "Campaign",
    audience: "General public",
    summary: "Request a free mosquito workshop for schools and groups.",
    taskStatement: "Request a mosquito education workshop for students or groups.",
    parentSlug: "learn-about-programs-and-services",
    position: 3
  }),
  defineConcept({
    slug: "report-dead-bird-west-nile-virus",
    canonicalTitle: "Report a dead bird for West Nile Virus testing",
    pageType: "Transaction",
    audience: "General public",
    summary: "Report a dead bird to help track West Nile Virus.",
    taskStatement: "Report a dead bird for West Nile Virus testing.",
    parentSlug: "learn-about-programs-and-services",
    position: 4
  }),
  defineConcept({
    slug: "find-tools-fees-and-help",
    canonicalTitle: "Find tools, fees, and help",
    pageType: "Topic",
    audience: "General public",
    summary: "Look up violations, find your inspector, pay fees, and get help.",
    taskStatement: "Choose the right tool, fee, or support resource for healthy housing.",
    parentSlug: "hhvc-root",
    position: 4
  }),
  defineConcept({
    slug: "look-up-healthy-housing-violations",
    canonicalTitle: "Look up healthy housing violations for a property",
    pageType: "Information",
    audience: "General public",
    summary: "Search violations by address and view inspection history.",
    taskStatement: "Look up healthy housing violations for a property.",
    parentSlug: "find-tools-fees-and-help",
    position: 0
  }),
  defineConcept({
    slug: "find-inspector-by-neighborhood",
    canonicalTitle: "Find your healthy housing inspector by neighborhood",
    pageType: "Information",
    audience: "General public",
    summary: "Find your inspector and contact information.",
    taskStatement: "Find a healthy housing inspector by neighborhood.",
    parentSlug: "find-tools-fees-and-help",
    position: 1
  }),
  defineConcept({
    slug: "pay-healthy-housing-fee",
    canonicalTitle: "Pay your healthy housing fee for buildings with 3 or more units",
    pageType: "Transaction",
    audience: "Property owner / landlord",
    summary: "Pay required Healthy Housing program fees.",
    taskStatement: "Pay a healthy housing fee for a building with 3 or more units.",
    parentSlug: "find-tools-fees-and-help",
    position: 2
  }),
  defineConcept({
    slug: "healthy-housing-guides-and-resources",
    canonicalTitle: "Healthy housing guides and resources",
    pageType: "Resource Collection",
    audience: "General public",
    summary: "Browse guides and resources for housing and pest issues.",
    taskStatement: "Find healthy housing guides and resources.",
    parentSlug: "find-tools-fees-and-help",
    position: 3
  }),
  defineConcept({
    slug: "contact-hhvc",
    canonicalTitle: "Contact healthy housing and vector control",
    pageType: "Information",
    audience: "General public",
    summary: "Contact HHVC for help or questions.",
    taskStatement: "Find contact information for healthy housing and vector control.",
    parentSlug: "find-tools-fees-and-help",
    position: 4
  })
];

export interface CanonicalSeedNode {
  slug: string;
  parentSlug: string | null;
  iaMapId: string;
  position: number;
  placementStatus: "placed";
}

export const hhvcCanonicalWorkingIaNodes: CanonicalSeedNode[] = hhvcCanonicalWorkingIaSeed.map((concept) => ({
  slug: concept.slug,
  parentSlug: concept.parentSlug,
  iaMapId: HHVC_WORKING_IA_MAP_ID,
  position: concept.position,
  placementStatus: "placed"
}));

export const hhvcCanonicalWorkingKarlConnectionSummary = {
  rootTopicSlug: hhvcCanonicalWorkingIaSeed.find((concept) => concept.karlConnection.placementKind === "root_topic")?.slug ?? null,
  childTopicSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.placementKind === "child_topic")
    .map((concept) => concept.slug),
  autoServiceSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.placementKind === "auto_service")
    .map((concept) => concept.slug),
  manualSectionSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.placementKind === "manual_section")
    .map((concept) => concept.slug),
  servicesSectionSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.sectionSurface === "services")
    .map((concept) => concept.slug),
  resourcesSectionSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.sectionSurface === "resources")
    .map((concept) => concept.slug),
  relatedEligibleSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.relatedEligible)
    .map((concept) => concept.slug),
  resourcesEligibleSlugs: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.resourcesEligible)
    .map((concept) => concept.slug),
  manualSectionHeadings: hhvcCanonicalWorkingIaSeed
    .filter((concept) => concept.karlConnection.placementMode === "manual_section")
    .reduce<Record<string, string[]>>((acc, concept) => {
      const heading = concept.karlConnection.sectionHeading;
      if (!heading) {
        return acc;
      }
      acc[heading] = acc[heading] || [];
      acc[heading].push(concept.slug);
      return acc;
    }, {})
} as const;

export const hhvcCanonicalWorkingIaSeedSummary = {
  concepts: hhvcCanonicalWorkingIaSeed.length,
  rootSlug: "hhvc-root",
  mapId: HHVC_WORKING_IA_MAP_ID
} as const;
