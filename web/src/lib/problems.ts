// Reads extraction output directly from disk via fs, no client fetch / DB.
// `data/` lives one level up from `web/` (repo_root/data), outside this
// Next.js project's own root, so it's read via `fs` relative to
// `process.cwd()` (which is `web/` for both `next dev` and `next build`)
// rather than a static `import` (which would require the file to live
// inside this project or be symlinked in).

import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "..", "data");

export interface PatternSummary {
  index: number;
  name: string;
  slug: string;
  problemCount: number;
  description?: string;
  hasIntro: boolean;
}

export interface ManifestEntry {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  lessonType: string;
  pattern: { index: number; name: string; slug: string };
  languagesMissing: string[];
  warningCount: number;
}

export interface Example {
  raw: string;
  input: string | null;
  output: string | null;
  explanation: string | null;
}

export interface ProblemSection {
  id: string;
  title: string;
  html: string;
  code: Record<string, string>;
  demoCode: Record<string, string>;
  diagrams: string[];
}

export interface Problem {
  id: string;
  pattern: { index: number; name: string; slug: string };
  title: string;
  difficulty: "easy" | "medium" | "hard" | null;
  lessonType: string;
  sourceFolder: string[];
  problemStatementSectionId: string | null;
  starterCode: Record<string, string>;
  examples: Example[];
  sections: ProblemSection[];
  extraction: {
    sourceFiles: string[];
    languagesFound: string[];
    languagesMissing: string[];
    warnings: string[];
  };
}

let patternsCache: PatternSummary[] | null = null;
export function getPatterns(): PatternSummary[] {
  if (!patternsCache) {
    const raw = fs.readFileSync(path.join(DATA_ROOT, "patterns.json"), "utf-8");
    patternsCache = JSON.parse(raw);
  }
  return patternsCache!;
}

let manifestCache: ManifestEntry[] | null = null;
export function getManifest(): ManifestEntry[] {
  if (!manifestCache) {
    const raw = fs.readFileSync(path.join(DATA_ROOT, "manifest.json"), "utf-8");
    manifestCache = JSON.parse(raw);
  }
  return manifestCache!;
}

export function getProblemsForPattern(patternSlug: string): ManifestEntry[] {
  return getManifest().filter((p) => p.pattern.slug === patternSlug);
}

export function getProblem(patternSlug: string, problemSlug: string): Problem | null {
  const filePath = path.join(DATA_ROOT, "problems", patternSlug, `${problemSlug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Display-only pattern overview (the course's own "Introduction" lesson for
// that pattern) -- NOT a problem. Same section shape as Problem, minus
// problem-only fields. Not every pattern has one (see AGENTS.md
// "Pattern intros") -- callers must handle null.
export interface PatternIntro {
  pattern: { index: number; name: string; slug: string };
  summary: string;
  sections: ProblemSection[];
}

const patternIntroCache = new Map<string, PatternIntro | null>();
export function getPatternIntro(patternSlug: string): PatternIntro | null {
  if (!patternIntroCache.has(patternSlug)) {
    const filePath = path.join(DATA_ROOT, "patterns", `${patternSlug}.json`);
    const intro = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : null;
    patternIntroCache.set(patternSlug, intro);
  }
  return patternIntroCache.get(patternSlug)!;
}

// A representative "what this pattern looks like" diagram for the pattern
// page's intro. Most pattern Introduction lessons in the source don't carry
// a diagram of their own (verified: only 2 of 15 captured intros do) -- fall
// back to the first diagram found in that pattern's own problems (in course
// order) so most patterns still get a visual, without fabricating one for
// the few that genuinely have none anywhere (bitwise-xor, merge-intervals,
// miscellaneous, as of the last extraction run).
const patternPreviewDiagramCache = new Map<string, string | null>();
export function getPatternPreviewDiagram(patternSlug: string): string | null {
  if (!patternPreviewDiagramCache.has(patternSlug)) {
    let found: string | null = null;
    const intro = getPatternIntro(patternSlug);
    for (const s of intro?.sections ?? []) {
      if (s.diagrams.length > 0) {
        found = s.diagrams[0];
        break;
      }
    }
    if (!found) {
      for (const entry of getProblemsForPattern(patternSlug)) {
        const [, problemSlug] = entry.id.split("/");
        const problem = getProblem(patternSlug, problemSlug);
        const withDiagram = problem?.sections.find((s) => s.diagrams.length > 0);
        if (withDiagram) {
          found = withDiagram.diagrams[0];
          break;
        }
      }
    }
    patternPreviewDiagramCache.set(patternSlug, found);
  }
  return patternPreviewDiagramCache.get(patternSlug)!;
}
