"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Problem } from "@/lib/problems";
import type { ProgressStatus } from "@/lib/db";
import { useIsDarkMode } from "@/lib/theme";
import { StatusDot } from "@/components/StatusDot";
import { Diagram } from "@/components/Diagram";
import { CodeBlock, EDITOR_HEIGHT, MONACO_LANG } from "@/components/CodeBlock";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface ExampleResult {
  exampleIndex: number;
  pass: boolean;
  expected: unknown;
  actual: unknown;
  stdout: string;
  stderr: string;
  error?: string;
}

interface SubmitResponse {
  supported: boolean;
  reason?: string;
  results: ExampleResult[];
  allPassed: boolean;
}

function ResultPanel({ result }: { result: SubmitResponse }) {
  if (!result.supported) {
    return (
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-3 text-sm bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <span className="font-medium">Not runnable: </span>
        {result.reason}
      </div>
    );
  }
  if (result.results.length === 0) {
    return (
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-3 text-sm bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        {result.reason ?? "No example test cases available."}
      </div>
    );
  }
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 p-3 text-sm space-y-2 bg-white dark:bg-zinc-900">
      <div
        className={`font-medium ${
          result.allPassed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {result.allPassed ? "All example tests passed" : "Some example tests failed"}
      </div>
      {result.results.map((r) => (
        <div
          key={r.exampleIndex}
          className={`rounded border p-2 font-mono text-xs ${
            r.pass
              ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          }`}
        >
          <div className={r.pass ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
            Test {r.exampleIndex + 1}: {r.pass ? "PASS" : "FAIL"}
          </div>
          {!r.pass && (
            <>
              <div className="text-zinc-700 dark:text-zinc-300">expected: {JSON.stringify(r.expected)}</div>
              <div className="text-zinc-700 dark:text-zinc-300">actual: {JSON.stringify(r.actual)}</div>
              {r.error && <div className="text-red-600 dark:text-red-400">{r.error}</div>}
              {r.stderr && (
                <div className="text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {r.stderr.slice(0, 500)}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusControl({
  status,
  onChange,
}: {
  status: ProgressStatus;
  onChange: (s: ProgressStatus) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <StatusDot status={status} />
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as ProgressStatus)}
        className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5"
      >
        <option value="unattempted">Unattempted</option>
        <option value="attempted">Attempted</option>
        <option value="solved">Solved</option>
      </select>
    </label>
  );
}

export function ProblemDetail({ problem }: { problem: Problem }) {
  const statementSection =
    problem.sections.find((s) => s.id === problem.problemStatementSectionId) ??
    problem.sections[0];

  const revealSections = problem.sections.filter(
    (s) => s !== statementSection && s.id !== "try-it-yourself"
  );

  const starterLanguages = Object.keys(problem.starterCode);
  const isDark = useIsDarkMode();
  const [revealed, setRevealed] = useState(false);
  const [activeLang, setActiveLang] = useState(starterLanguages[0] ?? "java");
  const [code, setCode] = useState(problem.starterCode[activeLang] ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [status, setStatusState] = useState<ProgressStatus>("unattempted");

  // Restore last-submitted code/language and status on mount, if any is saved.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/progress?id=${encodeURIComponent(problem.id)}`)
      .then((res) => res.json())
      .then((row) => {
        if (cancelled || !row) return;
        setStatusState(row.status);
        if (row.lastCode) {
          setCode(row.lastCode);
          if (row.lastLanguage) setActiveLang(row.lastLanguage);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  function switchLanguage(lang: string) {
    setActiveLang(lang);
    setCode(problem.starterCode[lang] ?? "");
    setResult(null);
  }

  async function updateStatus(newStatus: ProgressStatus) {
    setStatusState(newStatus); // optimistic
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, status: newStatus }),
      });
      const row = await res.json();
      if (row?.status) setStatusState(row.status);
    } catch {
      // keep the optimistic value; not worth surfacing a personal-tool network hiccup
    }
  }

  async function runCode() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: problem.id, language: activeLang, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ supported: false, reason: data.error ?? "Unknown error", results: [], allPassed: false });
      } else {
        setResult(data);
        // /api/submit records the attempt server-side when it produced a
        // pass/fail signal -- re-fetch to pick up the authoritative status
        // (monotonic solved > attempted merge happens server-side).
        if (data.supported && data.results?.length > 0) {
          fetch(`/api/progress?id=${encodeURIComponent(problem.id)}`)
            .then((r) => r.json())
            .then((row) => row && setStatusState(row.status))
            .catch(() => {});
        }
      }
    } catch (e) {
      setResult({ supported: false, reason: (e as Error).message, results: [], allPassed: false });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{problem.title}</h1>
          {problem.difficulty && (
            <span className="text-xs rounded px-2 py-0.5 capitalize bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {problem.difficulty}
            </span>
          )}
          {problem.lessonType === "challenge" && (
            <span className="text-xs rounded px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Challenge
            </span>
          )}
        </div>
        <StatusControl status={status} onChange={updateStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8 items-start">
        <div>
          {statementSection && (
            <>
              <div
                className="lesson-content"
                dangerouslySetInnerHTML={{ __html: statementSection.html }}
              />
              {statementSection.diagrams.map((svg, i) => (
                <Diagram key={i} svg={svg} />
              ))}
            </>
          )}

          {problem.examples.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Examples
              </h3>
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-sm font-mono whitespace-pre-wrap"
                >
                  {ex.input && (
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Input: </span>
                      {ex.input}
                    </div>
                  )}
                  {ex.output && (
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Output: </span>
                      {ex.output}
                    </div>
                  )}
                  {ex.explanation && (
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Explanation: </span>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500 italic">
              No worked examples were extracted for this problem (see the diagrams/solution
              below instead).
            </p>
          )}

          <div className="mt-8">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="rounded-md bg-zinc-900 text-white px-4 py-2 text-sm font-medium hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Reveal Solution
              </button>
            ) : (
              <div>
                <button
                  onClick={() => setRevealed(false)}
                  className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
                >
                  Hide solution
                </button>
                {revealSections.map((s) => (
                  <div key={s.id} className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                    {s.html && (
                      <div
                        className="lesson-content"
                        dangerouslySetInnerHTML={{ __html: s.html }}
                      />
                    )}
                    {s.diagrams.map((svg, i) => (
                      <Diagram key={i} svg={svg} />
                    ))}
                    {Object.keys(s.code).length > 0 && (
                      <CodeBlock code={s.code} isDark={isDark} />
                    )}
                    {Object.keys(s.demoCode).length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Demo</div>
                        <CodeBlock code={s.demoCode} isDark={isDark} />
                      </div>
                    )}
                  </div>
                ))}
                {revealSections.length === 0 && (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
                    No solution content was extracted for this lesson.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2">
              <div className="flex gap-1">
                {starterLanguages.length === 0 && (
                  <span className="text-sm text-zinc-400 dark:text-zinc-500 italic px-2 py-1">
                    No starter code recovered
                  </span>
                )}
                {starterLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => switchLanguage(lang)}
                    className={`px-3 py-1 text-sm rounded ${
                      activeLang === lang
                        ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-medium"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <button
                onClick={runCode}
                disabled={running || starterLanguages.length === 0}
                className="text-sm px-3 py-1 rounded bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                {running ? "Running..." : "Run"}
              </button>
            </div>
            <MonacoEditor
              height={EDITOR_HEIGHT}
              language={MONACO_LANG[activeLang] ?? "plaintext"}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme={isDark ? "vs-dark" : "light"}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
            {result && <ResultPanel result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}
