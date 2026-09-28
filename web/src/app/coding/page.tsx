import Link from "next/link";
import { getManifest, getPatterns } from "@/lib/problems";
import { getAllProgress } from "@/lib/db";

// Progress-derived stats need to reflect the live SQLite state, not a
// build-time snapshot, so this page is rendered dynamically (the dataset is
// tiny -- 121 problems -- so the per-request cost is negligible).
export const dynamic = "force-dynamic";

export default function CodingSection() {
  const patterns = getPatterns();
  const manifest = getManifest();
  const progress = getAllProgress();
  const total = patterns.reduce((n, p) => n + p.problemCount, 0);

  const statusById = new Map(progress.map((p) => [p.problemId, p.status]));
  const solvedCount = manifest.filter((p) => statusById.get(p.id) === "solved").length;

  const solvedByPattern = new Map<string, number>();
  for (const p of manifest) {
    if (statusById.get(p.id) === "solved") {
      solvedByPattern.set(p.pattern.slug, (solvedByPattern.get(p.pattern.slug) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-12">
      <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
        &larr; AlgoBench
      </Link>
      <h1 className="text-2xl font-semibold mt-2 mb-1">Coding</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        {solvedCount}/{total} problems solved across {patterns.length} patterns.
      </p>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {patterns.map((p, i) => {
          const solved = solvedByPattern.get(p.slug) ?? 0;
          return (
            <li key={p.slug}>
              <Link
                href={`/patterns/${p.slug}`}
                className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    {i + 1}. {p.name}
                  </span>
                  <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                    {solved}/{p.problemCount} solved
                  </span>
                </div>
                {p.description && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{p.description}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
