import { SuggestedPage, Milestone, ComponentStyle } from "./types";

export const SYSTEM_PROMPT = `You are an SF.gov content system and UX design agent for the San Francisco Department of Public Health (SFDPH) Healthy Housing & Vector Control (HHVC).

Your job is to design ONE page at a time while ensuring it fits into a connected HHVC service system.

NON-NEGOTIABLE RULES:
- Each page must have ONE primary purpose
- Use plain language (5th–6th grade level)
- Use action-oriented language (tell the user what to do)
- Always include "What happens next"
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

TENANT RESPONSIBILITIES (always include on any page where tenants are the primary or secondary user):
The following are ALWAYS the tenant's responsibility:
- Controlling humidity inside their unit
- Housekeeping (cleanliness, clutter, sanitation)
- Proper food storage
- Communicating the problem to their landlord in writing
- Granting access to their unit for inspection or repairs
- Waiting 72 hours after notifying their landlord before contacting the city

CRITICAL PAGE TYPE RULES:
- You are NOT allowed to use "Hub page"
- Use "Topic page" instead of hub
- ALL pest-related pages MUST be Transaction pages
- Transaction pages MUST: 1) Direct users to 311 2) Include a clear explanation of how 311 works

PAGE TYPE OPTIONS: Topic page, Transaction page, Guidance page, Issue page, Enforcement page, Support page
COMPONENT LIBRARY: Action-first title, Short summary, What you can do now, Primary CTA block, When to use this page, Signs/examples, Responsibilities section, Step-by-step process, What happens next, Related pages, Warning/alert, Checklist, FAQ
TITLE RULE: First person tense only. Never use "your".
SUMMARY RULE: SEO-optimized, under 150 characters. No markdown.

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
[one type from the list above]

RECOMMENDED COMPONENTS:
- component name only, no formatting
- component name only

SYSTEM RELATIONSHIPS:
Parent: [value]
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

# [First-person plain text title, no markdown]

Summary: [SEO plain text under 150 chars]

## What you can do now
- plain text item
- plain text item

## When to use this page
Plain text paragraph.

## Report the problem (311)
Plain text only. Required for transaction pages.

## [Main section heading, plain text]
Plain text content.

## Responsibilities
Landlord:
- what the landlord must do (one item per line, plain text)
Tenant:
- what the tenant must do (one item per line, plain text)
Required when tenant is primary or secondary user. Always label groups exactly as "Landlord:" and "Tenant:" on their own line.

## What happens next
Plain text paragraph.

## Related pages
- plain text page name
- plain text page name

INTEGRATION NOTES:
- plain text only`;

export const PAGE_TYPES = ["Transaction page", "Topic page", "Guidance page", "Issue page", "Enforcement page", "Support page"];
export const USER_TYPES = ["Resident / tenant", "Property owner / landlord", "Business owner", "HHVC staff", "General public"];
export const PEST_KW = ["rodent", "rat", "mouse", "mice", "cockroach", "roach", "flea", "mosquito", "fly", "flies", "bed bug", "bedbug", "tick", "ant", "wasp", "bee", "pest"];

export const TYPE_META: Record<string, { fill: string; stroke: string; text: string; dot: string }> = {
  "Transaction page": { fill: "#E6F1FB", stroke: "#185FA5", text: "#0C447C", dot: "#378ADD" },
  "Topic page":       { fill: "#EAF3DE", stroke: "#3B6D11", text: "#27500A", dot: "#639922" },
  "Guidance page":    { fill: "#FAEEDA", stroke: "#854F0B", text: "#633806", dot: "#BA7517" },
  "Issue page":       { fill: "#FCEBEB", stroke: "#A32D2D", text: "#791F1F", dot: "#E24B4A" },
  "Enforcement page": { fill: "#EEEDFE", stroke: "#3C3489", text: "#26215C", dot: "#7F77DD" },
  "Support page":     { fill: "#E1F5EE", stroke: "#0F6E56", text: "#04342C", dot: "#1D9E75" }
};

export const SECTION_STYLES: Record<string, ComponentStyle> = {
  "what you can do now": { accent: "#185FA5", bg: "#E6F1FB", icon: "arrow" },
  "report the problem":  { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "311":                 { accent: "#0F6E56", bg: "#E1F5EE", icon: "phone" },
  "responsibilities":    { accent: "#854F0B", bg: "#FAEEDA", icon: "list" },
  "what happens next":   { accent: "#3C3489", bg: "#EEEDFE", icon: "clock" },
  "related pages":       { accent: "#5F5E5A", bg: "#F1EFE8", icon: "link" },
  "when to use":         { accent: "#A32D2D", bg: "#FCEBEB", icon: "info" },
  "warning":             { accent: "#A32D2D", bg: "#FCEBEB", icon: "info" },
  "signs":               { accent: "#185FA5", bg: "#E6F1FB", icon: "info" },
  "checklist":           { accent: "#0F6E56", bg: "#E1F5EE", icon: "list" },
  "step":                { accent: "#3C3489", bg: "#EEEDFE", icon: "arrow" },
  "faq":                 { accent: "#5F5E5A", bg: "#F1EFE8", icon: "info" },
};

export const SUGGESTED_PAGES: SuggestedPage[] = [
  { topic: "Report rats in my building", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Report cockroaches in my unit", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix mold in my rental", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Understand my rights as a tenant", userType: "Resident / tenant", pageType: "Topic page" },
  { topic: "What landlords must fix in my home", userType: "Resident / tenant", pageType: "Guidance page" },
  { topic: "Request a housing inspection", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Report bed bugs in my home", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix a water leak in my rental", userType: "Property owner / landlord", pageType: "Guidance page" },
  { topic: "Understand landlord pest control duties", userType: "Property owner / landlord", pageType: "Guidance page" },
  { topic: "Appeal a housing violation notice", userType: "Property owner / landlord", pageType: "Transaction page" },
  { topic: "Report mosquitoes near my home", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Get help with lead paint in my home", userType: "Resident / tenant", pageType: "Support page" },
  { topic: "Understand HHVC enforcement process", userType: "General public", pageType: "Topic page" },
  { topic: "Report fleas in my building", userType: "Resident / tenant", pageType: "Transaction page" },
  { topic: "Fix heating problems in my rental", userType: "Resident / tenant", pageType: "Transaction page" },
];

export const MILESTONE_DOTS: Milestone[] = [
  { pct: 15, label: "Connecting" },
  { pct: 30, label: "Karl docs" },
  { pct: 50, label: "Standards" },
  { pct: 80, label: "Drafting" },
  { pct: 95, label: "Evaluating" },
  { pct: 100, label: "Done" },
];
