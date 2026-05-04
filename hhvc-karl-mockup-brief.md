# HHVC Karl Mockup Brief

This document is a complete source package for generating high-fidelity mockups in Cursor for the HHVC SF.gov Content Design Tool. It is designed to support mockups that look like they belong in a Karl CMS workflow, use realistic SF.gov content patterns, and respect public health content accuracy boundaries.[cite:2][cite:17][cite:14][cite:35][cite:41]

## Purpose

The goal is to redesign the internal HHVC content design tool so staff can prepare, review, and hand off Karl-ready public content pages with less ambiguity. The current app already exposes key workflow pieces such as page type, audience, prompt inputs, a library, preview, and QA scoring, but those elements need to be reorganized into a more credible editorial workflow that reflects actual Karl content types and SF.gov publishing patterns.[cite:2][cite:41]

This brief assumes the mockups will be used as design references for a future production tool. Because of that, the structures below prioritize content-type rules, reusable field patterns, verification flags, and realistic page relationships over decorative freedom alone.[cite:41][cite:17][cite:14]

## Core editorial rules

Use Karl-compatible content types intentionally. Transaction pages should be used when a resident or owner is completing a task such as reporting a problem, making a payment, or submitting a request.[cite:17][cite:35] Information pages should explain a service, inspection program, responsibility, policy, or process rather than asking the user to complete a discrete task.[cite:14]

Topic pages should organize and route users to related pages, especially when the page acts as a hub across multiple subtopics or tasks.[cite:22] Step by step pages should only be used when the content genuinely depends on sequence, such as preparing for an inspection or following a notice of violation process.[cite:14] Resource Collection pages should group guides, tools, and references, while Campaign can remain available when leadership intentionally wants broader messaging flexibility and more freedom for outreach-oriented content.[cite:41]

When a page is marked for Campaign, that decision should be preserved in the mockups rather than auto-corrected. Karl’s Campaign content type is specifically intended for more branded or message-driven content, and can include richer media and more flexible layout behavior than stricter service patterns.[cite:41]

## Karl and SF.gov anchors

The mockups should mirror proven SF.gov structures instead of inventing arbitrary editorial layouts. “Report a health nuisance or hazards” is a useful Transaction anchor because it organizes content around reporting a problem, what to know, and what to do.[cite:17] “Healthy housing inspection programs” is a useful Information anchor because it explains inspection programs and conditions covered without forcing a service transaction pattern.[cite:14]

“Pay your annual healthy housing fee for apartment buildings” is a useful second Transaction anchor because it demonstrates eligibility conditions and a clearer service/payment flow. SF.gov states that owners of apartment buildings with 3 or more rented units pay the annual healthy housing fee, while smaller rental properties do not.[cite:35] That kind of clear eligibility logic is the sort of structure the tool should make visible when staff create fee-related or regulated-service pages.[cite:35]

## Public health accuracy guardrails

The tool can safely support stable, high-level content patterns such as routing users to 311 for certain nuisance or housing complaints, organizing prevention content, and distinguishing between explanatory and task-oriented pages.[cite:17][cite:22] It should not present unverified routing rules, inspection promises, legal consequences, health claims, or agency responsibilities as final unless those details are grounded in approved SF.gov or HHVC source material.[cite:14][cite:17]

Pages involving pests, moisture, wildlife, SRO or hotel issues, notices of violation, or enforcement consequences should carry a factual review badge if the exact routing or policy details are not yet confirmed. This is especially important because the language on public-facing health and housing pages can imply regulatory or medical certainty that may require subject-matter review before publication.[cite:14][cite:17]

## Normalized HHVC content inventory

The following inventory keeps the director’s preference for Campaign where leadership wants flexibility, while preserving clearer service-oriented types for operational pages.

### Root

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 1 | Get help with pests and housing problems | Get help with pests, garbage, and moisture. Learn to report, fix, and prevent problems. | Topic | Approved for mockup use | Root routing page for HHVC services and guidance. |

