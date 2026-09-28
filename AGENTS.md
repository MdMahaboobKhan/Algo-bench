# AGENTS.md

Orientation for an agent or developer picking up this repo cold. For running
the already-built site, read `README.md` first — this file is the deep
reference: architecture, the judge, conventions, and known limitations.
These are the only two markdown files in this repo that matter.

## What this is, in one paragraph

AlgoBench is a personal, single-user LeetCode-style practice site: 121
problems across 17 patterns, each with a pattern overview, a problem
statement, a Monaco code editor, a "Reveal Solution" panel, and a local
(no-Docker) code judge that runs submissions against each problem's example
test cases, plus SQLite-backed progress tracking. There is no public
deployment and no remote git — this is local-only, personal tooling.

## Repository layout

```
data/       All site content (committed): data/problems/<pattern>/<problem>.json,
            data/patterns/<pattern>.json, data/patterns.json, data/manifest.json.
web/        The Next.js app (the product), including the judge
            (web/src/lib/judge/).
```

## Data flow (read this before changing anything)

```
data/**/*.json  (committed; the site's entire content)
   ├─ patterns.json          pattern index: name/slug/problemCount/short description/hasIntro
   ├─ manifest.json          flat list of all problems (for nav/sidebar)
   ├─ problems/<pattern>/    one JSON per problem (statement, solutions, examples)
   └─ patterns/<pattern>.json  one JSON per pattern's overview/intro content
        │  fs.readFileSync at build/request time (web/src/lib/problems.ts)
        ▼
web/  Next.js app
        │
        ├─ static content (patterns, problem statements, solutions, diagrams)
        │  read straight from data/ -- these pages are statically generated
        │
        ├─ judge (web/src/lib/judge/) -- POST /api/submit runs user code as a
        │  local subprocess against a problem's example test cases
        │
        └─ progress (web/src/lib/db.ts) -- SQLite at web/.data/progress.db
           (gitignored, per-machine runtime state, NOT site content)
```

**Don't hand-edit files under `data/`.** It needs to stay internally
consistent (ids referenced from `manifest.json` must exist as files, schema
shapes must match what `web/src/lib/problems.ts` expects) — if something in
it looks wrong, fix it properly rather than patching JSON by hand.

Symmetrically: `web/.data/progress.db` is per-user runtime state, not site
content. Never conflate the two, and never commit the `.db` file (it's
gitignored).

**Gotcha hit more than once**: `web/src/lib/problems.ts` module-caches
`patterns.json`/`manifest.json`/pattern-intro/problem reads in plain
module-level variables (`Map`s or `| null` singletons) that only populate
once per server process. If `data/` changes on disk while the dev server is
already running, it keeps serving the old in-memory copy — restart the dev
server (`Ctrl-C`, `npm run dev` again) to pick up the change.

## Data schema

### Per-problem (`data/problems/<pattern>/<problem>.json`)

```jsonc
{
  "id": "two-pointers/pair-with-target-sum",
  "pattern": { "index": 3, "name": "Two Pointers", "slug": "two-pointers" },
  "title": "Pair with Target Sum",
  "difficulty": "easy",              // easy | medium | hard | null
  "lessonType": "problem",           // problem | challenge
  "problemStatementSectionId": "problem-statement",
  "starterCode": { "java": "...", "python3": "...", "cpp": "...", "javascript": "..." },
  "examples": [
    { "raw": "Input: [1, 2, 3, 4, 6], target=6\nOutput: [1, 3]\nExplanation: ...",
      "input": "[1, 2, 3, 4, 6], target=6", "output": "[1, 3]", "explanation": "..." }
  ],
  "sections": [
    {
      "id": "problem-statement",       // varies: "solution", "code", "code-2",
      "title": "Problem Statement",    // "basic-solution", "time-and-space-complexity", etc.
      "html": "<p>...</p>",             // prose HTML (p/ul/ol/blockquote/pre)
      "code": {},                      // per-language tabbed code widget(s) in this section
      "demoCode": {},                  // non-tabbed decorative snippets (e.g. a C# demo)
      "diagrams": ["<svg ...>...</svg>"]
    }
    // ...one entry per heading, in document order -- not a fixed template;
    // DP-pattern problems have 3 separate solution-approach sections instead
    // of a fixed "solution"/"code" pair, for example.
  ]
}
```

