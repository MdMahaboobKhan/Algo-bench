"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ManifestEntry, PatternSummary } from "@/lib/problems";
import type { ProgressStatus } from "@/lib/db";
import { HUB_AREAS } from "@/lib/prep-hub";
import { designChallengeId, type SystemDesignChallenge } from "@/lib/system-design";
import { StatusDot } from "@/components/StatusDot";

interface SidebarProps {
  patterns: PatternSummary[];
  problemsByPattern: Record<string, ManifestEntry[]>;
  designChallenges: SystemDesignChallenge[];
}

// Parses the active pattern/problem slug out of the current pathname so the
// sidebar can auto-expand and highlight without any server round-trip.
function activeSlugsFromPathname(pathname: string): {
  pattern: string | null;
  problem: string | null;
  design: string | null;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "problems" && parts.length >= 3) {
    return { pattern: parts[1], problem: parts[2], design: null };
  }
  if (parts[0] === "patterns" && parts.length >= 2) {
    return { pattern: parts[1], problem: null, design: null };
  }
  if (parts[0] === "system-design") {
    return { pattern: null, problem: null, design: parts[1] ?? null };
  }
  return { pattern: null, problem: null, design: null };
}

export function Sidebar({ patterns, problemsByPattern, designChallenges }: SidebarProps) {
  const pathname = usePathname();
  const { pattern: activePattern, problem: activeProblem, design: activeDesign } = activeSlugsFromPathname(pathname);
  const isDsaArea = pathname === "/coding" || pathname.startsWith("/patterns/") || pathname.startsWith("/problems/");
  const isSystemDesignArea = pathname === "/system-design" || pathname.startsWith("/system-design/");
  const systemDesignTopSlug = pathname.split("/").filter(Boolean)[1] ?? null;
  const isDesignDrillArea =
    pathname === "/system-design" ||
    Boolean(systemDesignTopSlug && designChallenges.some((challenge) => challenge.slug === systemDesignTopSlug));

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activePattern ? [activePattern] : [])
  );
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({});

  // Keep whichever pattern the user is currently viewing expanded, without
  // collapsing anything they opened manually.
  useEffect(() => {
    if (activePattern) {
      queueMicrotask(() => {
        setExpanded((prev) => (prev.has(activePattern) ? prev : new Set(prev).add(activePattern)));
      });
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

  if (pathname === "/" || pathname === "/settings") return null;

  return (
    <nav
      aria-label="Patterns and problems"
      className="hidden md:block w-72 shrink-0 self-start sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
    >
      <Link
        href="/"
        className="block border-b border-zinc-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        Prep sections
      </Link>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {HUB_AREAS.map((area) => {
          const isActive =
            (area.slug === "dsa-fundamentals" && isDsaArea) ||
            (area.slug !== "dsa-fundamentals" &&
              (pathname === area.href ||
                pathname.startsWith(`${area.href}/`) ||
                pathname.startsWith(`/system-design/topics/${area.href.split("/").at(-1)}/`)));
          return (
            <li key={area.slug}>
              <Link
                href={area.href}
                className={`block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  isActive ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className="truncate">{area.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {isDsaArea && (
        <>
      <Link
        href="/coding"
        className="mt-3 block border-y border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        DSA patterns
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
        </>
      )}

      {isSystemDesignArea && (
        <>
      {isDesignDrillArea && (
        <>
      <div className="border-y border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
        Design drills
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {designChallenges.map((challenge) => {
          const status = progress[designChallengeId(challenge.slug)] ?? "unattempted";
          const isActive = activeDesign === challenge.slug;
          return (
            <li key={challenge.slug}>
              <Link
                href={`/system-design/${challenge.slug}`}
                className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  isActive ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <StatusDot status={status} />
                <span className="truncate">{challenge.title.replace("Design ", "")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
        </>
      )}
        </>
      )}

      <Link
        href="/settings"
        className="mt-3 block border-t border-zinc-200 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-600 dark:border-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        Settings
      </Link>
    </nav>
  );
}
