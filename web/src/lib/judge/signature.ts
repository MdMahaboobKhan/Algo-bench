// Locates the "target" method/function in a problem's starterCode and
// classifies whether its signature is representable with plain literal
// values (int/double/boolean/char/String and 1D/2D arrays/Lists of those) or
// requires a custom type (ListNode, TreeNode, Interval, etc.) that this judge
// doesn't support constructing from free-text examples.
//
// Strategy: every starter snippet has exactly one `// TODO: Write your code
// here` (or `# TODO: ...`) marker, always inside the target method's body.
// Find all class/method/function declaration ranges in the source, then pick
// whichever *method*-kind range most tightly encloses the TODO marker's
// character offset. This sidesteps needing to identify "the" class name when
// a file defines multiple classes (e.g. a helper `Interval` class plus the
// target `MergeIntervals` class).

// Source has several stub-marker spellings across problems/languages (e.g.
// "// TODO: Write your code here", "//TODO: Write - Your - Code",
// "#TODO: Write your code here."). All contain "TODO" -- anchor on that.
export const STUB_MARKER = "TODO";

export type ParamShape =
  | { kind: "scalar"; base: PrimitiveBase }
  | { kind: "array"; base: PrimitiveBase; dims: 1 | 2 }
  | { kind: "unsupported"; raw: string };

export type PrimitiveBase = "int" | "long" | "double" | "boolean" | "char" | "String";

export interface ParamInfo {
  name: string;
  rawType: string | null; // null for Python/JS (no static types)
  shape: ParamShape | null; // null when rawType is null (untyped language)
}

export interface MethodSignature {
  language: string;
  className: string | null;
  methodName: string;
  isStatic: boolean;
  returnRawType: string | null;
  returnShape: ParamShape | { kind: "void" } | null;
  params: ParamInfo[];
}

// --- range finding (Java / C++, brace-based) ----------------------------

interface Range {
  kind: "class" | "method";
  name: string;
  isStatic: boolean;
  returnType: string | null; // method only
  paramsRaw: string | null; // method only
  start: number; // index of the opening '{'
  end: number; // index of the matching closing '}'
}

/**
 * Blanks out comment and string/char literal *contents* (replacing with
 * spaces, preserving length/positions) so brace-counting and structural
 * regexes don't get confused by stray `{`/`}` inside them -- e.g. a comment
 * like `// if (x) {` has an unmatched `{` that otherwise throws off
 * matchingBrace for the entire enclosing method. Callers match against the
 * masked string but slice substrings from the original at the same indices
 * (masking preserves 1:1 position alignment).
 */
function maskCommentsAndStrings(source: string): string {
  const out = source.split("");
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const c2 = source[i + 1];
    if (c === "/" && c2 === "/") {
      while (i < source.length && source[i] !== "\n") out[i++] = " ";
      continue;
    }
    if (c === "/" && c2 === "*") {
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) out[i++] = " ";
      if (i < source.length) {
        out[i++] = " ";
        out[i++] = " ";
      }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out[i++] = " ";
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < source.length) {
          out[i++] = " ";
          out[i++] = " ";
          continue;
        }
        out[i++] = " ";
      }
      if (i < source.length) out[i++] = " ";
      continue;
    }
    i++;
  }
  return out.join("");
}

function matchingBrace(source: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return source.length - 1;
}

