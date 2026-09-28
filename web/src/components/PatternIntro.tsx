"use client";

import type { PatternIntro as PatternIntroData } from "@/lib/problems";
import { useIsDarkMode } from "@/lib/theme";
import { Diagram } from "@/components/Diagram";
import { CodeBlock } from "@/components/CodeBlock";

// Compact, not the full scratchpad-matching height -- this is a short
// illustrative snippet inside an overview blurb, not a solution reveal.
const INTRO_CODE_HEIGHT = "320px";

/** Renders a pattern's own "Introduction" lesson (prose + diagrams + example
 * code) above its problem list -- an overview of what the pattern is and how
 * to approach problems with it, straight from the source course.
 *
 * `previewDiagram`, if given, is featured right under the heading as a lead
 * "here's what this looks like" visual before the prose -- most pattern
 * intros in the source don't have a diagram of their own, so this is
 * usually backfilled from the pattern's own problems (see
 * getPatternPreviewDiagram). If it happens to be one of the diagrams already
 * present in `intro.sections`, it's skipped there to avoid showing it twice.
 */
export function PatternIntro({
  intro,
  previewDiagram,
}: {
  intro: PatternIntroData;
  previewDiagram?: string | null;
}) {
  const isDark = useIsDarkMode();
  return (
    <div
      id="introduction"
      className="mb-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 scroll-mt-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">
        Introduction
      </h2>
      {previewDiagram && <Diagram svg={previewDiagram} />}
      {intro.sections.map((s, i) => (
        <div key={i} className={i > 0 ? "mt-6" : undefined}>
          {s.title && <h3 className="text-lg font-semibold mb-2">{s.title}</h3>}
          {s.html && <div className="lesson-content" dangerouslySetInnerHTML={{ __html: s.html }} />}
          {s.diagrams
            .filter((svg) => svg !== previewDiagram)
            .map((svg, j) => (
              <Diagram key={j} svg={svg} />
            ))}
          {Object.keys(s.code).length > 0 && (
            <CodeBlock code={s.code} isDark={isDark} height={INTRO_CODE_HEIGHT} />
          )}
        </div>
      ))}
    </div>
  );
}