Not every problem has every language in `starterCode`/section `code` — the
frontend only renders whichever languages are actually present. `examples`
can be an empty array (tree/linked-list problems show examples as diagrams
instead; DP problems describe them in prose) — handle the empty state,
don't assume at least one example exists.

`lessonType: "challenge"` problems get their real display title from their
own content; a couple of quirks in that derivation are documented inline in
`web/src/lib/problems.ts` and are not relevant to how the site consumes the
data.

### Pattern overview (`data/patterns/<slug>.json`)

Same `sections` shape as a problem, minus problem-only fields (no
`starterCode`/`examples`/`difficulty`). Rendered on `/patterns/[slug]` above
the problem list. **Display-only — never counted toward `problemCount`,
never reaches the judge or the sidebar's problem list.** Not every pattern
has one; `data/patterns.json`'s `hasIntro: true/false` per entry tells the
frontend whether to show the sidebar's "Introduction" nav item. When a
pattern's own overview has no diagram, the frontend backfills a
representative one from that pattern's own problems
(`getPatternPreviewDiagram` in `problems.ts`).

## The judge (`web/src/lib/judge/`)

Local, non-containerized (no Docker/Judge0 — unavailable on this machine).
Submissions run as real subprocesses (`javac`/`java`, `g++`, `python3`,
`node`) with a timeout, no other sandboxing — an accepted tradeoff for a
personal tool running only your own practice code. Don't reintroduce a
Docker/Judge0 dependency without discussing it first.

**Coverage**: of the 121 problems, **78 (64%) are judgeable** — their target
method's parameters/return type are representable as plain
numbers/strings/booleans and 1D/2D arrays or lists of those (see
`signature.ts: classifyProblemSupport`). The remaining 43 need a custom type
this judge doesn't construct from free-text examples (`ListNode`,
`TreeNode`, `Interval`, `ArrayReader`, stateful class APIs like a streaming
constructor+`add()`, or a few lessons with no interactive starter code at
all). `/api/submit` on an unsupported problem returns `{ supported: false,
reason: "..." }` rather than attempting (and mis-executing) a harness.

**How a submission is judged**:

1. `signature.ts` locates the target method by its **known name**, derived
   once from that problem's *starter* code (which always has a `TODO`
   marker) — not from the user's actual submission, since a real solution
   won't contain that marker. `findSignatureByName` re-locates the same
   method in whatever the user submits.
2. `binder.ts` reconciles each example's free-text `Input:`/`Output:`
   strings against the declared parameter list — named segments bind to the
   same/fuzzy-matching param name first (prose order isn't always the
   declared param order), with fallback heuristics for recurring quirks.
3. `codegen/*.ts` generates a small per-language harness that constructs
   those literal arguments in the target language's own syntax, calls the
   method, prints the result as JSON with a unique marker prefix (so a
   submission's own demo `main()`/`console.log` output isn't mistaken for
   the answer).
4. `runner.ts` compiles (if needed) and executes with a timeout; `submit.ts`
   compares the parsed result against the parsed expected output by deep
   equality.

**Known limitations (by design)**:

- **Order-independent outputs** (e.g. "the two single numbers", generated
  subsets/permutations, top-K with ties) are compared by exact array order.
  A correct solution returning the same elements in a different valid order
  shows as a mismatch — would need per-problem knowledge of which outputs
  are order-independent that isn't in the data.
- **No hidden test cases** — only each problem's 1-2 extracted examples are
  checked.
- A few problems' expected output is pure prose describing multiple valid
  answers (e.g. `topological-sort/topological-sort`) — reports "could not
  parse expected output" rather than a false pass/fail.

## Environment prerequisites

- **Node 18.18+.** The system default on this machine is v12.18.4 (too old).
  Use nvm: `source ~/.nvm/nvm.sh && nvm use v20.20.2` — `web/.nvmrc` pins
  this version, run `nvm use` from inside `web/` instead if you prefer.
- **No Docker.** See "The judge" above.

## Common commands

