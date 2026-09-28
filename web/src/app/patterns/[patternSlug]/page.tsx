import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPatternIntro,
  getPatternPreviewDiagram,
  getPatterns,
  getProblemsForPattern,
} from "@/lib/problems";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { StatusDot } from "@/components/StatusDot";
import { PatternIntro } from "@/components/PatternIntro";
import { getAllProgress, type ProgressStatus } from "@/lib/db";

// Per-problem status dots need live SQLite state -- see page.tsx for the same
// tradeoff (small dataset, negligible per-request cost).
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getPatterns().map((p) => ({ patternSlug: p.slug }));
}

export default async function PatternPage({
  params,
}: {
  params: Promise<{ patternSlug: string }>;
}) {
  const { patternSlug } = await params;
  const allPatterns = getPatterns();
  const patternPosition = allPatterns.findIndex((p) => p.slug === patternSlug);
  const pattern = allPatterns[patternPosition];
  if (!pattern) notFound();

  const problems = getProblemsForPattern(patternSlug);
  const statusById = new Map(getAllProgress().map((p) => [p.problemId, p.status]));
  const intro = getPatternIntro(patternSlug);
  const previewDiagram = getPatternPreviewDiagram(patternSlug);

  return (
    <div className="mx-auto max-w-4xl py-12">
      <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
        &larr; Patterns
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-6">
        {/* Display order, not the source course's folder index -- see home page. */}
        {patternPosition + 1}. {pattern.name}
      </h1>
      {intro && <PatternIntro intro={intro} previewDiagram={previewDiagram} />}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
        Problems
      </h3>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {problems.map((p) => {
          const status: ProgressStatus = statusById.get(p.id) ?? "unattempted";
          return (
            <li key={p.id}>
              <Link
                href={`/problems/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="flex items-center gap-2 font-medium">
                  <StatusDot status={status} />
                  {p.title}
                </span>
                <span className="flex items-center gap-2">
                  {p.lessonType === "challenge" && (
                    <span className="text-xs rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5">
                      Challenge
                    </span>
                  )}
                  <DifficultyBadge difficulty={p.difficulty} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
