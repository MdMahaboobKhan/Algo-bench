"use client";

import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  AI_ENABLED_STORAGE_KEY,
  AI_PROVIDER_STORAGE_KEY,
  getAiProvider,
} from "@/lib/ai-providers";
import type { LearningResource } from "@/lib/prep-hub";
import { learningItemSlug } from "@/lib/prep-hub";
import { useIsDarkMode } from "@/lib/theme";

const BEDROCK_REGION_KEY = "algobench:bedrock-region";
const BEDROCK_SECRET_KEY = "algobench:bedrock-secret-access-key";
const BEDROCK_SESSION_TOKEN_KEY = "algobench:bedrock-session-token";

type LearningItem = LearningResource["items"][number];
type ChatMessage = { role: "user" | "assistant"; content: string };

function fallbackMarkdown(resource: LearningResource, item: LearningItem): string {
  return `## What it is
${item.body}

## Why it matters
${item.title} is one of the practical building blocks behind ${resource.title.toLowerCase()}. It shows up when systems need correctness, scale, or low operational cost under real production constraints.

## Core ideas
${item.bullets.map((b) => `- ${b}`).join("\n")}

## How to explain it in an interview
Start with the problem it solves, then describe the key mechanism, the tradeoffs, and where it breaks down. A strong answer should connect the concept to concrete systems rather than only defining it academically.

## Things to watch for
- What assumptions does it make about failures, ordering, or data distribution?
- What does it optimize: latency, availability, correctness, cost, or operability?
- What metrics would prove it is working in production?
- What are the common edge cases and failure modes?`;
}

function normalizeMarkdown(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\$\\?rightarrow\$/g, "→")
    .replace(/\\rightarrow/g, "→");
}

function InlineText({ text }: { text: string }) {
  const parts: Array<{ type: "text" | "code" | "strong" | "em"; value: string }> = [];
  let remaining = text;

  while (remaining) {
    const codeStart = remaining.indexOf("`");
    const strongStart = remaining.indexOf("**");
    const emStart = remaining.search(/(^|\s)\*[^*\s]/);
    const candidates = [
      codeStart >= 0 ? { type: "code" as const, index: codeStart } : null,
      strongStart >= 0 ? { type: "strong" as const, index: strongStart } : null,
      emStart >= 0 ? { type: "em" as const, index: emStart + (remaining[emStart] === " " ? 1 : 0) } : null,
    ].filter(Boolean) as Array<{ type: "code" | "strong" | "em"; index: number }>;

    const next = candidates.sort((a, b) => a.index - b.index)[0];
    if (!next) {
      parts.push({ type: "text", value: remaining });
      break;
    }

    if (next.index > 0) parts.push({ type: "text", value: remaining.slice(0, next.index) });
    const source = remaining.slice(next.index);

    if (next.type === "code") {
      const end = source.indexOf("`", 1);
      if (end < 0) {
        parts.push({ type: "text", value: source });
        break;
      }
      parts.push({ type: "code", value: source.slice(1, end) });
      remaining = source.slice(end + 1);
      continue;
    }

    if (next.type === "strong") {
      const end = source.indexOf("**", 2);
      if (end < 0) {
        parts.push({ type: "text", value: source });
        break;
      }
      parts.push({ type: "strong", value: source.slice(2, end) });
      remaining = source.slice(end + 2);
      continue;
    }

    const end = source.indexOf("*", 1);
    if (end < 0) {
      parts.push({ type: "text", value: source });
      break;
    }
    parts.push({ type: "em", value: source.slice(1, end) });
    remaining = source.slice(end + 1);
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "strong") {
          return <strong key={index} className="font-semibold text-zinc-900 dark:text-zinc-100">{part.value}</strong>;
        }
        if (part.type === "em") {
          return <em key={index} className="italic text-zinc-900 dark:text-zinc-100">{part.value}</em>;
        }
        if (part.type === "code") {
          return (
            <code key={index} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm dark:bg-zinc-800">
              {part.value}
            </code>
          );
        }
        return part.value;
      })}
    </>
  );
}

function isTableStart(lines: string[], index: number): boolean {
  return (
    lines[index]?.includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "")
  );
}

