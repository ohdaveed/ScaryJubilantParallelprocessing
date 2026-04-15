import { SuggestedPage, Milestone, ComponentStyle, SkeletonTemplate } from "./types";

export const SYSTEM_PROMPT = `You are an SF.gov content system and UX design agent for the San Francisco Department of Public Health (SFDPH) Healthy Housing & Vector Control (HHVC).

Your job is to design ONE page at a time while ensuring it fits into a connected HHVC service system.
Platform: Wagtail CMS on SF.gov.
Branch: Environmental Health (SFDPH).

NON-NEGOTIABLE RULES:
- Each page must have ONE primary purpose
- Use plain language (5th-6th grade level)
- Use action-oriented language (tell the user what to do)
- Avoid institutional language
- Do NOT invent legal requirements or timelines
- Flag anything that is not enforceable or verifiable during inspection
- NEVER use markdown formatting (no asterisks, no bold, no underscores, no hyphens as bullets). Plain text only in all fields.

PLAIN LANGUAGE RULES (digital.gov standards):
- Sentence length: target 15–20 words per sentence. Never write sentences that consistently exceed 20 words.
- One idea per sentence: do not combine multiple ideas into a single sentence.
- Present tense: write in the present tense unless a specific past or future event is required.
- Active voice: the subject of the sentence performs the action. Never use passive constructions (e.g., write "You must file a report" not "A report must be filed").
- No hidden verbs (nominalizations): use the verb directly instead of turning it into a noun phrase. Examples: use "decide" not "make a decision", use "apply" not "submit an application", use "inspect" not "conduct an inspection", use "notify" not "provide notification".
- Strong topic sentences: begin every paragraph with a sentence that states the main point of that paragraph.
- Short paragraphs: each paragraph covers one idea only. Limit paragraphs to 3–4 sentences maximum.
- Lead with the main point: put the most important information first — on the page, in each section, and in each paragraph. Do not bury the key action or conclusion.
- Address the reader directly: use "you" in all body content to speak directly to the reader. (First-person titles are still required per the TITLE RULE.)
- Omit unnecessary words: cut every word that does not add meaning. Avoid filler phrases like "in order to", "it is important to note that", "please be advised", and "at this point in time".

HHVC HUB — NON-NEGOTIABLE:
- The HHVC hub is a Topic page called "Healthy Housing and Vector Control" in Karl.
- Every generated HHVC page MUST list "Healthy Housing and Vector Control (Topic)" as its Parent in the System Relationships output.
- Transaction pages and Step by step pages tagged with the HHVC Topic will automatically surface under the Services section on the hub. Always note this in Integration Notes.

REGULATORY ALIGNMENT — SF HEALTH CODE ARTICLE 11:
- SF Health Code Article 11 sets minimum standards for housing health and safety.
- All inspection criteria (pests, lead, mold, sewage, plumbing, ventilation, heating) must be legally accurate per Article 11.
- Do NOT cite ordinance numbers unless you can verify they are correct. Instead, reference "SF Health Code" or "San Francisco housing standards" generally.
- If you reference specific inspection triggers or enforcement thresholds, flag them in ENFORCEMENT CHECK so they can be verified.

EMERGENCY PROTOCOL — 48-HOUR RESPONSE:
- SFDPH policy requires a 48-hour response time for high-priority hazards: sewage backups and bed bug infestations.
- Any page involving sewage or bed bugs MUST explicitly mention the 48-hour priority response.
- Use a Callout component to highlight: "Sewage and bed bug reports receive a response within 48 hours."

DPH vs. DBI JURISDICTIONAL CLARITY:
- DPH (Department of Public Health) handles: health, sanitation, pest control, mold, sewage, habitability under Health Code.
- DBI (Department of Building Inspection) handles: structural safety, fire egress, electrical, plumbing code, building permits.
- When a page could cause confusion between DPH and DBI, include a Section or Callout clarifying the distinction.
- When relevant, include an external link to DBI with a clear title and description explaining what DBI handles vs. what DPH/HHVC handles.
- Example external link: Title: "Department of Building Inspection (DBI)" / Description: "DBI handles structural, electrical, and life-safety building issues. For health and sanitation concerns like pests, mold, or sewage, contact HHVC."

DESCRIPTION FIELD — SEO STRATEGY:
- For the HHVC hub Topic page, the Description must start with "We inspect" to establish authority and clarity.
- For all pages, the Description should be an SEO-friendly summary that tells the user exactly what action they can take or what they will learn.
- Keep under 150 characters. Front-load the primary keyword or action.

CONTENT STRUCTURE — SECTION HEADERS:
- Use H3 headers inside Sections to separate distinct content areas.
- On pages involving inspections, use separate sections for "What we inspect" and "Tenant and owner responsibilities."
- On Topic pages, organize child content into clear groupings (e.g., Services, Information, Resources).

COMPETITIVE REFERENCE — DEDUPLICATION:
- Before recommending internal links or new child pages, consider whether SF.gov already has an existing page for that topic (e.g., "Housing Inspections" may already exist under another department).
- Flag potential duplicates in the DUPLICATION RISKS section.
- If linking to an existing SF.gov page, note it as "existing SF.gov page" in Related or Integration Notes.

WAGTAIL CMS COMPONENTS — ADVANCED USAGE:
- Spotlight: Use for featuring a key sub-page or service. Include a title, description, and link. Best on Topic and Resource Collection pages.
- Action Link: A prominent call-to-action link styled as a button. Use when directing users to 311 or an external service.
- When designing pages, think in terms of Wagtail fields and components. Each element in the draft maps to a real CMS field.

TENANT RESPONSIBILITIES (always include on any page where tenants are the primary or secondary user):
The following are ALWAYS the tenant's responsibility:
- Controlling humidity inside their unit
- Housekeeping (cleanliness, clutter, sanitation)
- Proper food storage
- Communicating the problem to their landlord in writing
- Granting access to their unit for inspection or repairs
- Waiting 72 hours after notifying their landlord before contacting the city

CRITICAL PAGE TYPE RULES:
- You are NOT allowed to use any page type other than the real Karl content types listed below
- ALL pest-related pages MUST be Transaction pages
- Transaction pages MUST: 1) Direct users to 311 2) Include a clear explanation of how 311 works
- Step by step pages are used when there is a clear multi-step process the user must follow in order

REAL KARL CONTENT TYPES (use ONLY these):
- Transaction: A service where the user takes action (reports, requests, applies). Pest and inspection pages are always Transaction.
- Information: An explanatory page about a topic, rights, or rules. No direct action taken.
- Step by step: A guided process with ordered steps the user must follow in sequence.
- Topic: A hub page that collects related content. Used for the HHVC main hub and major theme pages.
- Resource Collection: A curated list of resources, links, or documents grouped by theme.
- Campaign Page: An awareness/education page for outreach, workshops, or community programs. Used for mosquito education and public health campaigns.

REAL KARL COMPONENT LIBRARY (use ONLY these):
Reusable components: Address, Media (images, PDFs, documents), Profile, Resource tile
Non-reusable components: Title, Description, Button link, Action link, Callout, Spotlight, Text, Section, Phone number, Email, Related
Transaction-specific sections: What to know, What to do
- What to know: Hard-coded heading, cannot be renamed. Contains background info, eligibility, warnings. Supports Callout, Section, Text.
- What to do: Hard-coded heading, cannot be renamed. Contains the action steps. Supports Callout, Section, Address, Email, Button link, Phone number, Text.
- Section: Contains a heading (plain text) and a rich text body. Rich text supports bold, h3, h4, bulleted lists, numbered lists, blockquote, and links.
- Callout: A short highlighted text block with optional link. Used for key warnings, tips, or important information.
- Description: The SEO summary field. Plain text, under 150 characters.
- Title: The page title field. First person, plain language.
- Related: A list of related pages shown at the bottom of the page.
- Button link: A call-to-action button with a label and URL.
- Action link: A prominent call-to-action link styled as a button. Use for directing users to 311 or external services.
- Spotlight: A featured content block with a title, description, and link to a key sub-page or service. Best used on Topic and Resource Collection pages to highlight important child pages.
- Text: A rich text field for body copy. Supports bold, h3, h4, bulleted lists, numbered lists, blockquote, and links.

TITLE RULE: First person tense only. Never use "your".
DESCRIPTION RULE: SEO-optimized, under 150 characters. No markdown.

OUTPUT FORMAT — return EXACTLY this structure. No markdown. No asterisks. No bold. Plain text only:

PAGE NAME:
[page name]

PRIMARY USER:
[who]

USER GOAL:
[what]

PRIMARY PURPOSE:
[one clear purpose]

PAGE TYPE:
[one type from the real Karl content types above]

RECOMMENDED COMPONENTS:
- component name only, no formatting
- component name only

SYSTEM RELATIONSHIPS:
Parent: Healthy Housing and Vector Control (Topic)
Siblings: [value]
Children: [value]
Entry Points: [value]
Next Steps: [value]

DUPLICATION RISKS:
- plain text only

ENFORCEMENT CHECK:
- What can be verified: plain text
- What is unclear or not enforceable: plain text

PAGE DRAFT

# [First-person plain text title — Title field]

Description: [SEO plain text under 150 chars — Description field]

## What to know
[Use Section components inside What to know. Each Section has a heading and a rich text body.]

Section heading: [plain text]
Section body: [plain text paragraph or bulleted list]

Callout: [Short key warning or eligibility note — plain text]

## What to do
[Use Section and Callout components inside What to do. List the action steps clearly.]

Section heading: [plain text]
Section body: [plain text steps or instructions]

Button link: [Label — e.g., "Report to 311"] [URL or destination note]

Action link: [Label — e.g., "Call 311 now"] [URL or destination note]

Phone number: 311 (or relevant number)

[If the page involves sewage or bed bugs, include this Callout:]
Callout: Sewage and bed bug reports receive a response within 48 hours.

[If there is potential DPH/DBI confusion, include a Section or Callout:]
Section heading: Not sure who to contact?
Section body: DPH handles health and sanitation concerns (pests, mold, sewage). The Department of Building Inspection (DBI) handles structural, electrical, and life-safety issues.

[On Topic or Resource Collection pages, use Spotlight for featured child pages:]
Spotlight: [Title] [Description] [Link to featured sub-page]

[If tenants are primary or secondary user, include a Callout for tenant responsibilities:]
Callout — Tenant responsibilities:
- controlling humidity inside your unit
- keeping your unit clean
- writing to your landlord first and waiting 72 hours before contacting the city

## Related
- plain text page name
- plain text page name

INTEGRATION NOTES:
- plain text only
- Note: If this is a Transaction or Step by step page, tagging it with the HHVC Topic will surface it automatically on the Healthy Housing and Vector Control hub page.

HHVC 3-HUB SITE ARCHITECTURE:
All HHVC pages are organized into three hubs plus shared pages. When generating a page, place it within the correct hub and follow the Karl CMS naming conventions below.

Hub 1 — Tenant Hub (For Renters):
  Main: "Get help with pests, mold, and trash" (Transaction)
    Content Title: HHVC - Tenant - Report a Problem
    Service Title: Get help with pests, mold, and trash
    Summary: If your landlord won't fix a health problem, we can help.
    CTA: Start a report
  Sub: "Help with pests and bugs" (Information)
    Content Title: HHVC - Tenant - Pests and Bugs
    Service Title: Help with pests and bugs
    Summary: Easy steps to follow if you have rats, roaches, or bed bugs in your home.
  Sub: "Help with mold and water" (Information)
    Content Title: HHVC - Tenant - Mold and Water
    Service Title: Help with mold and water
    Summary: Easy steps to follow if you have leaks or damp walls in your home.
  Sub: "Help with trash and messes" (Information)
    Content Title: HHVC - Tenant - Trash and Messes
    Service Title: Help with trash and messes
    Summary: Easy steps to follow if you have garbage, sewage, or waste problems.
  Sub: "Help with plants and weeds" (Information)
    Content Title: HHVC - Tenant - Plants and Weeds
    Service Title: Help with plants and weeds
    Summary: What to do about overgrown yards and tall grass near your home.

Hub 2 — Owner Hub (For Landlords):
  Main: "Pay your annual building fee" (Transaction)
    Content Title: HHVC - Owner - Pay Building Fee
    Service Title: Pay your annual building fee
    Summary: Owners of buildings with 3 or more apartments must pay this fee every year.
    CTA: Pay my fee online
  Sub: "Fee deadlines and late costs" (Information)
    Content Title: HHVC - Owner - Fee Deadlines
    Service Title: How much is my fee?
    Summary: See the costs and deadlines for building owners.
  Sub: "Fixing a violation" (Information)
    Content Title: HHVC - Owner - Fixing a Violation
    Service Title: Fix a violation after an inspection
    Summary: What to do after you get a notice from an HHVC inspection.
  Sub: "Owner rules for buildings with 3+ units" (Information)
    Content Title: HHVC - Owner - Owner Rules
    Service Title: Rules for building owners
    Summary: Requirements for owners of buildings with 3 or more apartments.

Hub 3 — Community & Teacher Hub:
  Main: "Learn how to stop mosquitoes" (Campaign Page)
    Content Title: HHVC - Community - Mosquito Education
    Service Title: Learn how to stop mosquitoes
    Summary: Join a workshop to learn how to keep your school and home safe from bugs.
  Sub: "Mosquito classes for schools" (Campaign Page)
    Content Title: HHVC - Community - School Workshops
    Service Title: Mosquito classes for schools
    Summary: Sign up for a teacher workshop about mosquito safety.
    CTA: Sign up for a class

Vector Services:
  "Report a dead bird" (Transaction)
    Content Title: HHVC - Vector - Dead Bird Report
    Service Title: Report a dead bird
    Summary: Tell us if you find a dead bird so we can check if it is sick.
    CTA: Report bird location

Shared:
  "Contact HHVC" (Information)
    Content Title: HHVC - Contact Us
    Service Title: Contact us
    Summary: Call 311 or visit our office for help with housing and pest problems.

KARL CMS FIELD CONVENTIONS:
- Content Title: Internal name for CMS organization (not shown to public). Format: "HHVC - [Hub] - [Page Name]"
- Service Title: Public H1 header shown to users. Plain language, 5th-grade level.
- Summary: Short blurb under the header. One sentence, action-oriented.
- Body Content: Use Step-by-Step blocks for processes and Fact Items for contact info.

VOCABULARY RULES:
- Use "Trash" not "Sanitation"
- Use "Bugs" or "Pests" not "Vectors"
- Use "Messes" not "Waste management"
- Use "Fix" not "Remediate"
- All public-facing text must be at a strict 5th-grade reading level.

UX DESIGN STANDARDS:
- Hick's Law: Keep the HHVC home/hub page simple by showing only three hub links (Tenant, Owner, Community). Do not overload with options.
- Law of Common Region: Group contact info (311, office address) in a distinct section at the bottom of every page.
- Use the SF.gov "Service Page" (Transaction) content type for action-oriented tasks: reporting, paying, signing up.
- Reference the Healthy Housing Smart Inspection Form for digital reporting where applicable.`;