### Hub 1: Report a pest or housing problem

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 2 | Report a pest or housing problem | Report pests, garbage, or moisture issues. Submit a 311 request and get help. | Topic | Approved for mockup use | Reporting hub that routes users to specific transactions.[cite:17] |
| 3 | Report rats or mice | Report rats or mice and request an inspection through 311. | Transaction | Needs HHVC verification | Verify exact routing and inspection language. |
| 4 | Report cockroaches | Report cockroaches and request an inspection through 311. | Transaction | Needs HHVC verification | Verify exact routing and inspection language. |
| 5 | Report bed bugs | Report bed bugs and request an inspection through 311. | Transaction | Needs HHVC verification | Verify exact routing and inspection language. |
| 6 | Report pigeons | Report pigeon problems and request City assistance. | Transaction | Needs HHVC verification | Verify agency ownership and response path. |
| 7 | Report mosquitoes in your home or yard | Report mosquitoes and standing water near your home. | Transaction | Needs HHVC verification | Verify route and whether response is complaint-based or education-first. |
| 8 | Report yellow jackets | Report yellow jacket nests or activity near your home. | Transaction | Needs HHVC verification | Verify route and response scope. |
| 9 | Report raccoons | Report raccoon problems or unsafe wildlife activity. | Transaction | Needs HHVC verification | Verify jurisdiction and city response path. |
| 10 | Report garbage or dirty conditions | Report garbage or unsanitary conditions that attract pests. | Transaction | Approved for mockup use | Align to nuisance and hazard reporting patterns on SF.gov.[cite:17] |
| 11 | Report animal waste, flies, or pest conditions | Report animal waste, flies, or conditions attracting pests. | Transaction | Needs HHVC verification | Verify exact categories and reporting scope. |
| 12 | Report clutter or too many materials | Report clutter or stored items causing health problems. | Transaction | Needs HHVC verification | Verify legal framing and complaint category. |
| 13 | Report overgrown plants or weeds | Report overgrown vegetation that may attract pests. | Transaction | Approved for mockup use | Align with nuisance framing where applicable.[cite:17] |
| 14 | Report indoor moisture problems (not leaks) | Report indoor moisture or condensation issues (not leaks). | Transaction | Needs HHVC verification | Verify distinction between moisture, mold, leaks, and code scope. |
| 15 | Report a health problem in an SRO or hotel | Report health or sanitation problems in an SRO or hotel. Submit a 311 request. | Transaction | Needs HHVC verification | Verify complaint route and program handling. |

### Hub 2: Fix a housing or pest problem

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 16 | Fix a housing or pest problem | Learn what to do after reporting a problem and how to fix violations. | Topic | Approved for mockup use | Post-reporting and compliance hub. |
| 17 | Get ready for a housing inspection after you report a problem | Learn how to prepare for a housing inspection. | Step by step | Approved for mockup use | Sequential preparation page. |
| 18 | Understand inspections and follow-up visits | Learn how inspections work and what happens after. | Information | Approved for mockup use | Process explainer page. |
| 19 | Get ready for a follow-up inspection | Prepare for a follow-up inspection and confirm problems are fixed. | Step by step | Approved for mockup use | Sequential preparation page. |
| 20 | What tenants need to do after getting a notice of violation | Learn what tenants must do after a notice of violation. | Step by step | Needs HHVC verification | Confirm whether tenants receive direct notice in this workflow. |
| 21 | What owners need to do after getting a notice of violation | Learn what owners must do after a notice of violation. | Step by step | Approved for mockup use | Strong fit for sequential compliance actions. |
| 22 | Learn about reinspection fees | Learn when reinspection fees apply and how much they cost. | Information | Approved for mockup use | Explanatory fee page, not payment flow.[cite:35] |
| 23 | What happens if problems are not fixed | Learn what happens if violations are not corrected. | Information | Needs HHVC verification | Avoid overclaiming legal or enforcement outcomes. |
| 24 | Get help with a housing or pest problem | Follow steps to report a problem or get help. | Step by step | Approved for mockup use | “Start here” guided sequence page. |

