import Link from "next/link";
import { getManifest, getPatterns } from "@/lib/problems";
import { getAllProgress } from "@/lib/db";
import { SECTIONS } from "@/lib/sections";

// Progress-derived stats need to reflect the live SQLite state, not a
// build-time snapshot, so this page is rendered dynamically (the dataset is
// tiny -- 121 problems -- so the per-request cost is negligible).
export const dynamic = "force-dynamic";

export default function Home() {
  const patterns = getPatterns();
  const manifest = getManifest();
  const progress = getAllProgress();
  const total = patterns.reduce((n, p) => n + p.problemCount, 0);
  const solvedCount = manifest.filter(
    (p) => progress.find((row) => row.problemId === p.id)?.status === "solved"
  ).length;

  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="text-2xl font-semibold mb-1">AlgoBench</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-2">
        A self-hosted practice site for interview prep:
      </p>
      <ul className="mb-8 max-w-xl list-disc list-inside space-y-1 text-zinc-500 dark:text-zinc-400">
        <li>Browse problems by pattern</li>
        <li>Work through them in a built-in code editor</li>
        <li>Run your solution against real test cases with a local judge</li>
        <li>Reveal a worked solution when you get stuck</li>
        <li>Content is organized into sections below, with more planned over time</li>
      </ul>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((section) => {
          const available = section.href !== null;
          const stats =
            section.slug === "coding"
              ? `${solvedCount}/${total} problems solved across ${patterns.length} patterns`
              : section.description;
          const content = (
            <div
              className={`h-full rounded-lg border p-5 ${
                available
                  ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                  : "border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold">{section.name}</span>
                {!available && (
                  <span className="text-xs rounded px-2 py-0.5 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{stats}</p>
            </div>
          );
          return (
            <li key={section.slug}>
              {available ? (
                <Link href={section.href!} className="block h-full">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-8 mb-2 text-sm text-zinc-400 dark:text-zinc-500">Contributing:</p>
      <ul className="max-w-xl list-disc list-inside space-y-1 text-sm text-zinc-400 dark:text-zinc-500">
        <li>New problems, judge coverage, UI improvements, whatever — welcome</li>
        <li>Work on a feature branch, then open a PR for review before merging</li>
        <li>See the Contributing section in the README for the full workflow</li>
      </ul>
    </div>
  );
}
