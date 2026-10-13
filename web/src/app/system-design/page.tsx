import Link from "next/link";
import { getAllProgress } from "@/lib/db";
import { getLearningResources } from "@/lib/prep-hub";
import {
  designChallengeId,
  getDailyDesignChallenge,
  getSystemDesignChallenges,
} from "@/lib/system-design";

export const dynamic = "force-dynamic";

function difficultyTone(difficulty: string): string {
  if (difficulty === "foundation") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (difficulty === "advanced") return "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

export default function SystemDesignPage() {
  const challenges = getSystemDesignChallenges();
  const resources = getLearningResources();
  const daily = getDailyDesignChallenge();
  const progress = new Map(getAllProgress().map((row) => [row.problemId, row.status]));
  const solved = challenges.filter((challenge) => progress.get(designChallengeId(challenge.slug)) === "solved").length;
  const attempted = challenges.filter((challenge) => progress.get(designChallengeId(challenge.slug)) === "attempted").length;

  return (
    <div className="mx-auto max-w-6xl py-10">
      <Link href="/" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
        &larr; Interview Prep OS
      </Link>

      <section className="mt-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-8 p-6 md:grid-cols-[1.35fr_0.65fr] md:p-8">
          <div>
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Daily system design practice
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              Build the design muscle next to your DSA reps.
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-300">
              Practice one interview-sized design prompt per day, then compare your notes with a structured answer. Keep it in the same workspace as your algorithm patterns.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/system-design/${daily.slug}`}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Start today&apos;s drill
              </Link>
              <Link
                href="/coding"
                className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Switch to DSA
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Today&apos;s prompt
            </p>
            <h2 className="mt-2 text-xl font-semibold">{daily.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{daily.subtitle}</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-white p-3 dark:bg-zinc-900">
                <div className="text-lg font-semibold">{challenges.length}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">drills</div>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-zinc-900">
                <div className="text-lg font-semibold">{solved}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">done</div>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-zinc-900">
                <div className="text-lg font-semibold">{attempted}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {resources.map((resource) => (
          <Link
            key={resource.slug}
            href={resource.href}
            className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {resource.eyebrow}
            </p>
            <h3 className="mt-3 font-semibold">{resource.title}</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{resource.subtitle}</p>
            <div className="mt-4 text-sm font-medium">Study section &rarr;</div>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Design case studies</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pick a prompt, write your design, then mark it attempted or solved.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {challenges.map((challenge) => {
            const status = progress.get(designChallengeId(challenge.slug)) ?? "unattempted";
            return (
              <Link
                key={challenge.slug}
                href={`/system-design/${challenge.slug}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${difficultyTone(challenge.difficulty)}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="text-xs capitalize text-zinc-400 dark:text-zinc-500">{status}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold group-hover:underline">{challenge.title}</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{challenge.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {challenge.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 text-xs text-zinc-400 dark:text-zinc-500">
                  ~{challenge.estimatedMinutes} min interview loop
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
