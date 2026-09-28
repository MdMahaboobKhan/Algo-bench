"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// Shared with the editable scratchpad in ProblemDetail so both panels present
// at the same size. Viewport-relative (not a flat px value) so it actually
// reads as "big" on real screens instead of being dwarfed by everything else
// on the page.
export const EDITOR_HEIGHT = "min(82vh, 950px)";

export const MONACO_LANG: Record<string, string> = {
  java: "java",
  python3: "python",
  javascript: "javascript",
  cpp: "cpp",
};

/** Read-only, syntax-highlighted, multi-language code viewer (Monaco) --
 * used for solution code and pattern-intro example code. Not a plain <pre>
 * so it gets the same syntax highlighting, indentation rendering, and panel
 * size as the editable scratchpad.
 *
 * `height` defaults to the full scratchpad-matching size (right for a
 * problem's solution reveal), but callers showing a short illustrative
 * snippet in a lighter context (e.g. a pattern's intro) should pass a
 * smaller value -- a near-viewport-height editor embedded in an "overview"
 * blurb reads as broken/heavy, not clean. */
export function CodeBlock({
  code,
  isDark,
  height = EDITOR_HEIGHT,
}: {
  code: Record<string, string>;
  isDark: boolean;
  height?: string;
}) {
  const languages = Object.keys(code);
  const [active, setActive] = useState(languages[0]);
  if (languages.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden my-4">
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 pt-2">
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => setActive(lang)}
            className={`px-3 py-1.5 text-sm rounded-t ${
              active === lang
                ? "bg-white dark:bg-zinc-900 border border-b-0 border-zinc-200 dark:border-zinc-700 font-medium"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
      <MonacoEditor
        height={height}
        language={MONACO_LANG[active] ?? active}
        value={code[active]}
        theme={isDark ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
