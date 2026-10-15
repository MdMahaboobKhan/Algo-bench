"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DifficultyBadge } from "@/components/DifficultyBadge";

interface SearchResult {
  kind: "coding" | "system-design" | "resource";
  id: string;
  title: string;
  href: string;
  pattern?: { name: string; slug: string };
  difficulty: "easy" | "medium" | "hard" | null;
  lessonType: string;
  matchedIn: "title" | "content";
  snippet: string | null;
}

/** Search box for finding a problem by title/keyword/phrase, or a regex
 * (e.g. "two.?pointer", "O\\(n log n\\)") -- searches both problem titles
 * and full statement/solution text. Debounced fetch to /api/search. Invalid
 * regex falls back to a plain substring match server-side, so this never
 * just errors out on an ordinary phrase. */
export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      queueMicrotask(() => {
        setResults([]);
        setOpen(false);
      });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data: { results: SearchResult[] }) => {
          if (cancelled) return;
          setResults(data.results ?? []);
          setOpen(true);
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close the results dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Search DSA + system design…"
        aria-label="Search DSA and system design"
        className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-96 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-zinc-400 dark:text-zinc-500 italic">
              No matches
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{r.title}</span>
                      {r.kind === "coding" ? (
                        <DifficultyBadge difficulty={r.difficulty} />
                      ) : (
                        <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs capitalize text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {r.kind === "resource" ? "Guide" : "Design"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {r.kind === "coding" ? r.pattern?.name : r.kind === "resource" ? "Learning Guide" : "System Design"}
                      {r.lessonType === "challenge" && " · Challenge"}
                      {r.kind !== "coding" && ` · ${r.lessonType}`}
                    </div>
                    {r.snippet && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic truncate">
                        {r.snippet}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