### Hub 3: Prevent pests and keep your home healthy

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 25 | Prevent pests and keep your home healthy | Learn how to prevent pests and keep your home clean and safe. | Topic | Approved for mockup use | Prevention hub. |
| 26 | Prevent rats or mice in your home | Learn how to keep rats and mice out of your home. | Information | Approved for mockup use | Prevention explainer. |
| 27 | Prevent cockroaches and other pests | Learn how to prevent cockroaches and pests. | Information | Approved for mockup use | Prevention explainer. |
| 28 | Prevent bed bugs in your home | Learn how to avoid bed bugs and spot early signs. | Information | Needs HHVC verification | Verify against approved HHVC guidance. |
| 29 | Prevent mosquitoes by removing standing water | Learn how to stop mosquitoes by removing standing water. | Information | Approved for mockup use | Prevention explainer aligned to common mosquito control guidance. |
| 30 | Prevent raccoons around your home | Learn how to keep raccoons away and reduce risks. | Information | Needs HHVC verification | Verify wildlife guidance and city role. |
| 31 | Prevent raccoon roundworm exposure | Learn how to avoid raccoon roundworm and stay safe. | Information | Needs HHVC verification | Medical/public health language should be reviewed. |
| 32 | Prevent yellow jackets around your home | Learn how to avoid yellow jackets and reduce nest risks. | Information | Needs HHVC verification | Verify public guidance and city response role. |
| 33 | Keep your home clean and free of pests | Simple steps to keep your home clean and pest-free. | Information | Approved for mockup use | Prevention explainer. |
| 34 | Store food, trash, and materials to prevent pests | Store food and trash properly to prevent pests. | Information | Approved for mockup use | Prevention explainer. |
| 35 | Reduce indoor moisture and prevent mold (not leaks) | Reduce moisture and prevent mold from humidity. | Information | Needs HHVC verification | Keep distinction between prevention guidance and remediation promises. |

### Hub 4: Learn about programs and services

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 36 | Learn about programs and services | Learn about inspections, programs, and services for healthy housing. | Topic | Approved for mockup use | Program and service explainer hub. |
| 37 | About the healthy housing program and inspections | Learn about the Healthy Housing program and inspections. | Information | Approved for mockup use | Align with SF.gov inspection program explainer.[cite:14] |
| 38 | Learn what we inspect in homes and buildings | Learn what inspectors check during inspections. | Information | Needs HHVC verification | Must reflect actual inspection scope. |
| 39 | Learn how we respond to complaints | Learn how complaints are reviewed and handled. | Information | Approved for mockup use | Complaint-process explainer. |
| 40 | Request a mosquito education workshop for students | Request a free mosquito workshop for schools and groups. | Campaign | Leadership-directed | Keep as Campaign because leadership wants flexibility.[cite:41] |
| 41 | Report a dead bird for West Nile Virus testing | Report a dead bird to help track West Nile Virus. | Transaction | Approved for mockup use | Reporting action with public health relevance; verify exact local routing details before publication.[cite:17] |

### Hub 5: Find tools, fees, and help

| ID | Title | Description | Type | Status | Notes |
|---|---|---|---|---|---|
| 42 | Find tools, fees, and help | Look up violations, find your inspector, pay fees, and get help. | Topic | Approved for mockup use | Utility and support hub. |
| 43 | Look up healthy housing violations for a property | Search violations by address and view inspection history. | Information | Needs HHVC verification | Could become Transaction if the public uses a formal search tool. |
| 44 | Find your healthy housing inspector by neighborhood | Find your inspector and contact information. | Information | Needs HHVC verification | Confirm whether public neighborhood lookup exists. |
| 45 | Pay your healthy housing fee for buildings with 3 or more units | Pay required Healthy Housing program fees. | Transaction | Approved for mockup use | Align to existing annual fee page and eligibility rules.[cite:35] |
| 46 | Healthy housing guides and resources | Browse guides and resources for housing and pest issues. | Resource Collection | Approved for mockup use | Grouped downloadable or reference materials. |
| 47 | Contact healthy housing and vector control | Contact HHVC for help or questions. | Information | Approved for mockup use | Contact/help explainer unless a formal transaction flow exists. |

## Content-type rules for mockups

