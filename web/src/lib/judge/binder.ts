// Reconciles a parsed example's Input segments with a problem's reference
// parameter list. The free-text examples don't always have one segment per
// parameter -- two real quirks observed in the corpus:
//  - a single array-typed parameter written as a bare comma list with no
//    brackets ("1, 4, 2, 1, 3, 2, 3" for a single int[] param)
//  - multiple named list parameters that share a letter+index naming
//    convention ("L1=[..], L2=[..], L3=[..], K=5" for (List<Integer[]> lists,
//    int k))
import { parseFullLiteral, parseLeadingLiteral, splitTopLevel, stripNamedPrefix, LiteralValue } from "./literals";
import { MethodSignature, ParamInfo } from "./signature";

export type BindResult = { ok: true; args: LiteralValue[] } | { ok: false; error: string };

interface ParsedSegment {
  name: string | null;
  value: LiteralValue;
}

function parseSegments(input: string): ParsedSegment[] | null {
  const segments = splitTopLevel(input);
  const out: ParsedSegment[] = [];
  for (const seg of segments) {
    const { name, rest } = stripNamedPrefix(seg);
    try {
      out.push({ name, value: parseLeadingLiteral(rest) });
    } catch {
      return null;
    }
  }
  return out;
}

/**
 * Bind named segments (e.g. "k=3") to the reference param with the same (or
 * a fuzzily-matching) name, then fill any remaining unbound params from the
 * remaining unnamed/unmatched segments positionally. This matters because
 * the free-text examples don't always list arguments in the method's actual
 * declared parameter order (e.g. "[2, 1, 5, 1, 3, 2], k=3" for
 * `findMaxSumSubArray(int k, int[] arr)` -- the array comes first in prose
 * but is the *second* parameter). Returns null if the names don't fully and
 * unambiguously reconcile (caller falls back to positional/quirk handling).
 */
function tryNameBasedBind(parsed: ParsedSegment[], reference: MethodSignature): LiteralValue[] | null {
  const paramCount = reference.params.length;
  if (parsed.length !== paramCount) return null;

  const boundIdx: (number | null)[] = parsed.map(() => null);
  const paramTaken = new Array(paramCount).fill(false);
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Pass 1: exact (case/punctuation-insensitive) name match.
  parsed.forEach((seg, i) => {
    if (!seg.name) return;
    const segN = normalize(seg.name);
    const idx = reference.params.findIndex((p, pi) => !paramTaken[pi] && normalize(p.name) === segN);
    if (idx !== -1) {
      boundIdx[i] = idx;
      paramTaken[idx] = true;
    }
  });

  // Pass 2: fuzzy substring match for anything still unbound-but-named.
  parsed.forEach((seg, i) => {
    if (boundIdx[i] !== null || !seg.name) return;
    const segN = normalize(seg.name);
    const candidates = reference.params
      .map((p, pi) => pi)
      .filter((pi) => !paramTaken[pi] && (normalize(reference.params[pi].name).includes(segN) || segN.includes(normalize(reference.params[pi].name))));
    if (candidates.length === 1) {
      boundIdx[i] = candidates[0];
      paramTaken[candidates[0]] = true;
    }
  });

  // Pass 3: fill remaining unbound params from remaining segments, in order.
  const unboundSegIdxs = parsed.map((_, i) => i).filter((i) => boundIdx[i] === null);
  const unboundParamIdxs = paramTaken.map((_, pi) => pi).filter((pi) => !paramTaken[pi]);
  if (unboundSegIdxs.length !== unboundParamIdxs.length) return null;
  unboundSegIdxs.forEach((segIdx, k) => {
    boundIdx[segIdx] = unboundParamIdxs[k];
  });

  if (boundIdx.some((b) => b === null)) return null;
  const args = new Array(paramCount);
  parsed.forEach((seg, i) => {
    args[boundIdx[i]!] = seg.value;
  });
  return args;
}

