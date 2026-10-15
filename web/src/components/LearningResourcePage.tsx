import Link from "next/link";
import type { LearningResource } from "@/lib/prep-hub";
import { learningItemHref } from "@/lib/prep-hub";
import { LearningResourceList } from "@/components/LearningResourceList";

export function LearningResourcePage({ resource }: { resource: LearningResource }) {
  const listView = resource.slug === "fundamentals" || resource.slug === "lld-principles";

  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {resource.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">{resource.title}</h1>
          <p className="mt-4 max-w-3xl text-zinc-600 dark:text-zinc-300">{resource.description}</p>
        </div>
        {listView && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-semibold">{resource.items.length}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">curated topics</div>
          </div>
        )}
      </div>

      {listView ? (
        <LearningResourceList resource={resource} />
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {resource.items.map((item) => (
          <Link
            key={item.title}
            href={learningItemHref(resource.slug, item.title)}
            className={
              listView
                ? "group grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 md:grid-cols-[2.25rem_1fr_auto] md:items-start"
                : "rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            }
          >
            {listView && (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {resource.items.indexOf(item) + 1}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold group-hover:underline">{item.title}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.body}</p>
              <div className={listView ? "mt-3 flex flex-wrap gap-2" : "mt-4 space-y-2"}>
                {item.bullets.map((bullet) =>
                  listView ? (
                    <span
                      key={bullet}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {bullet}
                    </span>
                  ) : (
                    <div key={bullet} className="flex gap-3 text-sm text-zinc-700 dark:text-zinc-200">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                      <span>{bullet}</span>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 md:pt-1">
              Open &rarr;
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
