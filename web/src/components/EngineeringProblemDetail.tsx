"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AI_PROVIDER_STORAGE_KEY,
  getAiProvider,
} from "@/lib/ai-providers";
import {
  ENGINEERING_PROBLEMS_CACHE_KEY,
  ENGINEERING_PROBLEMS_SESSION_KEY,
  engineeringProblemSlug,
  fallbackEngineeringProblems,
  isEngineeringProblemArray,
  isEngineeringProblemsCache,
  type EngineeringProblem,
} from "@/lib/engineering-problems";
import { MarkdownView } from "@/components/TopicExplanation";

const BEDROCK_REGION_KEY = "algobench:bedrock-region";
const BEDROCK_SECRET_KEY = "algobench:bedrock-secret-access-key";
const BEDROCK_SESSION_TOKEN_KEY = "algobench:bedrock-session-token";

type ChatMessage = { role: "user" | "assistant"; content: string };

function loadProblems(): EngineeringProblem[] {
  const localCache = localStorage.getItem(ENGINEERING_PROBLEMS_CACHE_KEY);
  if (localCache) {
    try {
      const parsed = JSON.parse(localCache);
      if (isEngineeringProblemsCache(parsed)) {
        sessionStorage.setItem(ENGINEERING_PROBLEMS_SESSION_KEY, JSON.stringify(parsed.problems));
        return parsed.problems;
      }
    } catch {
      localStorage.removeItem(ENGINEERING_PROBLEMS_CACHE_KEY);
    }
  }

  const cached = sessionStorage.getItem(ENGINEERING_PROBLEMS_SESSION_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (isEngineeringProblemArray(parsed)) return parsed;
    } catch {
      sessionStorage.removeItem(ENGINEERING_PROBLEMS_SESSION_KEY);
    }
  }
  const fallback = fallbackEngineeringProblems();
  sessionStorage.setItem(ENGINEERING_PROBLEMS_SESSION_KEY, JSON.stringify(fallback));
  return fallback;
}

function fallbackExplanation(problem: EngineeringProblem): string {
  return `## What this case is about
${problem.scenario}

## Why it is hard
${problem.whyHard}

## Core architecture ideas
${problem.coreIdeas.map((idea) => `- ${idea}`).join("\n")}

## Interview prompt
${problem.interviewPrompt}

## Deep-dive questions
${problem.deepDiveQuestions.map((q) => `- ${q}`).join("\n")}`;
}

function providerPayload() {
  const provider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
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

export function EngineeringProblemDetail({ caseSlug }: { caseSlug: string }) {
  const [problem, setProblem] = useState<EngineeringProblem | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const explanationKey = problem ? `algobench:engineering-case-explanation:${engineeringProblemSlug(problem)}` : "";
  const chatKey = problem ? `algobench:engineering-case-chat:${engineeringProblemSlug(problem)}` : "";
  const fallback = useMemo(() => (problem ? fallbackExplanation(problem) : ""), [problem]);

  useEffect(() => {
    queueMicrotask(() => {
      const found = loadProblems().find((entry) => engineeringProblemSlug(entry) === caseSlug) ?? null;
      setProblem(found);
      if (found) {
        const key = `algobench:engineering-case-explanation:${engineeringProblemSlug(found)}`;
        setText(sessionStorage.getItem(key) ?? fallbackExplanation(found));
        const savedChat = sessionStorage.getItem(`algobench:engineering-case-chat:${engineeringProblemSlug(found)}`);
        if (savedChat) {
          try {
            setChatMessages(JSON.parse(savedChat));
          } catch {
            sessionStorage.removeItem(`algobench:engineering-case-chat:${engineeringProblemSlug(found)}`);
          }
        }
      }
    });
  }, [caseSlug]);

  useEffect(() => {
    if (chatKey) sessionStorage.setItem(chatKey, JSON.stringify(chatMessages));
  }, [chatKey, chatMessages]);

  async function generateExplanation() {
    if (!problem) return;
    const payload = providerPayload();
    if (!payload.apiKey) {
      setError(`Add ${payload.providerName} credentials in Settings to generate a detailed case study.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          topic: problem.title,
          category: `Engineering case study: ${problem.company}`,
          context: `${problem.scenario}\nWhy hard: ${problem.whyHard}\nInterview prompt: ${problem.interviewPrompt}`,
          bullets: [...problem.coreIdeas, ...problem.deepDiveQuestions],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate explanation");
      setText(data.text);
      sessionStorage.setItem(explanationKey, data.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendChat() {
    if (!problem || !chatInput.trim()) return;
    const payload = providerPayload();
    if (!payload.apiKey) {
      setChatError(`Add ${payload.providerName} credentials in Settings to ask follow-up questions.`);
      return;
    }
    const nextMessages = [...chatMessages, { role: "user" as const, content: chatInput.trim() }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          topic: problem.title,
          category: `Engineering case study: ${problem.company}`,
          context: `${problem.scenario}\nWhy hard: ${problem.whyHard}\nPrompt: ${problem.interviewPrompt}`,
          bullets: [...problem.coreIdeas, ...problem.deepDiveQuestions],
          explanation: text,
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setChatMessages([...nextMessages, { role: "assistant", content: data.text }]);
    } catch (e) {
      setChatError((e as Error).message);
      setChatMessages(chatMessages);
    } finally {
      setChatLoading(false);
    }
  }

  if (!problem) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Link href="/system-design/engineering-problems" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          &larr; Engineering problems
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Case not found</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Refresh the engineering problems page to generate a session list.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Link href="/system-design/engineering-problems" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        &larr; Engineering problems
      </Link>
      <div className="mt-4 grid gap-8 xl:grid-cols-[minmax(0,48rem)_1fr]">
        <article className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {problem.company}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{problem.title}</h1>
          <p className="mt-4 text-zinc-600 dark:text-zinc-300">{problem.scenario}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {problem.coreIdeas.map((idea) => (
              <span key={idea} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {idea}
              </span>
            ))}
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <MarkdownView text={text || fallback} />
          </div>
        </article>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">AI case explanation</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Generate a deeper breakdown of architecture, tradeoffs, APIs, data model, scale, failure modes, and interview talking points.
            </p>
            <button
              onClick={generateExplanation}
              disabled={loading}
              className="mt-4 w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              {loading ? "Generating..." : "Generate detailed case study"}
            </button>
            {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold">Case chat</h2>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  Ask: “Design the APIs”, “What database would you use?”, or “What are the failure modes?”
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`rounded-xl p-3 text-sm ${message.role === "user" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"}`}>
                    {message.role === "assistant" ? <MarkdownView text={message.content} /> : message.content}
                  </div>
                ))
              )}
              {chatLoading && <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">Thinking...</div>}
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a follow-up..."
              className="mt-4 min-h-24 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="mt-2 w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              {chatLoading ? "Asking..." : "Ask follow-up"}
            </button>
            {chatError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{chatError}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