const JAVA_CLASS_RE = /\bclass\s+(\w+)[^{]*\{/g;
// Any "identifier(params) {" -- deliberately loose (doesn't try to parse the
// return type inline, since nested generics like List<List<Integer>> break a
// regex-only approach). The text between the previous statement boundary
// (';', '{', or '}') and the match is taken as the raw "modifiers + return
// type" prefix, parsed separately below. This also matches constructors
// (no distinct return-type prefix) and control-flow keywords, both filtered
// out by the caller.
const CALL_SITE_RE = /\b(\w+)\s*\(([^;{}]*)\)\s*(?:throws\s+\w+\s*)?\{/g;
const CONTROL_KEYWORDS = new Set(["if", "for", "while", "switch", "catch", "class", "new", "return", "synchronized"]);
const MODIFIERS = new Set(["public", "private", "protected", "static", "final", "synchronized"]);
const STATEMENT_BOUNDARY = new Set([";", "{", "}"]);

function findJavaLikeRanges(source: string): Range[] {
  // Match/brace-count against a comment-and-string-blanked view so stray
  // braces inside comments (e.g. `// if (x) {`) or char/string literals
  // don't desync brace matching -- but keep using `source` (same length,
  // positions line up 1:1) for slicing out actual text.
  const masked = maskCommentsAndStrings(source);
  const ranges: Range[] = [];
  for (const m of masked.matchAll(JAVA_CLASS_RE)) {
    const openIdx = m.index! + m[0].length - 1;
    ranges.push({
      kind: "class",
      name: m[1],
      isStatic: false,
      returnType: null,
      paramsRaw: null,
      start: openIdx,
      end: matchingBrace(masked, openIdx),
    });
  }
  for (const m of masked.matchAll(CALL_SITE_RE)) {
    const name = m[1];
    if (CONTROL_KEYWORDS.has(name)) continue;
    const matchStart = m.index!;
    let boundary = matchStart - 1;
    while (boundary >= 0 && !STATEMENT_BOUNDARY.has(masked[boundary])) boundary--;
    // C++ access-specifier labels ("public:"/"private:"/"protected:") sit
    // between statement boundaries with no ';' of their own -- strip them,
    // they're not part of a return type.
    const prefix = masked
      .slice(boundary + 1, matchStart)
      .replace(/\b(?:public|private|protected)\s*:/g, " ")
      .trim();
    const tokens = prefix.split(/\s+/).filter((t) => t.length > 0 && !MODIFIERS.has(t));
    if (tokens.length === 0) continue; // no return type -> constructor, not a target method
    const returnType = tokens.join(" ");
    const isStatic = /\bstatic\b/.test(prefix);
    const openIdx = m.index! + m[0].length - 1;
    ranges.push({
      kind: "method",
      name,
      isStatic,
      returnType,
      paramsRaw: m[2],
      start: openIdx,
      end: matchingBrace(masked, openIdx),
    });
  }
  return ranges;
}

function findEnclosingMethod(source: string, todoIdx: number): Range | null {
  const ranges = findJavaLikeRanges(source).filter((r) => r.kind === "method" && r.start < todoIdx && todoIdx < r.end);
  if (ranges.length === 0) return null;
  ranges.sort((a, b) => a.end - a.start - (b.end - b.start));
  return ranges[0];
}

function findEnclosingClass(source: string, methodRange: Range): string | null {
  const ranges = findJavaLikeRanges(source).filter(
    (r) => r.kind === "class" && r.start < methodRange.start && methodRange.end < r.end,
  );
  if (ranges.length === 0) return null;
  ranges.sort((a, b) => a.end - a.start - (b.end - b.start));
  return ranges[0].name;
}

// --- param list splitting (generic/array aware) --------------------------

function splitParamList(raw: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "<" || c === "[" || c === "(") depth++;
    else if (c === ">" || c === "]" || c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  const last = raw.slice(start).trim();
  if (last.length > 0) parts.push(last);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

const PRIMITIVE_ALIASES: Record<string, PrimitiveBase> = {
  int: "int",
  Integer: "int",
  long: "long",
  Long: "long",
  double: "double",
  Double: "double",
  float: "double",
  Float: "double",
  boolean: "boolean",
  Boolean: "boolean",
  char: "char",
  Character: "char",
  string: "String",
  String: "String",
};

/** Classify a Java/C++ type token into a ParamShape. */
export function classifyType(rawType: string): ParamShape {
  let t = rawType.trim();
  t = t.replace(/^const\s+/, "").replace(/&\s*$/, "").replace(/\s*&$/, "").trim();
  t = t.replace(/\s*\*$/, "").trim(); // trailing pointer marker (unlikely here)

  // C++ vector<vector<T>>
  let m = /^(?:std::)?vector<\s*(?:std::)?vector<\s*(\w+)\s*>\s*>$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 2 };

  // C++ vector<T>
  m = /^(?:std::)?vector<\s*(\w+)\s*>$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 1 };

  // Java List<List<T>>
  m = /^List<\s*List<\s*(\w+)\s*>\s*>$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 2 };

  // Java List<T[]> (list of arrays -- treat as 2D)
  m = /^List<\s*(\w+)\[\]\s*>$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 2 };

  // Java List<T>
  m = /^List<\s*(\w+)\s*>$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 1 };

  // T[][] (Java 2D array)
  m = /^(\w+)\[\]\[\]$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 2 };

  // T[] (Java 1D array)
  m = /^(\w+)\[\]$/.exec(t);
  if (m && PRIMITIVE_ALIASES[m[1]]) return { kind: "array", base: PRIMITIVE_ALIASES[m[1]], dims: 1 };

  // C++ string
  if (/^(?:std::)?string$/.test(t)) return { kind: "scalar", base: "String" };

  // plain scalar
  if (PRIMITIVE_ALIASES[t]) return { kind: "scalar", base: PRIMITIVE_ALIASES[t] };

  return { kind: "unsupported", raw: rawType };
}

