"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LearningResource } from "@/lib/prep-hub";
import { learningItemHref } from "@/lib/prep-hub";

const PAGE_SIZE = 12;

export function LearningResourceList({ resource }: { resource: LearningResource }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(resource.items.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return resource.items.slice(start, start + PAGE_SIZE);
  }, [page, resource.items]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, resource.items.length)} of {resource.items.length} topics
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Page {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {pageItems.map((item, index) => {
          const absoluteIndex = (page - 1) * PAGE_SIZE + index + 1;
          return (
            <Link
              key={item.title}
              href={learningItemHref(resource.slug, item.title)}
              className="group grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 md:grid-cols-[2.25rem_1fr_auto] md:items-start"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {absoluteIndex}
              </div>
              <div>
                <h2 className="text-lg font-semibold group-hover:underline">{item.title}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.bullets.map((bullet) => (
                    <span
                      key={bullet}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {bullet}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 md:pt-1">
                Open &rarr;
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            className={`h-9 w-9 rounded-full text-sm ${
              n === page
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
