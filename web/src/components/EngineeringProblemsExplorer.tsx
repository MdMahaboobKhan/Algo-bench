"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AI_PROVIDER_STORAGE_KEY,
  getAiProvider,
  type AiProviderId,
} from "@/lib/ai-providers";
import {
  ENGINEERING_PROBLEMS_CACHE_KEY,
  ENGINEERING_PROBLEMS_SESSION_KEY,
  engineeringProblemSlug,
  fallbackEngineeringProblems,
  isEngineeringProblemArray,
  isEngineeringProblemsCache,
  type EngineeringProblem,
  type EngineeringProblemsCache,
} from "@/lib/engineering-problems";

const BEDROCK_REGION_KEY = "algobench:bedrock-region";
const BEDROCK_SECRET_KEY = "algobench:bedrock-secret-access-key";
const BEDROCK_SESSION_TOKEN_KEY = "algobench:bedrock-session-token";

interface AiProblemResponse {
  problems: EngineeringProblem[];
}

function readCachedProblems(): EngineeringProblemsCache | null {
  const storedCache = window.localStorage.getItem(ENGINEERING_PROBLEMS_CACHE_KEY);
  if (storedCache) {
    try {
      const parsed = JSON.parse(storedCache);
      if (isEngineeringProblemsCache(parsed)) return parsed;
    } catch {
      // Remove malformed cache below.
    }
    window.localStorage.removeItem(ENGINEERING_PROBLEMS_CACHE_KEY);
  }

  const legacySessionCache = window.sessionStorage.getItem(ENGINEERING_PROBLEMS_SESSION_KEY);
  if (legacySessionCache) {
    try {
      const parsed = JSON.parse(legacySessionCache);
      if (isEngineeringProblemArray(parsed)) {
        const cache: EngineeringProblemsCache = {
          version: 1,
          source: "ai",
          providerName: "Legacy cached list",
          generatedAt: new Date().toISOString(),
          problems: parsed,
        };
        window.localStorage.setItem(ENGINEERING_PROBLEMS_CACHE_KEY, JSON.stringify(cache));
        return cache;
      }
    } catch {
      // Remove malformed cache below.
    }
    window.sessionStorage.removeItem(ENGINEERING_PROBLEMS_SESSION_KEY);
  }

  return null;
}

function writeCachedProblems(cache: EngineeringProblemsCache) {
  window.localStorage.setItem(ENGINEERING_PROBLEMS_CACHE_KEY, JSON.stringify(cache));
  window.sessionStorage.setItem(ENGINEERING_PROBLEMS_SESSION_KEY, JSON.stringify(cache.problems));
}

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

export function EngineeringProblemsExplorer() {
  const [problems, setProblems] = useState<EngineeringProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyCache(cache: EngineeringProblemsCache) {
    setProblems(cache.problems);
  }

  async function generate(refresh = false) {
    if (!refresh) {
      const cached = readCachedProblems();
      if (cached) {
        applyCache(cached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    const payload = loadProviderPayload();

    if (!payload.apiKey) {
      const fallback = fallbackEngineeringProblems();
      const cache: EngineeringProblemsCache = {
        version: 1,
        source: "examples",
        providerId: payload.provider,
        providerName: "Built-in examples",
        generatedAt: new Date().toISOString(),
        problems: fallback,
      };
      applyCache(cache);
      writeCachedProblems(cache);
      setError(`Add ${payload.providerName} credentials in Settings to generate fresh AI-curated problems. Showing examples for now.`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/ai/engineering-problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: AiProblemResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate engineering problems");
      const cache: EngineeringProblemsCache = {
        version: 1,
        source: "ai",
        providerId: payload.provider,
        providerName: payload.providerName,
        model: payload.model,
        generatedAt: new Date().toISOString(),
        problems: data.problems,
      };
      applyCache(cache);
      writeCachedProblems(cache);
      if (refresh) setError(null);
    } catch (e) {
      const message = (e as Error).message;
      setError(
        message.includes("JSON") || message.includes("json") || message.includes("Expected") || message.includes("position")
          ? "The AI returned malformed JSON, so the current cached list was kept. Click Refresh to try again."
          : message
      );
      if (problems.length === 0) {
        const fallback = fallbackEngineeringProblems();
        const cache: EngineeringProblemsCache = {
          version: 1,
          source: "examples",
          providerName: "Built-in examples",
          generatedAt: new Date().toISOString(),
          problems: fallback,
        };
        applyCache(cache);
        writeCachedProblems(cache);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      const cached = readCachedProblems();
      if (cached) {
        applyCache(cached);
        return;
      }
      generate(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            AI-curated case studies
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Interesting Engineering Problems</h1>
          <p className="mt-4 max-w-3xl text-zinc-600 dark:text-zinc-300">
            Real-world product engineering case studies from companies like Uber, Stripe, DoorDash, Databricks, Snowflake, Netflix, Cloudflare, and more. The list is generated once and reused from local cache until you refresh it.
          </p>
        </div>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          {loading ? "Generating..." : "Refresh problems"}
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        AI-generated problem list. Cached locally so it is not regenerated on every page load. Refresh replaces the list with new AI-curated problems.
        {error && <div className="mt-2 text-amber-600 dark:text-amber-400">{error}</div>}
      </div>

      <div className="space-y-4">
        {problems.map((problem, index) => (
          <Link
            key={`${problem.company}-${problem.title}-${index}`}
            href={`/system-design/engineering-problems/${engineeringProblemSlug(problem)}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {problem.company}
                </div>
                <h2 className="mt-3 text-xl font-semibold">{problem.title}</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{problem.scenario}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                Case #{index + 1} · Open →
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <h3 className="text-sm font-semibold">Why it is hard</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{problem.whyHard}</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                <h3 className="text-sm font-semibold">Interview prompt</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{problem.interviewPrompt}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {problem.coreIdeas.map((idea) => (
                <span key={idea} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {idea}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold">Deep-dive questions</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                {problem.deepDiveQuestions.map((question) => (
                  <li key={question}>• {question}</li>
                ))}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