```bash
# Run the site -- ./start.sh (repo root) handles Node version checks, port
# conflicts, and first-run npm install; see README.md for what it does.
# Equivalent manual version, useful when iterating (avoids the script's
# checks re-running every time):
cd web && source ~/.nvm/nvm.sh && nvm use v20.20.2 && npm run dev
# -> http://localhost:3000

# Build (also the fastest way to catch a broken change -- run this before
# calling anything done)
cd web && npm run build
```

## Conventions established in this codebase

- **Tailwind v4, CSS-first config** (no `tailwind.config.ts`). Dark mode is
  class-based (`@custom-variant dark` in `globals.css`, toggling `.dark` on
  `<html>`). Every new UI element needs a paired `dark:` variant — there is
  no automatic light/dark fallback; forgetting this is exactly what caused
  an invisible-text bug fixed earlier (see git log).
- **Prose rendering**: raw HTML from `data/` is injected via
  `dangerouslySetInnerHTML` into a `.lesson-content` wrapper (`globals.css`)
  that restores paragraph/list spacing, blockquote callout styling, and
  loads `katex.min.css` — some content embeds KaTeX-rendered math formulas
  as already-rendered HTML/MathML, and without that stylesheet they render
  as fragmented, oddly-spaced characters. Don't remove that import.
- **Slug/id stability**: a problem's or pattern's `slug`/`id` never changes
  once assigned, deliberately decoupled from whatever gets shown as the
  display `title`/`name` (which can be overridden independently). These ids
  are load-bearing: URLs, file paths, and SQLite progress-tracking rows are
  all keyed by them. Never let a display-only rename change one.
- **Data loading**: content is read via `fs` directly in server components /
  `web/src/lib/problems.ts`, module-cached, no client fetch and no database.
  Only *progress* (live, per-user, changes at runtime) is fetched
  client-side from `/api/progress` or read in a route explicitly marked
  `export const dynamic = "force-dynamic"`. Don't bake live SQLite state
  into a statically generated page — it'll go stale.
- **Editor**: `@monaco-editor/react`, always dynamically imported with `{
  ssr: false }` (see `ProblemDetail.tsx`). `CodeBlock` (shared by the
  editable scratchpad, the solution-reveal viewer, and pattern-intro example
  code) takes an optional `height` prop — defaults to the full
  scratchpad-matching size, but a short illustrative snippet in a lighter
  context (like a pattern intro) should pass something much smaller; a
  near-viewport-height Monaco editor embedded in an "overview" blurb reads
  as broken, not clean (this happened once, see git log).
- **Theme init script**: rendered via `next/script` with
  `strategy="beforeInteractive"` in `layout.tsx`. This currently triggers a
  known, upstream, dev-only React 19 console warning ("Encountered a script
  tag while rendering React component") that also affects `next-themes` and
  shadcn/ui's own docs pattern — a false positive with no first-party fix
  yet, doesn't appear in production builds, doesn't affect functionality.
  Don't spend time "fixing" it again.
- **Commits**: small, focused, one concern each (see git log for the
  established granularity). Run `npm run build` before considering anything
  done.

## Known limitations (by design, not bugs — don't "fix" without discussion)

- 78/121 problems auto-judgeable, 43 need custom types the judge doesn't
  construct — see "The judge" above.
- No hidden test cases, only each problem's extracted examples.
- No containerized sandboxing — local subprocess + timeout only. Fine for
  single-user/personal use; would need to become an actual concern before
  ever exposing this beyond one user.
- The "Two Heaps" pattern currently only has 1 problem available.

## Verifying a change

No browser automation is available in this environment. The verification
bar used throughout this project's history:

1. `npm run build` succeeds (catches TypeScript errors and static
   generation failures across all pages).
2. Start/reuse the dev server (restart it if you touched `data/` — see the
   caching gotcha above) and `curl` a small representative sample — home
   page, a pattern page, a plain problem, a challenge-type problem, and a
   problem with diagrams — checking for 200s and expected content markers in
   the response body.
3. For judge changes specifically: submit a problem's real solution code
   (from its JSON's solution section, not the stub) via `POST /api/submit`
   and confirm `allPassed: true`; also submit something deliberately wrong
   and confirm it correctly fails, to rule out a vacuously-true comparator.

If you need to actually see the rendered page (layout/visual issues), say so
explicitly rather than claiming success from curl output alone — curl can't
see CSS, dark mode, or client-rendered Monaco content.