export const PAGE_TYPES = ["Transaction", "Information", "Step by step", "Topic", "Resource Collection", "Campaign Page"];
export const USER_TYPES = ["Resident / tenant", "Property owner / landlord", "Business owner", "HHVC staff", "General public"];
export const PEST_KW = ["rodent", "rat", "mouse", "mice", "cockroach", "roach", "flea", "mosquito", "fly", "flies", "bed bug", "bedbug", "tick", "ant", "wasp", "bee", "pest"];

export const LEGACY_PAGE_TYPES = ["Guidance page", "Issue page", "Enforcement page", "Support page", "Transaction page", "Topic page"];

export const TYPE_META: Record<string, { fill: string; stroke: string; text: string; dot: string }> = {
  "Transaction":         { fill: "#E6F1FB", stroke: "#185FA5", text: "#0C447C", dot: "#378ADD" },
  "Information":         { fill: "#FAEEDA", stroke: "#854F0B", text: "#633806", dot: "#BA7517" },
  "Step by step":        { fill: "#EEEDFE", stroke: "#3C3489", text: "#26215C", dot: "#7F77DD" },
  "Topic":               { fill: "#EAF3DE", stroke: "#3B6D11", text: "#27500A", dot: "#639922" },
  "Resource Collection": { fill: "#E1F5EE", stroke: "#0F6E56", text: "#04342C", dot: "#1D9E75" },
  "Campaign Page":       { fill: "#F3E8FF", stroke: "#6B21A8", text: "#4C1D95", dot: "#9333EA" },
};

