/**
 * Builds the Karl evaluation prompt for a page draft.
 * @param {string} pageName
 * @param {string} pageType
 * @param {string} draft
 * @param {string} userType
 * @returns {string}
 */
function buildEvalPrompt(pageName, pageType, draft, userType) {
  return `You are an SF.gov content quality evaluator. Evaluate this HHVC page draft against SF.gov and Karl CMS content standards.

PAGE: ${pageName || "Untitled"}
TYPE: ${pageType || "Unknown"}
USER: ${userType || "Unknown"}

DRAFT:
${draft}

Evaluate and return ONLY one valid JSON object that matches this exact schema (no markdown, no comments, no extra keys, no trailing text):
{
  "score": <integer 0-100>,
  "grade": "<A|B|C|D|F>",
  "summary": "<one sentence overall assessment>",
  "passed": ["<check that passed>", ...],
  "warnings": ["<check that needs improvement>", ...],
  "failed": ["<check that failed>", ...],
  "parseError": false
}

VALID KARL CONTENT TYPES (only these are acceptable):
Transaction, Information, Step by step, Location, News, Event, Campaign, About, Resource Collection, Meeting, Profile, Data story, Reports, Agency, Topic

INVALID CONTENT TYPES (flag as FAILED if any appear):
Guidance page, Issue page, Enforcement page, Support page, Hub page, Campaign Page, any other type not in the valid list above

VALID KARL COMPONENTS (only these are acceptable):
Title, Description, Button link, Action link, Callout, Spotlight, Text, Section, Phone number, Email, Related, Address, Media, Profile, Resource tile, What to know, What to do

INVALID COMPONENTS (flag as FAILED if any appear):
Action-first title, Primary CTA block, Responsibilities section, What happens next, Signs/examples, When to use this page, FAQ, Checklist, Short summary, What you can do now, or any component not in the valid list above

Check for:
- Plain language at 5th-6th grade level
- Action-oriented title in first person (Title field)
- Clear primary purpose
- Description (SEO summary) present and under 150 characters
- No institutional jargon
- Page type is one of the valid Karl content types; flag as FAILED if a non-existent type is used
- All components used are from the valid Karl component list; flag as FAILED for any fictional component
- What to know and What to do sections present for Transaction pages
- 311 reference for Transaction pages (via Button link, Phone number, or text in What to do)
- Tenant responsibilities included if tenants are primary or secondary user
- System Relationships lists "Healthy housing and pests (Topic)" as the Parent
- No markdown formatting in content

DIGITAL.GOV PLAIN LANGUAGE CHECKS (check each of these specifically and include the result in passed, warnings, or failed):
- Sentence length: flag as a failure if multiple sentences consistently exceed 20 words. Identify the specific sentence(s) that are too long, e.g. "Sentence beginning 'You must contact...' exceeds 20 words."
- One idea per sentence: flag as a warning if any sentence contains more than one distinct idea joined by a conjunction.
- Active voice: flag as a failure if passive voice is used more than once. Name the specific passive construction found, e.g. "Passive voice: 'must be filed' — rewrite as 'you must file'."
- Present tense: flag as a warning if past tense is used where present tense would be appropriate.
- Hidden verbs (nominalizations): flag as a failure for each nominalization found. Provide the specific example and correction, e.g. "Hidden verb: 'make a decision' — use 'decide' instead." Common patterns to detect: 'make a decision', 'submit an application', 'provide notification', 'conduct an inspection', 'give consideration', 'take action', 'reach a conclusion', 'have a requirement'.
- Paragraph length: flag as a warning if any paragraph exceeds 4 sentences.
- Leads with the main point: flag as a warning if the first sentence of the page body or a section does not state the key action or conclusion.
- Reader addressed as "you": flag as a failure if body content does not use "you" to address the reader directly (titles are exempt).
- Unnecessary filler phrases: flag as a warning for each filler phrase found, e.g. 'in order to', 'it is important to note that', 'please be advised', 'at this point in time'.

For every item in warnings and failed, write the feedback as a specific, actionable instruction referencing the actual text (e.g., "Sentence on line 3 exceeds 20 words — split into two sentences." or "Avoid hidden verbs — use 'decide' not 'make a decision'.").

If any passed, warnings, or failed item discusses Karl CMS page types, Related pages, Transaction layout, or Information vs Transaction choice, include one exact URL from the GUARANTEED KARL EDITOR CITES block (in system) inside that string.`;
}

/**
 * Builds the system prompt for Karl evaluation, injecting citations.
 * @param {(base: string) => string} withKarlCitations
 * @returns {string}
 */
function buildEvalSystem(withKarlCitations) {
  return withKarlCitations("You are an SF.gov content standards evaluator. Return only valid JSON.");
}

/**
 * Builds the JSON repair prompt when the evaluator returns invalid JSON.
 * @param {string} invalidText
 * @returns {string}
 */
function buildEvalRepairPrompt(invalidText) {
  return `Your previous response was not valid JSON.
Return only one JSON object with keys: score, grade, summary, passed, warnings, failed, parseError.
Do not include markdown or extra text.

INVALID RESPONSE:
${invalidText}`;
}

export { buildEvalPrompt, buildEvalSystem, buildEvalRepairPrompt };
