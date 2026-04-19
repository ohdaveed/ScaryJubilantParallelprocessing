import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _entries = null;
function loadEntries() {
  if (_entries) return _entries;
  const raw = readFileSync(path.join(__dirname, "karl-citations.json"), "utf8");
  _entries = JSON.parse(raw);
  if (!Array.isArray(_entries)) _entries = [];
  return _entries;
}

/**
 * Immutable block of official Karl Editor Help Center URLs + excerpts.
 * Injected server-side so models always see canonical cites (independent of MCP tool use).
 */
export function getKarlCitationBlock() {
  if (process.env.KARL_CITATIONS_DISABLED === "1" || process.env.KARL_CITATIONS_DISABLED === "true") {
    return "";
  }
  const entries = loadEntries();
  if (!entries.length) return "";

  const lines = entries.map((e, i) => {
    const title = typeof e.title === "string" ? e.title : "Source";
    const url = typeof e.url === "string" ? e.url : "";
    const excerpt = typeof e.excerpt === "string" ? e.excerpt : "";
    return `${i + 1}. ${title}\n   URL: ${url}\n   Excerpt: ${excerpt}`;
  });

  return `

---
GUARANTEED KARL EDITOR CITES (official SF Digital Services GitBook — copy URLs verbatim when you reference Karl in your answer):
${lines.join("\n\n")}
---
When you discuss Karl CMS content types, components, Related pages, or Transaction structure, cite at least one URL above (exact string) in your visible output where applicable.`;
}

/** Append citation block to Anthropic system string (string or undefined). */
export function withKarlCitations(system) {
  const block = getKarlCitationBlock();
  if (!block) return typeof system === "string" ? system : system ?? "";
  const base = typeof system === "string" ? system : "";
  return `${base}${block}`;
}

const OFFICIAL_KARL_HELP_RE = /sfdigitalservices\.gitbook\.io\/karl-sf\.gov-editor-help-center/i;

/** True if evaluation strings appear to discuss Karl CMS (not plain "information" alone). */
export function evaluationMentionsKarlTopics(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  const t = text.toLowerCase();
  if (/\bkarl\b/.test(t) || /\bwagtail\b/.test(t)) return true;
  if (/\btransaction\b/.test(t) && /\b(page|type|content)\b/.test(t)) return true;
  if (/\binformation\b/.test(t) && /\b(page|type|content)\b/.test(t)) return true;
  if (/\bcontent\s+type/.test(t)) return true;
  if (/\brelated\b/.test(t) && /\b(page|pages|component|link)\b/.test(t)) return true;
  if (/step\s+by\s+step/.test(t)) return true;
  return false;
}

export function evaluationContainsOfficialKarlUrl(text) {
  return typeof text === "string" && OFFICIAL_KARL_HELP_RE.test(text);
}

/**
 * If the model discussed Karl but omitted an official GitBook URL, append a machine-added warning with the primary cite.
 * @param {object} normalized - { summary, passed, warnings, failed, ... }
 * @returns {object} same shape, possibly with an extra warnings[] entry
 */
export function enforceKarlCitationsOnEvaluation(normalized) {
  if (process.env.KARL_CITATIONS_DISABLED === "1" || process.env.KARL_CITATIONS_DISABLED === "true") {
    return normalized;
  }
  if (!normalized || typeof normalized !== "object") return normalized;

  const summary = typeof normalized.summary === "string" ? normalized.summary : "";
  const passed = Array.isArray(normalized.passed) ? normalized.passed : [];
  const warnings = Array.isArray(normalized.warnings) ? [...normalized.warnings] : [];
  const failed = Array.isArray(normalized.failed) ? normalized.failed : [];

  const blob = [summary, ...passed.map(String), ...warnings.map(String), ...failed.map(String)].join("\n");

  if (!evaluationMentionsKarlTopics(blob)) return normalized;
  if (evaluationContainsOfficialKarlUrl(blob)) return normalized;

  const entries = loadEntries();
  const primaryUrl =
    typeof entries[0]?.url === "string" && entries[0].url
      ? entries[0].url
      : "https://sfdigitalservices.gitbook.io/karl-sf.gov-editor-help-center/using-karl-the-cms/content-types/choosing-a-content-type";

  const tag = "[Karl cite enforced]";
  const msg = `${tag} This evaluation referenced Karl/CMS topics but did not include an official Editor Help URL. Use: ${primaryUrl}`;

  if (!warnings.some((w) => typeof w === "string" && w.includes(tag))) {
    warnings.push(msg);
  }

  return { ...normalized, warnings };
}