function parseJavaLikeParams(paramsRaw: string): ParamInfo[] {
  return splitParamList(paramsRaw).map((p) => {
    // "const vector<int>& arr" / "int[] arr" / "List<Integer> nums" -> split
    // off the trailing identifier (param name) from the leading type.
    const trimmed = p.trim();
    const nameMatch = /(\w+)\s*$/.exec(trimmed);
    const name = nameMatch ? nameMatch[1] : trimmed;
    const rawType = nameMatch ? trimmed.slice(0, trimmed.length - nameMatch[0].length).trim() : "";
    return { name, rawType, shape: classifyType(rawType) };
  });
}

function allIndicesOf(source: string, needle: string): number[] {
  const idxs: number[] = [];
  let i = source.indexOf(needle);
  while (i !== -1) {
    idxs.push(i);
    i = source.indexOf(needle, i + 1);
  }
  return idxs;
}

/** True if the source has TODO markers inside more than one distinct method
 * (e.g. a stateful class with both a constructor and an `add()` method left
 * as stubs) -- that shape needs a sequence-of-calls harness this judge
 * doesn't build; callers should treat it as unsupported. */
export function hasMultiMethodStub(source: string): boolean {
  const todoIdxs = allIndicesOf(source, STUB_MARKER);
  if (todoIdxs.length <= 1) return false;
  const methodStarts = new Set(
    todoIdxs.map((idx) => findEnclosingMethod(source, idx)?.start).filter((s) => s !== undefined),
  );
  return methodStarts.size > 1;
}

function extractJavaLikeSignature(language: string, source: string): MethodSignature | null {
  const todoIdx = source.indexOf(STUB_MARKER);
  if (todoIdx === -1) return null;
  const methodRange = findEnclosingMethod(source, todoIdx);
  if (!methodRange) return null;
  const className = findEnclosingClass(source, methodRange);
  const params = parseJavaLikeParams(methodRange.paramsRaw ?? "");
  const returnType = methodRange.returnType;
  const returnShape: MethodSignature["returnShape"] =
    returnType === "void" ? { kind: "void" } : returnType ? classifyType(returnType) : null;
  return {
    language,
    className,
    methodName: methodRange.name,
    isStatic: methodRange.isStatic,
    returnRawType: returnType,
    returnShape,
    params,
  };
}

/**
 * Locate a Java/C++ method by its already-known name (and, if given, its
 * enclosing class name) rather than by TODO position. Needed because actual
 * *submissions* -- a real solution, possibly rewritten from scratch -- won't
 * contain the stub's TODO marker at all; only the pristine starter code does.
 * The expected name is established once from that starter code (see
 * extractJavaLikeSignature) and reused here to re-locate the same method in
 * whatever the user actually submits.
 */
function findJavaLikeSignatureByName(
  language: string,
  source: string,
  expectedClassName: string | null,
  expectedMethodName: string,
): MethodSignature | null {
  const ranges = findJavaLikeRanges(source);
  const candidates = ranges.filter((r) => r.kind === "method" && r.name === expectedMethodName);
  if (candidates.length === 0) return null;
  let methodRange = candidates[0];
  if (expectedClassName && candidates.length > 1) {
    const inClass = candidates.find((c) => findEnclosingClassInRanges(ranges, c) === expectedClassName);
    if (inClass) methodRange = inClass;
  }
  const className = findEnclosingClassInRanges(ranges, methodRange);
  const params = parseJavaLikeParams(methodRange.paramsRaw ?? "");
  const returnType = methodRange.returnType;
  const returnShape: MethodSignature["returnShape"] =
    returnType === "void" ? { kind: "void" } : returnType ? classifyType(returnType) : null;
  return {
    language,
    className,
    methodName: methodRange.name,
    isStatic: methodRange.isStatic,
    returnRawType: returnType,
    returnShape,
    params,
  };
}