### Topic

Use Topic when the page primarily routes users to related services, problem types, or content areas rather than performing one transaction itself.[cite:22] Required sections should include title, summary, grouped navigation blocks, featured tasks or pages, and related topics or resources. Topic pages should not try to behave like full reporting forms or detailed inspection explainers at the same time.[cite:22]

### Transaction

Use Transaction when the user needs to complete a task such as reporting a hazard, paying a fee, or submitting a request.[cite:17][cite:35] Required sections should include title, summary or service promise, what to know, what to do, routing/contact details, and related pages. Transaction pages should avoid overlong background explanations that distract from the action.[cite:17]

### Information

Use Information when the page explains a program, scope, policy, process, fee concept, or public responsibility without asking the user to complete a discrete task. The structure should typically include title, summary, key sections, related services or pages, and metadata that helps connect it to broader site navigation.[cite:14]

### Step by step

Use Step by step when the content depends on sequence and the user benefits from a guided set of ordered actions. These pages should include a concise summary plus clearly numbered stages, requirements, and follow-up expectations, while avoiding broad background content that belongs on Information pages.[cite:14]

### Resource Collection

Use Resource Collection when the page’s main job is to group guides, files, tools, or reference links into a navigable collection. It should not duplicate long explanatory content if the better solution is to link to separate Information pages.[cite:22]

### Campaign

Use Campaign when leadership intentionally wants more flexibility for audience outreach, awareness, education, or promotional storytelling. Campaign pages can support richer media and a more flexible structure, but should still link clearly to the right service pages when users need to complete a task elsewhere.[cite:41]

## Mockup requirements by workspace

### Topic workspace

The Topic workspace should include a hub title, short summary, audience notes, featured child pages, grouped navigation cards, and related topics. The right-side QA should check whether the hub has a clear grouping logic, uses distinct child-page labels, avoids duplicate cards, and connects users to the correct reporting or prevention content.[cite:22]

### Transaction workspace

The Transaction workspace should be the most detailed. The left panel should include title, audience, service promise, what to know, what to do, 311 or other routing fields where verified, warnings or public-record notes if applicable, related pages, and tagging metadata.[cite:17] The center panel should render a live Karl-like public-page preview in task-first order. The right panel should evaluate required sections, plain language, duplicate overlap, factual verification status, and handoff readiness.[cite:17]

### Information workspace

The Information workspace should support program explainers, prevention pages, scope pages, or fee explainers. The field model should include title, summary, section builder, common questions if appropriate, related transactions, related topics, and factual review markers for any health or enforcement statements.[cite:14]

### Step by step workspace

The Step by step workspace should support ordered stages, readiness checks, and next-step guidance. It should visually distinguish numbered actions from supporting notes so users do not confuse sequence with general explanation.[cite:14]

### Resource Collection workspace

The Resource Collection workspace should focus on grouped resources, filters or labels, short descriptions, and collection-level summaries. It should discourage editors from burying critical service actions inside a resource list when those actions belong on Transaction pages.[cite:22]

### Campaign workspace

The Campaign workspace should show more freedom for layout, featured imagery, outreach sections, testimonials or proof points if appropriate, and prominent calls to action. Even so, the QA layer should still enforce plain language, factual review, related service links, and audience clarity.[cite:41]

### Library and duplicate review

The library screen should let editors filter by content type, topic area, status, audience, and verification state. It should also flag overlap between similar pages, especially where reporting, prevention, and program explainers cover the same pest or housing condition from different angles.[cite:22]

### Karl handoff and export review

The final review screen should prioritize copying structured content into Karl rather than image export. It should present title, summary, metadata, body sections, related pages, verification flags, and required-field completeness, while keeping PNG export secondary.[cite:41]

## Factual review states

Use the following review labels in the mockups:

- Approved for mockup use
- Needs HHVC verification
- Leadership-directed
- Policy review required
- Jurisdiction review required
- Health accuracy review required
- Ready for Karl handoff
- Missing required section
- Duplicate overlap detected

