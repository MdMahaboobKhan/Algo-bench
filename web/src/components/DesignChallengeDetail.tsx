"use client";

import { useEffect, useState } from "react";
import type { ProgressStatus } from "@/lib/db";
import { designChallengeId, type SystemDesignChallenge } from "@/lib/system-design";
import { StatusDot } from "@/components/StatusDot";

function difficultyClass(difficulty: SystemDesignChallenge["difficulty"]): string {
  if (difficulty === "foundation") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (difficulty === "advanced") return "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

function StatusControl({
  status,
  onChange,
}: {
  status: ProgressStatus;
  onChange: (status: ProgressStatus) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <StatusDot status={status} />
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as ProgressStatus)}
        className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        <option value="unattempted">Unattempted</option>
        <option value="attempted">Attempted</option>
        <option value="solved">Solved</option>
      </select>
    </label>
  );
}

export function DesignChallengeDetail({ challenge }: { challenge: SystemDesignChallenge }) {
  const progressId = designChallengeId(challenge.slug);
  const notesKey = `system-design-notes:${challenge.slug}`;
  const [status, setStatusState] = useState<ProgressStatus>("unattempted");
  const [notes, setNotes] = useState("");
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/progress?id=${encodeURIComponent(progressId)}`)
      .then((res) => res.json())
      .then((row) => {
        if (!cancelled && row?.status) setStatusState(row.status);
      })
      .catch(() => {});

    Promise.resolve(window.localStorage.getItem(notesKey)).then((saved) => {
      if (!cancelled && saved) setNotes(saved);
    });
    return () => {
      cancelled = true;
    };
  }, [notesKey, progressId]);

  useEffect(() => {
    window.localStorage.setItem(notesKey, notes);
  }, [notes, notesKey]);

  async function updateStatus(newStatus: ProgressStatus) {
    setStatusState(newStatus);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: progressId, status: newStatus }),
      });
      const row = await res.json();
      if (row?.status) setStatusState(row.status);
    } catch {
      // Keep optimistic status for this local-only study tool.
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${difficultyClass(challenge.difficulty)}`}>
              {challenge.difficulty}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              ~{challenge.estimatedMinutes} min
            </span>
            {challenge.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{challenge.title}</h1>
          <p className="mt-2 max-w-3xl text-zinc-600 dark:text-zinc-300">{challenge.subtitle}</p>
        </div>
        <StatusControl status={status} onChange={updateStatus} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,44rem)_1fr]">
        <article className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Scenario
            </h2>
            <p className="mt-3 text-zinc-700 dark:text-zinc-200">{challenge.scenario}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {challenge.outcomes.map((outcome) => (
                <div key={outcome} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                  {outcome}
                </div>
              ))}
            </div>
          </section>

          {challenge.sections.map((section) => (
            <section key={section.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-zinc-600 dark:text-zinc-300">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-200">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Your design notes</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Draft requirements, APIs, data model, and tradeoffs. Saved locally in this browser.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example:\n- Functional requirements\n- Scale estimates\n- Core APIs\n- Data model\n- Bottlenecks and mitigations"
              className="mt-4 min-h-80 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => updateStatus("attempted")}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Mark attempted
              </button>
              <button
                onClick={() => updateStatus("solved")}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Mark solved
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Interviewer follow-ups</h2>
            <ul className="mt-3 space-y-3">
              {challenge.prompts.map((prompt) => (
                <li key={prompt} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {prompt}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setShowSolution((value) => !value)}
              className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {showSolution ? "Hide answer outline" : "Reveal answer outline"}
            </button>
            {showSolution && (
              <div className="mt-5">
                <h2 className="font-semibold">{challenge.solution.title}</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                  {challenge.solution.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