function findEnclosingClassInRanges(ranges: Range[], methodRange: Range): string | null {
  const enclosing = ranges.filter(
    (r) => r.kind === "class" && r.start < methodRange.start && methodRange.end < r.end,
  );
  if (enclosing.length === 0) return null;
  enclosing.sort((a, b) => a.end - a.start - (b.end - b.start));
  return enclosing[0].name;
}

function findPythonSignatureByName(source: string, expectedMethodName: string): MethodSignature | null {
  const re = new RegExp(`^def\\s+${expectedMethodName}\\s*\\(([^)]*)\\)\\s*:`, "m");
  const m = re.exec(source);
  let name = expectedMethodName;
  let paramsRaw: string;
  if (m) {
    paramsRaw = m[1];
  } else {
    // Fallback: the submission may have renamed the target function (seen
    // in a couple of the source's own reference solutions, which sometimes
    // spell the function slightly differently than the paired starter
    // stub). If there's exactly one non-"main" top-level def, use it.
    const defRe = /^def\s+(\w+)\s*\(([^)]*)\)\s*:/gm;
    const defs = [...source.matchAll(defRe)].filter((d) => d[1] !== "main");
    if (defs.length !== 1) return null;
    name = defs[0][1];
    paramsRaw = defs[0][2];
  }
  const params = splitParamList(paramsRaw)
    .map((p) => p.split("=")[0].split(":")[0].trim())
    .filter((p) => p !== "self")
    .map((n) => ({ name: n, rawType: null, shape: null }));
  return {
    language: "python3",
    className: null,
    methodName: name,
    isStatic: true,
    returnRawType: null,
    returnShape: null,
    params,
  };
}