export function bindExampleArgs(rawInput: string | null, reference: MethodSignature): BindResult {
  const paramCount = reference.params.length;
  const trimmed = (rawInput ?? "").trim();

  if (paramCount === 0) {
    return { ok: true, args: [] };
  }
  if (trimmed.length === 0 || /^none$/i.test(trimmed)) {
    return { ok: false, error: "example has no parseable input but the method takes parameters" };
  }

  let parsed = parseSegments(trimmed);
  if (!parsed) {
    return { ok: false, error: `could not parse example input: ${JSON.stringify(trimmed)}` };
  }

  if (parsed.length === paramCount) {
    const nameBased = tryNameBasedBind(parsed, reference);
    if (nameBased) return { ok: true, args: nameBased };
    return { ok: true, args: parsed.map((p) => p.value) };
  }

  // Quirk 3: a named array-of-arrays param whose extra rows spill into
  // subsequent unnamed top-level segments, because the source lists them
  // without an outer wrapping bracket, e.g.
  // "Tasks=3, Prerequisites=[0, 1], [1, 2]" -- the [1, 2] segment is really
  // a continuation of Prerequisites, not a separate positional argument.
  // Fold trailing unnamed array segments into the preceding named array
  // segment when doing so reaches the target arity.
  if (parsed.length > paramCount) {
    const folded: ParsedSegment[] = [];
    for (const seg of parsed) {
      const prev = folded[folded.length - 1];
      if (seg.name === null && prev && Array.isArray(prev.value)) {
        const rowsSoFar = Array.isArray(prev.value[0]) ? (prev.value as LiteralValue[]) : [prev.value];
        prev.value = [...rowsSoFar, seg.value];
        continue;
      }
      folded.push({ ...seg });
    }
    if (folded.length === paramCount) {
      parsed = folded;
      return { ok: true, args: parsed.map((p) => p.value) };
    }
  }

  // Quirk 1: single array-typed param written as a bare scalar comma list.
  if (paramCount === 1 && parsed.length > 1 && parsed.every((p) => !Array.isArray(p.value))) {
    return { ok: true, args: [parsed.map((p) => p.value)] };
  }

  // Quirk 2: grouped named lists (L1/L2/L3/...) collapse into one array-of-arrays param.
  const groupRe = /^([A-Za-z]+)(\d+)$/;
  const groupable = parsed.filter((p) => p.name && groupRe.test(p.name));
  const ungroupable = parsed.filter((p) => !(p.name && groupRe.test(p.name)));
  if (groupable.length >= 2 && ungroupable.length === paramCount - 1) {
    const prefixes = new Set(groupable.map((p) => groupRe.exec(p.name!)![1]));
    if (prefixes.size === 1) {
      groupable.sort((a, b) => parseInt(groupRe.exec(a.name!)![2], 10) - parseInt(groupRe.exec(b.name!)![2], 10));
      const arrayParamIdx = reference.params.findIndex(
        (p: ParamInfo) => p.shape?.kind === "array" && p.shape.dims >= 1,
      );
      if (arrayParamIdx !== -1) {
        const args: LiteralValue[] = new Array(paramCount);
        args[arrayParamIdx] = groupable.map((p) => p.value);
        let ui = 0;
        for (let i = 0; i < paramCount; i++) {
          if (i === arrayParamIdx) continue;
          args[i] = ungroupable[ui++].value;
        }
        return { ok: true, args };
      }
    }
  }

  return {
    ok: false,
    error: `argument count mismatch: parsed ${parsed.length} segment(s) from example but method takes ${paramCount} parameter(s)`,
  };
}

export function parseExpectedOutput(rawOutput: string | null): LiteralValue | null {
  if (!rawOutput) return null;
  const trimmed = rawOutput.trim();

  // Try the whole string as one literal first (covers plain scalars and
  // properly-bracketed arrays).
  try {
    return parseFullLiteral(trimmed);
  } catch {
    /* fall through */
  }

  // Some outputs are a bare comma-separated list with no wrapping bracket
  // ("4, 6, 7", or "[9, 3], [9, 6], [8, 6]" for a list of pairs) -- if every
  // top-level segment parses as a complete literal on its own, treat the
  // whole thing as an array of those. Without this, the tolerant
  // leading-literal parse below would silently truncate to just the first
  // segment.
  const segments = splitTopLevel(trimmed);
  if (segments.length > 1) {
    try {
      return segments.map((s) => parseFullLiteral(s));
    } catch {
      /* fall through */
    }
  }

  try {
    const value = parseLeadingLiteral(trimmed);
    // A handful of outputs are pure prose describing multiple valid answers
    // (e.g. topological sort: "Following are all valid topological sorts...").
    // The tolerant parser will happily read a leading bare word as a string
    // literal, which is almost never a real intended answer (legitimate
    // string outputs in this corpus are quoted, e.g. 'h') -- reject unquoted
    // bare-word results rather than silently comparing against the wrong thing.
    if (typeof value === "string" && trimmed[0] !== '"' && trimmed[0] !== "'") {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
