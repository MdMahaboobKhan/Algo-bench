import Link from "next/link";
import { getManifest, getPatterns } from "@/lib/problems";
import { getAllProgress } from "@/lib/db";
import { HUB_AREAS } from "@/lib/prep-hub";
import { designChallengeId, getDailyDesignChallenge, getSystemDesignChallenges } from "@/lib/system-design";

export const dynamic = "force-dynamic";

export default function Home() {
  const patterns = getPatterns();
  const manifest = getManifest();
  const designChallenges = getSystemDesignChallenges();
  const dailyDesign = getDailyDesignChallenge();
  const progress = getAllProgress();
  const total = patterns.reduce((n, p) => n + p.problemCount, 0);
  const solvedCount = manifest.filter(
    (p) => progress.find((row) => row.problemId === p.id)?.status === "solved"
  ).length;
  const designSolvedCount = designChallenges.filter(
    (challenge) =>
      progress.find((row) => row.problemId === designChallengeId(challenge.slug))?.status === "solved"
  ).length;

  return (
    <div className="mx-auto max-w-5xl py-10">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Interview prep command center
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Choose what you want to practice today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300 md:text-base">
              One clean workspace for DSA fundamentals, HLD system design, LLD principles, engineering case studies, and books.
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Settings / AI providers
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
            <div className="text-2xl font-semibold">{solvedCount}/{total}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">DSA solved</div>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950">
            <div className="text-2xl font-semibold">{designSolvedCount}/{designChallenges.length}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">design drills done</div>
          </div>
          <Link
            href={`/system-design/${dailyDesign.slug}`}
            className="rounded-2xl bg-zinc-50 p-4 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800"
          >
            <div className="text-sm font-semibold">Daily prompt</div>
            <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{dailyDesign.title}</div>
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HUB_AREAS.map((area) => (
          <Link
            key={area.slug}
            href={area.href}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${area.accent}`}>{area.eyebrow}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{area.stats}</span>
            </div>
            <h2 className="mt-5 text-xl font-semibold group-hover:underline">{area.title}</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{area.description}</p>
            <div className="mt-5 text-sm font-medium">Open &rarr;</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
