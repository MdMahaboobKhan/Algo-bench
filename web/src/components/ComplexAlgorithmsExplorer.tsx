"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AI_PROVIDER_STORAGE_KEY,
  getAiProvider,
  type AiProviderId,
} from "@/lib/ai-providers";
import {
  COMPLEX_ALGORITHMS_CACHE_KEY,
  complexAlgorithmSlug,
  fallbackComplexAlgorithms,
  isComplexAlgorithmsCache,
  type ComplexAlgorithm,
  type ComplexAlgorithmsCache,
} from "@/lib/complex-algorithms";

const BEDROCK_REGION_KEY = "algobench:bedrock-region";
const BEDROCK_SECRET_KEY = "algobench:bedrock-secret-access-key";
const BEDROCK_SESSION_TOKEN_KEY = "algobench:bedrock-session-token";

interface AiAlgorithmResponse {
  algorithms: ComplexAlgorithm[];
}

const PAGE_SIZE = 5;

function loadProviderPayload() {
  const provider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)) as ReturnType<typeof getAiProvider> & { id: AiProviderId };
  return {
    provider: provider.id,
    apiKey: window.localStorage.getItem(provider.keyStorageKey) ?? "",
    model: window.localStorage.getItem(provider.modelStorageKey) ?? provider.defaultModel,
    bedrockRegion: window.localStorage.getItem(BEDROCK_REGION_KEY) ?? "us-east-1",
    bedrockSecretAccessKey: window.localStorage.getItem(BEDROCK_SECRET_KEY) ?? "",
    bedrockSessionToken: window.localStorage.getItem(BEDROCK_SESSION_TOKEN_KEY) ?? "",
    providerName: provider.name,
  };
}

function readCachedAlgorithms(): ComplexAlgorithmsCache | null {
  const cached = window.localStorage.getItem(COMPLEX_ALGORITHMS_CACHE_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (isComplexAlgorithmsCache(parsed)) return parsed;
  } catch {
    // Remove malformed cache below.
  }
  window.localStorage.removeItem(COMPLEX_ALGORITHMS_CACHE_KEY);
  return null;
}

function writeCachedAlgorithms(cache: ComplexAlgorithmsCache) {
  window.localStorage.setItem(COMPLEX_ALGORITHMS_CACHE_KEY, JSON.stringify(cache));
}

export function ComplexAlgorithmsExplorer() {
  const [algorithms, setAlgorithms] = useState<ComplexAlgorithm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(algorithms.length / PAGE_SIZE));
  const pageItems = algorithms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function applyCache(cache: ComplexAlgorithmsCache) {
    setAlgorithms(cache.algorithms);
    setPage(1);
  }

  async function generate(refresh = false) {
    if (!refresh) {
      const cached = readCachedAlgorithms();
      if (cached) {
        applyCache(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    const payload = loadProviderPayload();

    if (!payload.apiKey) {
      const cache: ComplexAlgorithmsCache = {
        version: 1,
        source: "examples",
        generatedAt: new Date().toISOString(),
        algorithms: fallbackComplexAlgorithms(),
      };
      applyCache(cache);
      writeCachedAlgorithms(cache);
      setError(`Add ${payload.providerName} credentials in Settings to generate fresh AI-curated algorithms. Showing examples for now.`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/complex-algorithms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: AiAlgorithmResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate algorithms");
      const cache: ComplexAlgorithmsCache = {
        version: 1,
        source: "ai",
        generatedAt: new Date().toISOString(),
        algorithms: data.algorithms,
      };
      applyCache(cache);
      writeCachedAlgorithms(cache);
    } catch (e) {
      const message = (e as Error).message;
      setError(
        message.includes("JSON") || message.includes("json") || message.includes("Expected") || message.includes("position")
          ? "The AI returned malformed JSON, so the current cached list was kept. Click Refresh to try again."
          : message
      );
      if (algorithms.length === 0) {
        const cache: ComplexAlgorithmsCache = {
          version: 1,
          source: "examples",
          generatedAt: new Date().toISOString(),
          algorithms: fallbackComplexAlgorithms(),
        };
        applyCache(cache);
        writeCachedAlgorithms(cache);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => generate(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Distributed systems algorithms
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Complex Engineering Algorithms</h1>
          <p className="mt-4 max-w-3xl text-zinc-600 dark:text-zinc-300">
            Heavy-hitter algorithms, protocols, data structures, and indexing techniques behind Kafka-style logs, Dynamo-style stores, databases, maps, caches, and global-scale services.
          </p>
        </div>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          {loading ? "Generating..." : "Refresh algorithms"}
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        AI-generated algorithm list. Cached locally so it is not regenerated on every page load. Refresh replaces the list with new AI-curated algorithms.
        {error && <div className="mt-2 text-amber-600 dark:text-amber-400">{error}</div>}
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing {algorithms.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, algorithms.length)} of {algorithms.length} algorithms
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

      <div className="space-y-4">
        {pageItems.map((algorithm, index) => {
          const absoluteIndex = (page - 1) * PAGE_SIZE + index + 1;
          return (
          <Link
            key={algorithm.title}
            href={`/system-design/complex-engineering-algorithms/${complexAlgorithmSlug(algorithm)}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Algorithm #{absoluteIndex}
                </div>
                <h2 className="mt-3 text-xl font-semibold">{algorithm.title}</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{algorithm.body}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                Open →
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold">Core ideas</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                {algorithm.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </div>
          </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
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
      )}
    </div>
  );
}
