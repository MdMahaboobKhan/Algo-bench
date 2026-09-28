"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ManifestEntry, PatternSummary } from "@/lib/problems";
import type { ProgressStatus } from "@/lib/db";
import { StatusDot } from "@/components/StatusDot";

interface SidebarProps {
  patterns: PatternSummary[];
  problemsByPattern: Record<string, ManifestEntry[]>;
}

// Parses the active pattern/problem slug out of the current pathname so the
// sidebar can auto-expand and highlight without any server round-trip.
function activeSlugsFromPathname(pathname: string): { pattern: string | null; problem: string | null } {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "problems" && parts.length >= 3) {
    return { pattern: parts[1], problem: parts[2] };
  }
  if (parts[0] === "patterns" && parts.length >= 2) {
    return { pattern: parts[1], problem: null };
  }
  return { pattern: null, problem: null };
}

export function Sidebar({ patterns, problemsByPattern }: SidebarProps) {
  const pathname = usePathname();
  const { pattern: activePattern, problem: activeProblem } = activeSlugsFromPathname(pathname);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activePattern ? [activePattern] : [])
  );
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({});

  // Keep whichever pattern the user is currently viewing expanded, without
  // collapsing anything they opened manually.
  useEffect(() => {
    if (activePattern) {
      setExpanded((prev) => (prev.has(activePattern) ? prev : new Set(prev).add(activePattern)));
    }
  }, [activePattern]);

  // Progress can change from any problem page (after a Run/Submit or a
  // manual status change) -- re-fetch on every navigation so the dots in the
  // sidebar stay live without wiring a global store for a personal tool.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/progress")
      .then((res) => res.json())
      .then((rows: { problemId: string; status: ProgressStatus }[]) => {
        if (cancelled) return;
        const map: Record<string, ProgressStatus> = {};
        for (const row of rows) map[row.problemId] = row.status;
        setProgress(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <nav
      aria-label="Patterns and problems"
      className="hidden md:block w-72 shrink-0 self-start sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    >
      {/* Patterns live under the "Coding" section (see web/src/lib/sections.ts) --
          a plain label here, not a collapsible node, since it's the only
          section with real nav content today; revisit if a second section
          needs the same treatment. */}
      <Link
        href="/coding"
        className="sticky top-0 z-10 block px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800"
      >
        Coding
      </Link>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {patterns.map((pattern, i) => {
          const problems = problemsByPattern[pattern.slug] ?? [];
          const solved = problems.filter((p) => progress[p.id] === "solved").length;
          const isOpen = expanded.has(pattern.slug);
          const isActivePattern = pattern.slug === activePattern;
          return (
            <li key={pattern.slug}>
              <button
                onClick={() => toggle(pattern.slug)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  isActivePattern ? "bg-zinc-50 dark:bg-zinc-800 font-medium" : ""
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    &rsaquo;
                  </span>
                  <Link
                    href={`/patterns/${pattern.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate hover:underline"
                  >
                    {i + 1}. {pattern.name}
                  </Link>
                </span>
                <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  {solved}/{pattern.problemCount}
                </span>
              </button>
              {isOpen && (
                <ul>
                  {pattern.hasIntro && (
                    <li>
                      <Link
                        href={`/patterns/${pattern.slug}#introduction`}
                        className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                          isActivePattern && !activeProblem
                            ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                            : "text-zinc-500 dark:text-zinc-400 italic"
                        }`}
                      >
                        Introduction
                      </Link>
                    </li>
                  )}
                  {problems.map((p) => {
                    const [, problemSlug] = p.id.split("/");
                    const isActive = p.id === `${activePattern}/${activeProblem}`;
                    return (
                      <li key={p.id}>
                        <Link
                          href={`/problems/${pattern.slug}/${problemSlug}`}
                          className={`flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                            isActive
                              ? "bg-zinc-100 dark:bg-zinc-800 font-medium"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <StatusDot status={progress[p.id] ?? "unattempted"} />
                          <span className="truncate">{p.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
