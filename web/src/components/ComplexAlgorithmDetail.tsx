"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TopicExplanation } from "@/components/TopicExplanation";
import type { LearningResource } from "@/lib/prep-hub";
import {
  COMPLEX_ALGORITHMS_CACHE_KEY,
  complexAlgorithmSlug,
  fallbackComplexAlgorithms,
  isComplexAlgorithmsCache,
  type ComplexAlgorithm,
} from "@/lib/complex-algorithms";

function loadAlgorithms(): ComplexAlgorithm[] {
  const cached = localStorage.getItem(COMPLEX_ALGORITHMS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (isComplexAlgorithmsCache(parsed)) return parsed.algorithms;
    } catch {
      localStorage.removeItem(COMPLEX_ALGORITHMS_CACHE_KEY);
    }
  }
  return fallbackComplexAlgorithms();
}

function resourceFor(item: ComplexAlgorithm): LearningResource {
  return {
    slug: "complex-engineering-algorithms",
    title: "Complex Engineering Algorithms",
    subtitle: "Real-world algorithms and data structures behind distributed systems, databases, maps, and observability.",
    eyebrow: "Distributed systems algorithm",
    description: "AI-curated distributed systems algorithms for interview prep.",
    href: "/system-design/complex-engineering-algorithms",
    items: [item],
  };
}

export function ComplexAlgorithmDetail({ algorithmSlug }: { algorithmSlug: string }) {
  const [algorithm, setAlgorithm] = useState<ComplexAlgorithm | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setAlgorithm(loadAlgorithms().find((entry) => complexAlgorithmSlug(entry) === algorithmSlug) ?? null);
    });
  }, [algorithmSlug]);

  if (!algorithm) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Link href="/system-design/complex-engineering-algorithms" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          &larr; Complex engineering algorithms
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Algorithm not found</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Refresh the algorithms page to generate a cached list.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/system-design/complex-engineering-algorithms" className="hover:underline">
          Complex Engineering Algorithms
        </Link>
        {" / "}
        <span>{algorithm.title}</span>
      </div>
      <TopicExplanation resource={resourceFor(algorithm)} item={algorithm} />
    </div>
  );
}