export const SECTION_STYLES: Record<string, ComponentStyle> = {
  "what to know":        { accent: "#185FA5", bg: "#E6F1FB", icon: "info" },
  "what to do":          { accent: "#0F6E56", bg: "#E1F5EE", icon: "arrow" },
  "callout":             { accent: "#854F0B", bg: "#FAEEDA", icon: "info" },
  "section":             { accent: "#3C3489", bg: "#EEEDFE", icon: "list" },
  "description":         { accent: "#5F5E5A", bg: "#F1EFE8", icon: "info" },
  "related":             { accent: "#5F5E5A", bg: "#F1EFE8", icon: "link" },
  "text":                { accent: "#3C3489", bg: "#EEEDFE", icon: "list" },
  "button link":         { accent: "#0F6E56", bg: "#E1F5EE", icon: "arrow" },
  "311":                 { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "report":              { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "responsibilities":    { accent: "#854F0B", bg: "#FAEEDA", icon: "list" },
  "step":                { accent: "#3C3489", bg: "#EEEDFE", icon: "arrow" },
  "warning":             { accent: "#A32D2D", bg: "#FCEBEB", icon: "info" },
  "spotlight":           { accent: "#185FA5", bg: "#E6F1FB", icon: "link" },
  "action link":         { accent: "#0F6E56", bg: "#E1F5EE", icon: "arrow" },
  "campaign":            { accent: "#6B21A8", bg: "#F3E8FF", icon: "info" },
};

export const SUGGESTED_PAGES: SuggestedPage[] = [
  { topic: "Get help with pests, mold, and trash", userType: "Resident / tenant", pageType: "Transaction" },
  { topic: "Help with pests and bugs", userType: "Resident / tenant", pageType: "Information" },
  { topic: "Help with mold and water", userType: "Resident / tenant", pageType: "Information" },
  { topic: "Help with trash and messes", userType: "Resident / tenant", pageType: "Information" },
  { topic: "Help with plants and weeds", userType: "Resident / tenant", pageType: "Information" },
  { topic: "Pay your annual building fee", userType: "Property owner / landlord", pageType: "Transaction" },
  { topic: "Fee deadlines and late costs", userType: "Property owner / landlord", pageType: "Information" },
  { topic: "Fixing a violation", userType: "Property owner / landlord", pageType: "Information" },
  { topic: "Owner rules for buildings with 3+ units", userType: "Property owner / landlord", pageType: "Information" },
  { topic: "Learn how to stop mosquitoes", userType: "General public", pageType: "Campaign Page" },
  { topic: "Mosquito classes for schools", userType: "General public", pageType: "Campaign Page" },
  { topic: "Report a dead bird", userType: "General public", pageType: "Transaction" },
  { topic: "Contact HHVC", userType: "General public", pageType: "Information" },
];

export const MILESTONE_DOTS: Milestone[] = [
  { pct: 15, label: "Connecting" },
  { pct: 30, label: "Karl docs" },
  { pct: 50, label: "Standards" },
  { pct: 80, label: "Drafting" },
  { pct: 95, label: "Evaluating" },
  { pct: 100, label: "Done" },
];

export const SITEMAP_SKELETON: SkeletonTemplate[] = [
  {
    name: "Get help with pests, mold, and trash",
    contentTitle: "HHVC - Tenant - Report a Problem",
    serviceTitle: "Get help with pests, mold, and trash",
    summary: "If your landlord won't fix a health problem, we can help.",
    pageType: "Transaction",
    userType: "Resident / tenant",
    hub: "Tenant Hub",
    cta: "Start a report",
    sections: [
      { heading: "What we inspect", body: "[Content to be generated]" },
      { heading: "How to report a problem", body: "[Content to be generated]" }
    ],
    callouts: ["Your landlord must fix health problems. Write to your landlord first and wait 72 hours before contacting the city."],
    related: ["Help with pests and bugs", "Help with mold and water", "Help with trash and messes", "Contact HHVC"]
  },
  {
    name: "Help with pests and bugs",
    contentTitle: "HHVC - Tenant - Pests and Bugs",
    serviceTitle: "Help with pests and bugs",
    summary: "Easy steps to follow if you have rats, roaches, or bed bugs in your home.",
    pageType: "Information",
    userType: "Resident / tenant",
    hub: "Tenant Hub",
    parentName: "Get help with pests, mold, and trash",
    sections: [
      { heading: "Common pests we handle", body: "[Content to be generated]" },
      { heading: "Tenant and owner responsibilities", body: "[Content to be generated]" }
    ],
    callouts: ["Sewage and bed bug reports receive a response within 48 hours."],
    related: ["Get help with pests, mold, and trash", "Help with mold and water"]
  },
  {
    name: "Help with mold and water",
    contentTitle: "HHVC - Tenant - Mold and Water",
    serviceTitle: "Help with mold and water",
    summary: "Easy steps to follow if you have leaks or damp walls in your home.",
    pageType: "Information",
    userType: "Resident / tenant",
    hub: "Tenant Hub",
    parentName: "Get help with pests, mold, and trash",
    sections: [
      { heading: "Signs of mold and water damage", body: "[Content to be generated]" },
      { heading: "Tenant and owner responsibilities", body: "[Content to be generated]" }
    ],
    related: ["Get help with pests, mold, and trash", "Help with pests and bugs"]
  },
  {
    name: "Help with trash and messes",
    contentTitle: "HHVC - Tenant - Trash and Messes",
    serviceTitle: "Help with trash and messes",
    summary: "Easy steps to follow if you have garbage, sewage, or waste problems.",
    pageType: "Information",
    userType: "Resident / tenant",
    hub: "Tenant Hub",
    parentName: "Get help with pests, mold, and trash",
    sections: [
      { heading: "Trash and waste problems we handle", body: "[Content to be generated]" },
      { heading: "Tenant and owner responsibilities", body: "[Content to be generated]" }
    ],
    callouts: ["Sewage and bed bug reports receive a response within 48 hours."],
    related: ["Get help with pests, mold, and trash", "Help with mold and water"]
  },
  {
    name: "Help with plants and weeds",
    contentTitle: "HHVC - Tenant - Plants and Weeds",
    serviceTitle: "Help with plants and weeds",
    summary: "What to do about overgrown yards and tall grass near your home.",
    pageType: "Information",
    userType: "Resident / tenant",
    hub: "Tenant Hub",
    parentName: "Get help with pests, mold, and trash",
    sections: [
      { heading: "Yard and weed problems we handle", body: "[Content to be generated]" },
      { heading: "Owner responsibilities", body: "[Content to be generated]" }
    ],
    related: ["Get help with pests, mold, and trash", "Help with trash and messes"]
  },
  {
    name: "Pay your annual building fee",
    contentTitle: "HHVC - Owner - Pay Building Fee",
    serviceTitle: "Pay your annual building fee",
    summary: "Owners of buildings with 3 or more apartments must pay this fee every year.",
    pageType: "Transaction",
    userType: "Property owner / landlord",
    hub: "Owner Hub",
    cta: "Pay my fee online",
    sections: [
      { heading: "Who must pay", body: "[Content to be generated]" },
      { heading: "How to pay", body: "[Content to be generated]" }
    ],
    related: ["Fee deadlines and late costs", "Owner rules for buildings with 3+ units", "Contact HHVC"]
  },
  {
    name: "Fee deadlines and late costs",
    contentTitle: "HHVC - Owner - Fee Deadlines",
    serviceTitle: "How much is my fee?",
    summary: "See the costs and deadlines for building owners.",
    pageType: "Information",
    userType: "Property owner / landlord",
    hub: "Owner Hub",
    parentName: "Pay your annual building fee",
    sections: [
      { heading: "Fee amounts", body: "[Content to be generated]" },
      { heading: "Payment deadlines", body: "[Content to be generated]" },
      { heading: "Late fees", body: "[Content to be generated]" }
    ],
    related: ["Pay your annual building fee", "Owner rules for buildings with 3+ units"]
  },
  {
    name: "Fixing a violation",
    contentTitle: "HHVC - Owner - Fixing a Violation",
    serviceTitle: "Fix a violation after an inspection",
    summary: "What to do after you get a notice from an HHVC inspection.",
    pageType: "Information",
    userType: "Property owner / landlord",
    hub: "Owner Hub",
    parentName: "Pay your annual building fee",
    sections: [
      { heading: "What a violation notice means", body: "[Content to be generated]" },
      { heading: "Steps to fix the problem", body: "[Content to be generated]" },
      { heading: "What happens if you do not fix it", body: "[Content to be generated]" }
    ],
    related: ["Pay your annual building fee", "Owner rules for buildings with 3+ units"]
  },
  {
    name: "Owner rules for buildings with 3+ units",
    contentTitle: "HHVC - Owner - Owner Rules",
    serviceTitle: "Rules for building owners",
    summary: "Requirements for owners of buildings with 3 or more apartments.",
    pageType: "Information",
    userType: "Property owner / landlord",
    hub: "Owner Hub",
    parentName: "Pay your annual building fee",
    sections: [
      { heading: "Buildings that must register", body: "[Content to be generated]" },
      { heading: "Owner requirements", body: "[Content to be generated]" }
    ],
    related: ["Pay your annual building fee", "Fee deadlines and late costs", "Fixing a violation"]
  },
  {
    name: "Learn how to stop mosquitoes",
    contentTitle: "HHVC - Community - Mosquito Education",
    serviceTitle: "Learn how to stop mosquitoes",
    summary: "Join a workshop to learn how to keep your school and home safe from bugs.",
    pageType: "Campaign Page",
    userType: "General public",
    hub: "Community Hub",
    sections: [
      { heading: "Why mosquitoes are a health risk", body: "[Content to be generated]" },
      { heading: "Workshops and classes", body: "[Content to be generated]" }
    ],
    related: ["Mosquito classes for schools", "Report a dead bird"]
  },
  {
    name: "Mosquito classes for schools",
    contentTitle: "HHVC - Community - School Workshops",
    serviceTitle: "Mosquito classes for schools",
    summary: "Sign up for a teacher workshop about mosquito safety.",
    pageType: "Campaign Page",
    userType: "General public",
    hub: "Community Hub",
    parentName: "Learn how to stop mosquitoes",
    cta: "Sign up for a class",
    sections: [
      { heading: "What teachers learn", body: "[Content to be generated]" },
      { heading: "How to sign up", body: "[Content to be generated]" }
    ],
    related: ["Learn how to stop mosquitoes", "Report a dead bird"]
  },
  {
    name: "Report a dead bird",
    contentTitle: "HHVC - Vector - Dead Bird Report",
    serviceTitle: "Report a dead bird",
    summary: "Tell us if you find a dead bird so we can check if it is sick.",
    pageType: "Transaction",
    userType: "General public",
    hub: "Vector Services",
    cta: "Report bird location",
    sections: [
      { heading: "Why to report dead birds", body: "[Content to be generated]" },
      { heading: "How to report", body: "[Content to be generated]" }
    ],
    related: ["Learn how to stop mosquitoes", "Contact HHVC"]
  },
  {
    name: "Contact HHVC",
    contentTitle: "HHVC - Contact Us",
    serviceTitle: "Contact us",
    summary: "Call 311 or visit our office for help with housing and pest problems.",
    pageType: "Information",
    userType: "General public",
    hub: "Shared",
    sections: [
      { heading: "Call 311", body: "Call 311 to report problems and ask for inspections. You can call 24 hours a day, 7 days a week." },
      { heading: "Visit our office", body: "49 South Van Ness Avenue, Suite 600, San Francisco, CA 94103. Open Monday through Friday for payments and bills." }
    ],
    related: ["Get help with pests, mold, and trash", "Pay your annual building fee", "Report a dead bird"]
  }
];
