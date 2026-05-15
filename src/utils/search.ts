import { clean } from "./core";
import type { PageDraft } from "../types";

const OVERLAP_STOPWORDS = new Set([
  "a", "an", "the",
  "my", "your", "their", "our", "his", "her", "its",
  "of", "for", "to", "in", "on", "at", "by", "with",
  "and", "or",
  "is", "are", "was", "were"
]);

export const overlapTitleKey = (raw: string): string => {
  return clean(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !OVERLAP_STOPWORDS.has(token))
    .join(" ")
    .trim();
};

export const findOverlappingPageIds = (pages: PageDraft[]): Set<string> => {
  const byTitle = new Map<string, string[]>();
  for (const page of pages) {
    const key = overlapTitleKey(page.name);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (existing) existing.push(page.id);
    else byTitle.set(key, [page.id]);
  }
  const overlapIds = new Set<string>();
  byTitle.forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => overlapIds.add(id));
  });
  return overlapIds;
};