These states should appear in the right-side QA panel and in the content library. The important rule is that QA should never claim a page is ready for Karl review if the draft is empty or if required sections are missing, since contradictory evaluation language undermines trust in the tool.[cite:17]

## Suggested design direction

The mockups should look like a serious internal civic admin tool rather than a startup landing page or AI demo. The design should be restrained, content-first, and panel-based, with a clear left-center-right authoring structure, muted surfaces, strong typography hierarchy, and minimal decorative treatment.[cite:2][cite:41]

A practical default visual system would use neutral backgrounds, subdued borders, one accent color for actions, and stronger status chips for verification states. Campaign pages can appear slightly more expressive in the preview area, but the internal tool itself should stay consistent and operational.[cite:41]

## Cursor prompt for mockup generation

Paste the prompt below into Cursor after this document if you want it to generate the mockups directly.

```text
Act as a senior SF.gov content designer, product designer, and frontend designer.

Use the HHVC Karl Mockup Brief as the source of truth.

I need high-fidelity mockups for an internal app called “HHVC SF.gov Content Design Tool.”

IMPORTANT:
These mockups must be designed so the output can later be copied into Karl CMS with minimal restructuring.
Do not make generic SaaS mockups.
Do not invent random page structures.
Base the mockups on real SF.gov / Karl CMS content patterns, page types, and content rules.

CORE REQUIREMENT
The mockups should help HHVC staff choose the correct Karl content type and create public-facing pages that map cleanly into Karl fields.

REQUIRED CONTENT TYPES
- Topic
- Transaction
- Information
- Step by step
- Resource Collection
- Campaign
- Location only if a true place-based page is needed

IMPORTANT EDITORIAL RULES
- Keep Campaign when leadership explicitly chooses it for flexibility.
- Use Transaction for reporting, payment, request, or complaint tasks.
- Use Information for service, program, policy, inspection, or prevention explainers.
- Use Topic for routing hubs.
- Use Step by step for ordered action sequences.
- Use Resource Collection for grouped tools and references.
- For any page marked Needs HHVC verification, show a factual review badge and do not treat detailed routing or enforcement claims as final.

DESIGN GOAL
Design the internal tool so it feels like a real HHVC + Karl workflow product:
- clear
- trustworthy
- structured
- modern but restrained
- government-professional
- content-first
- designed for drafting, review, QA, and Karl handoff

CREATE MOCKUPS FOR THESE SCREENS
1. Topic workspace
2. Transaction workspace
3. Information workspace
4. Step by step workspace
5. Campaign workspace
6. Resource Collection workspace
7. Library and duplicate review
8. Karl handoff / export review

FOR EACH SCREEN INCLUDE
1. Screen title
2. Goal
3. Layout description
4. Exact modules
5. Recommended UI labels
6. Example HHVC content from the inventory
7. Karl mapping notes
8. Why the structure works

VERY IMPORTANT
- Use the page titles from the normalized inventory
- Preserve status labels such as Approved for mockup use, Needs HHVC verification, and Leadership-directed
- Show QA panels that check content-type correctness, required sections, plain language, duplicate overlap, and factual review status
- Prioritize copy-ready Karl handoff over PNG export
- The Transaction workspace must include a detailed left-center-right editor layout
- The Campaign workspace must show why Campaign is more flexible while still connecting to service pages

OUTPUT FORMAT
# Visual direction
# Topic workspace
# Transaction workspace
# Information workspace
# Step by step workspace
# Campaign workspace
# Resource Collection workspace
# Library and duplicate review
# Karl handoff and export review
# Component inventory
# React structure
# Design tokens
# Build order
```

## Implementation notes

If this brief is used to produce coded mockups, the best path is to model each content type as its own workspace variant rather than forcing all pages into one universal form. That will make the internal tool more trustworthy, reduce content-type confusion, and align better with how Karl and SF.gov organize pages by function.[cite:41][cite:17][cite:14]

The library should also become a real editorial control surface rather than a loose list of pages. It should expose canonical page relationships, duplicate warnings, type filtering, and verification status so staff can quickly distinguish between approved templates, high-confidence public patterns, and pages still waiting for policy review.[cite:22]