function renderTable(lines: string[], key: number) {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  const [head, , ...body] = rows;
  return (
    <div key={key} className="max-w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-950">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-3 py-2 font-semibold"><InlineText text={cell} /></th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-zinc-700 dark:text-zinc-200"><InlineText text={cell} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function normalizeFenceLanguage(raw: string): string {
  const lang = raw.trim().replace(/^```/, "").trim().toLowerCase();
  if (!lang) return "text";
  if (["js", "jsx", "node"].includes(lang)) return "javascript";
  if (["ts", "tsx"].includes(lang)) return "typescript";
  if (["py", "python"].includes(lang)) return "python";
  if (["c++", "cc", "cxx"].includes(lang)) return "cpp";
  if (["sh", "shell", "bash", "zsh"].includes(lang)) return "shell";
  if (["txt", "plaintext", "plain", "text"].includes(lang)) return "text";
  return lang;
}

function codeBlockHeight(lineCount: number): string {
  const px = Math.min(560, Math.max(180, lineCount * 22 + 64));
  return `${px}px`;
}

export function MarkdownView({ text }: { text: string }) {
  const isDark = useIsDarkMode();
  const lines = normalizeMarkdown(text).split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={blocks.length} className="my-6 border-zinc-200 dark:border-zinc-800" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = normalizeFenceLanguage(trimmed);
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (language === "mermaid") {
        blocks.push(<MermaidDiagram key={blocks.length} chart={code.join("\n")} />);
        continue;
      }
      blocks.push(
        <CodeBlock
          key={blocks.length}
          code={{ [language]: code.join("\n") }}
          isDark={isDark}
          height={codeBlockHeight(code.length)}
        />
      );
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        tableLines.push(lines[i]);
        i += 1;
      }
      blocks.push(renderTable(tableLines, blocks.length));
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length ?? 2;
      const content = trimmed.replace(/^#{1,6}\s+/, "");
      if (level === 1) blocks.push(<h1 key={blocks.length} className="pt-5 text-2xl font-semibold"><InlineText text={content} /></h1>);
      else if (level === 2) blocks.push(<h2 key={blocks.length} className="pt-5 text-xl font-semibold"><InlineText text={content} /></h2>);
      else if (level === 3) blocks.push(<h3 key={blocks.length} className="pt-3 text-lg font-semibold"><InlineText text={content} /></h3>);
      else blocks.push(<h4 key={blocks.length} className="pt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100"><InlineText text={content} /></h4>);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={blocks.length} className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-zinc-700 dark:text-zinc-200">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              <span><InlineText text={item} /></span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={blocks.length} className="list-decimal space-y-2 pl-5 text-zinc-700 dark:text-zinc-200">
          {items.map((item) => <li key={item}><InlineText text={item} /></li>)}
        </ol>
      );
      continue;
    }

    const paragraph = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !isTableStart(lines, i) &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(<p key={blocks.length} className="leading-7 text-zinc-700 dark:text-zinc-200"><InlineText text={paragraph.join(" ")} /></p>);
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      {blocks}
    </div>
  );
}

export function TopicExplanation({ resource, item }: { resource: LearningResource; item: LearningItem }) {
  const itemSlug = item.slug ?? learningItemSlug(item.title);
  const cacheKey = `algobench:ai-explanation:${resource.slug}:${itemSlug}`;
  const chatCacheKey = `algobench:topic-chat:${resource.slug}:${itemSlug}`;
  const fallback = useMemo(() => fallbackMarkdown(resource, item), [resource, item]);
  const [text, setText] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [cached, setCached] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  async function generate() {
    const provider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
    const apiKey = window.localStorage.getItem(provider.keyStorageKey) ?? "";
    const model = window.localStorage.getItem(provider.modelStorageKey) ?? provider.defaultModel;
    if (!apiKey) {
      setHasKey(false);
      setError(`Add your ${provider.name} credentials in Settings to generate an AI explanation.`);
      return;
    }
    setHasKey(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          provider: provider.id,
          bedrockRegion: window.localStorage.getItem(BEDROCK_REGION_KEY) ?? "us-east-1",
          bedrockSecretAccessKey: window.localStorage.getItem(BEDROCK_SECRET_KEY) ?? "",
          bedrockSessionToken: window.localStorage.getItem(BEDROCK_SESSION_TOKEN_KEY) ?? "",
          topic: item.title,
          category: resource.title,
          context: item.body,
          bullets: item.bullets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI generation failed");
      setText(data.text);
      window.localStorage.setItem(cacheKey, data.text);
      setCached(true);
      if (data.truncated) {
        setError("The provider stopped because it hit the output limit. Click Generate again to replace this partial response.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const cached = window.localStorage.getItem(cacheKey);
      const cachedChat = window.localStorage.getItem(chatCacheKey);
      const provider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
      const apiKey = window.localStorage.getItem(provider.keyStorageKey) ?? "";
      const enabled = window.localStorage.getItem(AI_ENABLED_STORAGE_KEY);
      setHasKey(Boolean(apiKey));
      if (cachedChat) {
        try {
          setChatMessages(JSON.parse(cachedChat));
        } catch {
          window.localStorage.removeItem(chatCacheKey);
        }
      }
      if (cached) {
        setText(cached);
        setCached(true);
        return;
      }
      if (apiKey && enabled !== "false") {
        generate();
      }
    });
    return () => {
      cancelled = true;
    };
    // generate reads localStorage and current props; intentionally only on topic change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, chatCacheKey]);

  useEffect(() => {
    window.localStorage.setItem(chatCacheKey, JSON.stringify(chatMessages));
  }, [chatCacheKey, chatMessages]);

  async function sendChat() {
    const question = chatInput.trim();
    if (!question || chatLoading) return;

    const provider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
    const apiKey = window.localStorage.getItem(provider.keyStorageKey) ?? "";
    const model = window.localStorage.getItem(provider.modelStorageKey) ?? provider.defaultModel;
    if (!apiKey) {
      setHasKey(false);
      setChatError(`Add your ${provider.name} credentials in Settings to ask follow-up questions.`);
      return;
    }

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: question }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          model,
          provider: provider.id,
          bedrockRegion: window.localStorage.getItem(BEDROCK_REGION_KEY) ?? "us-east-1",
          bedrockSecretAccessKey: window.localStorage.getItem(BEDROCK_SECRET_KEY) ?? "",
          bedrockSessionToken: window.localStorage.getItem(BEDROCK_SESSION_TOKEN_KEY) ?? "",
          topic: item.title,
          category: resource.title,
          context: item.body,
          bullets: item.bullets,
          explanation: text,
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat request failed");
      setChatMessages([...nextMessages, { role: "assistant", content: data.text }]);
      if (data.truncated) setChatError("The provider hit the chat output limit. Ask a narrower follow-up if needed.");
    } catch (e) {
      setChatError((e as Error).message);
      setChatMessages(chatMessages);
    } finally {
      setChatLoading(false);
    }
  }

  function clearChat() {
    setChatMessages([]);
    window.localStorage.removeItem(chatCacheKey);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,48rem)_1fr]">
      <article className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {resource.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">{item.title}</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-300">{item.body}</p>
        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <MarkdownView text={text} />
        </div>
      </article>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">AI explanation</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {hasKey
              ? cached
                ? "Loaded from browser cache for this topic. Regenerate only if you want to replace it."
                : "Your selected AI provider can generate a deeper explanation for this exact topic. Cached locally after generation."
              : "Add AI provider credentials in Settings, then generate a detailed explanation here."}
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="mt-4 w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
          >
            {loading ? "Generating..." : "Generate with AI"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Topic chat</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Ask follow-up questions for this topic. Chat is cached locally per topic.
              </p>
            </div>
            {chatMessages.length > 0 && (
              <button
                onClick={clearChat}
                className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
            {chatMessages.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                Try: “Give me interview follow-ups”, “Explain with an example”, or “What are common mistakes?”
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-3 text-sm ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-50 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownView text={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                Thinking...
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendChat();
              }}
              placeholder="Ask a follow-up question..."
              className="min-h-24 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              {chatLoading ? "Asking..." : "Ask follow-up"}
            </button>
            {chatError && <p className="text-sm text-red-600 dark:text-red-400">{chatError}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">Seed concepts</h2>
          <ul className="mt-3 space-y-2">
            {item.bullets.map((bullet) => (
              <li key={bullet} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                {bullet}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
