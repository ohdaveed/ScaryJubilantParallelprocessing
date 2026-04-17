# Apply digital.gov Plain Language Guidelines

## What & Why
The current system prompt and Karl evaluation criteria encode some plain language principles (5th–6th grade level, action-oriented titles, no jargon), but they do not reflect the full set of digital.gov Plain Language Web Writing Tips (https://digital.gov/resources/plain-language-web-writing-tips). Adding these guidelines ensures that every generated page draft follows federally-recognized plain language standards, producing content that is easier to scan, understand, and act on — especially for residents who may be under stress when dealing with housing issues.

## Done looks like
- The AI-generated drafts follow all digital.gov plain language principles: sentences average 15–20 words, one idea per sentence, active voice, present tense, no hidden verbs (nominalizations), strong topic sentences, short paragraphs, and content leads with the main point.
- The system prompt explicitly instructs the LLM to address the reader directly using "you" in body content (while keeping first-person page titles per the existing title rule).
- The Karl evaluation scoring checks for these specific digital.gov criteria and flags violations as warnings or failures — for example, detecting overly long sentences, passive voice, or nominalizations.
- The evaluation feedback shown in the Karl panel gives actionable, specific guidance (e.g., "Sentence on line 3 exceeds 20 words" or "Avoid hidden verbs — use 'decide' not 'make a decision'").

## Out of scope
- Changes to page types, component library, or UI layout (covered by a separate task).
- Changes to the 311 or pest-page rules.
- Adding a reading-level auto-calculation tool (the LLM judges this, not a code library).

## Tasks
1. **Expand the system prompt with digital.gov plain language rules** — Add a new `PLAIN LANGUAGE RULES` section to the `SYSTEM_PROMPT` in `src/constants.ts` that lists the digital.gov writing standards: sentence length target (15–20 words), one idea per sentence, present tense, active voice, avoid nominalizations (with examples), strong topic sentences, short paragraphs with one idea each, lead with the main point, use "you" to address the reader in body content, and omit unnecessary words.

2. **Update the Karl evaluation prompt with digital.gov checks** — Expand the `evalPrompt` in `server.js` to include the following additional checks: average sentence length (flag if consistently over 20 words), passive voice usage (flag if frequent), use of hidden verbs/nominalizations (flag specific examples), paragraph length (flag if paragraphs exceed 4–5 sentences), whether content leads with the main point, and whether "you" is used to address the reader in the body. These checks should produce specific, actionable items in `passed`, `warnings`, and `failed` arrays.

## Relevant files
- `src/constants.ts:1-102`
- `server.js:205-242`
