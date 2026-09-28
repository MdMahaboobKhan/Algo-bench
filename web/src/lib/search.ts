// Full-text (and regex) search over problem titles/statements/solutions.
// Small corpus (121 problems) -- a lazily-built, module-cached in-memory
// index is simpler and fast enough here, no need for a persisted search
// index file or an external search service. Follows the same
// lazy-module-cache convention as getPatterns()/getManifest() in
// problems.ts.

import { getManifest, getProblem, type ManifestEntry } from "@/lib/problems";

interface SearchIndexEntry {
  id: string;
  title: string;
  pattern: { name: string; slug: string };
  difficulty: ManifestEntry["difficulty"];
  lessonType: string;
  // Plain text (HTML stripped) of the title + every section's prose, used
  // for phrase/regex matching. Not returned to the client -- only used to
  // compute match snippets.
  text: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

let indexCache: SearchIndexEntry[] | null = null;

function getIndex(): SearchIndexEntry[] {
  if (!indexCache) {
    indexCache = getManifest().map((entry) => {
      const [patternSlug, problemSlug] = entry.id.split("/");
      const problem = getProblem(patternSlug, problemSlug);
      const parts = [entry.title];
      for (const ex of problem?.examples ?? []) parts.push(ex.raw);
      for (const s of problem?.sections ?? []) {
        if (s.title) parts.push(s.title);
        if (s.html) parts.push(stripHtml(s.html));
      }
      return {
        id: entry.id,
        title: entry.title,
        pattern: { name: entry.pattern.name, slug: entry.pattern.slug },
        difficulty: entry.difficulty,
        lessonType: entry.lessonType,
        text: parts.join(" • "),
      };
    });
  }
  return indexCache;
}

// Builds a case-insensitive matcher from the user's query. If the query is
// a valid regex, use it as one (so "linked ?list", "two.?pointer", etc. all
// work); if it's not valid regex (e.g. unbalanced parens -- easy to type by
// accident when just searching a plain phrase like "O(n)"), fall back to
// matching it as a literal substring so search never just errors out.
function buildMatcher(query: string): RegExp {
  try {
    return new RegExp(query, "i");
  } catch {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i");
  }
}

export interface SearchResult {
  id: string;
  title: string;
  pattern: { name: string; slug: string };
  difficulty: ManifestEntry["difficulty"];
  lessonType: string;
  matchedIn: "title" | "content";
  snippet: string | null;
}

const SNIPPET_RADIUS = 60;

function makeSnippet(text: string, match: RegExpExecArray): string {
  const start = Math.max(0, match.index - SNIPPET_RADIUS);
  const end = Math.min(text.length, match.index + match[0].length + SNIPPET_RADIUS);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end).trim() + suffix;
}

export function searchProblems(query: string, limit = 30): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const matcher = buildMatcher(trimmed);

  const titleMatches: SearchResult[] = [];
  const contentMatches: SearchResult[] = [];

  for (const entry of getIndex()) {
    const titleMatch = matcher.exec(entry.title);
    if (titleMatch) {
      titleMatches.push({
        id: entry.id,
        title: entry.title,
        pattern: entry.pattern,
        difficulty: entry.difficulty,
        lessonType: entry.lessonType,
        matchedIn: "title",
        snippet: null,
      });
      continue; // already matched on the higher-priority field
    }
    matcher.lastIndex = 0;
    const contentMatch = matcher.exec(entry.text);
    if (contentMatch) {
      contentMatches.push({
        id: entry.id,
        title: entry.title,
        pattern: entry.pattern,
        difficulty: entry.difficulty,
        lessonType: entry.lessonType,
        matchedIn: "content",
        snippet: makeSnippet(entry.text, contentMatch),
      });
    }
    matcher.lastIndex = 0;
  }

  return [...titleMatches, ...contentMatches].slice(0, limit);
}