function findJavaScriptSignatureByName(source: string, expectedMethodName: string): MethodSignature | null {
  const patterns = [
    new RegExp(`function\\s+${expectedMethodName}\\s*\\(([^)]*)\\)`),
    new RegExp(`const\\s+${expectedMethodName}\\s*=\\s*function\\s*\\(([^)]*)\\)`),
    new RegExp(`const\\s+${expectedMethodName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (m) {
      const params = splitParamList(m[1]).map((name) => ({ name, rawType: null, shape: null }));
      return {
        language: "javascript",
        className: null,
        methodName: expectedMethodName,
        isStatic: true,
        returnRawType: null,
        returnShape: null,
        params,
      };
    }
  }
  // Fallback: submission may have renamed the target function -- if there's
  // exactly one top-level function/const-function definition, use it.
  const generic = [
    /function\s+(\w+)\s*\(([^)]*)\)/g,
    /const\s+(\w+)\s*=\s*function\s*\(([^)]*)\)/g,
  ];
  const found: { name: string; params: string }[] = [];
  for (const re of generic) {
    for (const m of source.matchAll(re)) {
      if (m[1] !== "main") found.push({ name: m[1], params: m[2] });
    }
  }
  if (found.length === 1) {
    const params = splitParamList(found[0].params).map((name) => ({ name, rawType: null, shape: null }));
    return {
      language: "javascript",
      className: null,
      methodName: found[0].name,
      isStatic: true,
      returnRawType: null,
      returnShape: null,
      params,
    };
  }
  return null;
}

/** Find a method/function by its known name (see findJavaLikeSignatureByName
 * for why this is needed instead of TODO-anchored extraction for arbitrary
 * user submissions). */
export function findSignatureByName(
  language: string,
  source: string,
  expectedClassName: string | null,
  expectedMethodName: string,
): MethodSignature | null {
  if (language === "java" || language === "cpp") {
    return findJavaLikeSignatureByName(language, source, expectedClassName, expectedMethodName);
  }
  if (language === "python3") return findPythonSignatureByName(source, expectedMethodName);
  if (language === "javascript") return findJavaScriptSignatureByName(source, expectedMethodName);
  return null;
}

// --- Python (indentation-based, untyped) ---------------------------------

function extractPythonSignature(source: string): MethodSignature | null {
  const todoIdx = source.indexOf(STUB_MARKER);
  if (todoIdx === -1) return null;
  const lines = source.split("\n");
  const defRe = /^def\s+(\w+)\s*\(([^)]*)\)\s*:/;
  const defs: { name: string; params: string; startLine: number }[] = [];
  lines.forEach((line, idx) => {
    const m = defRe.exec(line);
    if (m && m[1] !== "main") defs.push({ name: m[1], params: m[2], startLine: idx });
  });
  if (defs.length === 0) return null;

  const todoLine = source.slice(0, todoIdx).split("\n").length - 1;
  // pick the last def whose startLine <= todoLine (its body contains the marker,
  // since Python bodies run until the next top-level statement)
  const candidates = defs.filter((d) => d.startLine <= todoLine);
  const target = candidates.length > 0 ? candidates[candidates.length - 1] : defs[0];

  const params = splitParamList(target.params)
    .map((p) => p.split("=")[0].split(":")[0].trim())
    .filter((p) => p !== "self")
    .map((name) => ({ name, rawType: null, shape: null }));

  return {
    language: "python3",
    className: null,
    methodName: target.name,
    isStatic: true,
    returnRawType: null,
    returnShape: null,
    params,
  };
}

// --- JavaScript (untyped) -------------------------------------------------

function extractJavaScriptSignature(source: string): MethodSignature | null {
  const todoIdx = source.indexOf(STUB_MARKER);
  if (todoIdx === -1) return null;
  const patterns = [
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    /const\s+(\w+)\s*=\s*function\s*\(([^)]*)\)\s*\{/g,
  ];
  const candidates: { name: string; params: string; start: number; end: number }[] = [];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) {
      if (m[1] === "main") continue;
      const openIdx = m.index! + m[0].length - 1;
      candidates.push({ name: m[1], params: m[2], start: openIdx, end: matchingBrace(source, openIdx) });
    }
  }
  const enclosing = candidates.filter((c) => c.start < todoIdx && todoIdx < c.end);
  const target = (enclosing.length > 0 ? enclosing : candidates).sort(
    (a, b) => a.end - a.start - (b.end - b.start),
  )[0];
  if (!target) return null;

  const params = splitParamList(target.params).map((name) => ({ name, rawType: null, shape: null }));
  return {
    language: "javascript",
    className: null,
    methodName: target.name,
    isStatic: true,
    returnRawType: null,
    returnShape: null,
    params,
  };
}

export function extractSignature(language: string, source: string): MethodSignature | null {
  if (language === "java" || language === "cpp") return extractJavaLikeSignature(language, source);
  if (language === "python3") return extractPythonSignature(source);
  if (language === "javascript") return extractJavaScriptSignature(source);
  return null;
}

/**
 * Decide whether a problem is harness-supportable. Uses the Java signature as
 * the canonical typed reference (falls back to C++ if Java is missing) since
 * Python/JS starter code carries no static types. If neither typed signature
 * is available, or the signature can't be classified confidently, the
 * problem is treated as unsupported -- correctness over false positives.
 */
export function classifyProblemSupport(starterCode: Record<string, string>): {
  supported: boolean;
  reason: string;
  reference?: MethodSignature;
} {
  if (Object.keys(starterCode).length === 0) {
    return {
      supported: false,
      reason: "This lesson has no interactive starter code (some Dynamic Programming lessons go straight to worked solutions with no 'Try it yourself' widget in the source).",
    };
  }

  if ((starterCode.java && hasMultiMethodStub(starterCode.java)) || (starterCode.cpp && hasMultiMethodStub(starterCode.cpp))) {
    return {
      supported: false,
      reason: "This problem defines a stateful class API (e.g. a constructor plus separate methods, like a streaming/online data structure) rather than a single pure function. This judge only supports single-call function problems.",
    };
  }

  const reference = (starterCode.java && extractJavaLikeSignature("java", starterCode.java)) ||
    (starterCode.cpp && extractJavaLikeSignature("cpp", starterCode.cpp)) ||
    null;

  if (!reference) {
    return { supported: false, reason: "Could not locate a typed (Java/C++) reference signature for this problem." };
  }
  const badParam = reference.params.find((p) => p.shape?.kind === "unsupported");
  if (badParam) {
    return {
      supported: false,
      reason: `Parameter '${badParam.name}' has an unsupported custom type ('${badParam.rawType}'). This judge only supports plain numbers/strings/booleans and 1D/2D arrays or lists of those.`,
      reference,
    };
  }
  if (reference.returnShape && reference.returnShape.kind === "unsupported") {
    return {
      supported: false,
      reason: `Return type '${reference.returnRawType}' is an unsupported custom type. This judge only supports plain numbers/strings/booleans and 1D/2D arrays or lists of those.`,
      reference,
    };
  }
  if (reference.returnShape === null) {
    return { supported: false, reason: "Could not determine a return type for this problem." };
  }
  return { supported: true, reason: "", reference };
}
