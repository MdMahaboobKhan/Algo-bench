// Parses the free-text Input/Output example strings extracted from the
// source problem statements (close to Python/JSON literal syntax, but with
// quirks: {}-style "sets", named `key = value` / `Name=value` segments,
// unquoted single chars, trailing prose after the actual value) into native
// JS values, and back into per-language source literals for harness codegen.

export type LiteralValue =
  | number
  | string
  | boolean
  | null
  | LiteralValue[];

// --- tokenizing helpers -----------------------------------------------

function skipWs(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

// Parses one literal value starting at index i. Returns [value, nextIndex].
// Tolerant: only consumes as much as forms one complete literal; anything
// after is left for the caller (used to strip trailing prose from outputs).
function parseValueAt(s: string, i: number): [LiteralValue, number] {
  i = skipWs(s, i);
  if (i >= s.length) throw new Error("unexpected end of input while parsing literal");
  const c = s[i];

  if (c === "[" || c === "{") {
    const close = c === "[" ? "]" : "}";
    i++;
    const arr: LiteralValue[] = [];
    i = skipWs(s, i);
    if (s[i] === close) return [arr, i + 1];
    for (;;) {
      const [v, next] = parseValueAt(s, i);
      arr.push(v);
      i = skipWs(s, next);
      if (s[i] === ",") {
        i = skipWs(s, i + 1);
        continue;
      }
      if (s[i] === close) return [arr, i + 1];
      // Some source examples separate array elements with only whitespace
      // (e.g. "[0 0 1 1 2]") instead of commas -- accept an implicit
      // separator when the next char can start another value.
      if (i < s.length && /[-\d"'[{A-Za-z]/.test(s[i])) continue;
      throw new Error(`expected ',' or '${close}' at position ${i} in: ${s}`);
    }
  }

  if (c === '"' || c === "'") {
    let j = i + 1;
    let out = "";
    while (j < s.length && s[j] !== c) {
      if (s[j] === "\\" && j + 1 < s.length) {
        out += s[j + 1];
        j += 2;
      } else {
        out += s[j];
        j++;
      }
    }
    return [out, j + 1];
  }

  // number (int/float, optional leading -)
  const numMatch = /^-?\d+(\.\d+)?/.exec(s.slice(i));
  if (numMatch) {
    const text = numMatch[0];
    return [text.includes(".") ? parseFloat(text) : parseInt(text, 10), i + text.length];
  }

  // bare words: true/false (any case), null/none, or an unquoted identifier
  // (rare, e.g. a bare single letter used as a char literal without quotes)
  const wordMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
  if (wordMatch) {
    const w = wordMatch[0];
    const lw = w.toLowerCase();
    if (lw === "true") return [true, i + w.length];
    if (lw === "false") return [false, i + w.length];
    if (lw === "none" || lw === "null") return [null, i + w.length];
    // unquoted bare word (e.g. a stray identifier) -- treat as a string
    return [w, i + w.length];
  }

  throw new Error(`could not parse literal at position ${i} in: ${s}`);
}

/** Parse a literal value, ignoring any trailing text after the first complete value. */
export function parseLeadingLiteral(raw: string): LiteralValue {
  const [v] = parseValueAt(raw, 0);
  return v;
}

/** Parse a literal value, requiring the entire (trimmed) string to be consumed. */
export function parseFullLiteral(raw: string): LiteralValue {
  const [v, next] = parseValueAt(raw, 0);
  const rest = raw.slice(next).trim();
  if (rest.length > 0) throw new Error(`trailing content after literal: ${JSON.stringify(rest)}`);
  return v;
}

/** Split a string on top-level commas (not inside [], {}, (), or quotes). */
export function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") depth--;
    else if (c === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Strip an optional `Name=` / `Name =` / `Name:` prefix from an example segment. */
export function stripNamedPrefix(segment: string): { name: string | null; rest: string } {
  const m = /^([A-Za-z_][A-Za-z0-9_ ]*?)\s*[=:]\s*(?![=])/.exec(segment);
  if (m) {
    return { name: m[1].trim(), rest: segment.slice(m[0].length).trim() };
  }
  return { name: null, rest: segment.trim() };
}

// --- canonical stringify for comparison ---------------------------------

/** Deep-equality for parsed literal values (numbers compared with tolerance for float noise). */
export function literalsEqual(a: LiteralValue, b: LiteralValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => literalsEqual(v, b[i]));
  }
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a === b;
  }
  return a === b;
}
