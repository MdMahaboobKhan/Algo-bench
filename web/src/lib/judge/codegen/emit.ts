import { LiteralValue } from "../literals";

// Printed immediately before the JSON-serialized result so the runner can
// find the real answer even if the user's submitted code has its own
// top-level demo output (common in the source starter code, e.g. a trailing
// `main()`/`console.log(...)` call executed before our harness code runs).
export const RESULT_MARKER = "@@JUDGE_RESULT@@";

export function pythonLiteral(v: LiteralValue): string {
  if (Array.isArray(v)) return `[${v.map(pythonLiteral).join(", ")}]`;
  if (typeof v === "string") return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null) return "None";
  return String(v);
}

export function jsLiteral(v: LiteralValue): string {
  return JSON.stringify(v);
}

/** Normalize a Java/C++ base type token (Integer/int/Long/... ) for building
 * nested array/list literals -- keeps the exact spelling from source so the
 * generated code type-checks against whatever the user's method declares. */
function javaScalarLiteral(v: LiteralValue, base: string): string {
  const b = base.trim();
  if (/^(long|Long)$/.test(b)) return `${v}L`;
  if (/^(double|Double|float|Float)$/.test(b)) return `${Number(v)}d`;
  if (/^(boolean|Boolean)$/.test(b)) return v ? "true" : "false";
  if (/^(char|Character)$/.test(b)) return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  if (/^(String|string)$/.test(b)) return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return String(v); // int/Integer and fallback
}

/** Recursively emit a Java literal expression matching a declared rawType
 * (e.g. "int[]", "int[][]", "List<Integer>", "List<List<Integer>>",
 * "List<Integer[]>"). Falls back to a plain scalar for everything else. */
export function javaLiteral(v: LiteralValue, rawType: string): string {
  const t = rawType.trim();

  let m = /^(.+)\[\]\[\]$/.exec(t);
  if (m && Array.isArray(v)) {
    const base = m[1].trim();
    const rows = (v as LiteralValue[]).map(
      (row) => `{${(row as LiteralValue[]).map((x) => javaScalarLiteral(x, base)).join(", ")}}`,
    );
    return `new ${base}[][]{${rows.join(", ")}}`;
  }
  m = /^(.+)\[\]$/.exec(t);
  if (m && Array.isArray(v)) {
    const base = m[1].trim();
    return `new ${base}[]{${(v as LiteralValue[]).map((x) => javaScalarLiteral(x, base)).join(", ")}}`;
  }
  m = /^List<List<(\w+)>>$/.exec(t);
  if (m && Array.isArray(v)) {
    const inner = m[1];
    const rows = (v as LiteralValue[]).map(
      (row) => `Arrays.asList(${(row as LiteralValue[]).map((x) => javaScalarLiteral(x, inner)).join(", ")})`,
    );
    return `Arrays.asList(${rows.join(", ")})`;
  }
  m = /^List<(\w+)\[\]>$/.exec(t);
  if (m && Array.isArray(v)) {
    const inner = m[1];
    const rows = (v as LiteralValue[]).map(
      (row) => `new ${inner}[]{${(row as LiteralValue[]).map((x) => javaScalarLiteral(x, inner)).join(", ")}}`,
    );
    return `Arrays.asList(${rows.join(", ")})`;
  }
  m = /^List<(\w+)>$/.exec(t);
  if (m && Array.isArray(v)) {
    const inner = m[1];
    return `Arrays.asList(${(v as LiteralValue[]).map((x) => javaScalarLiteral(x, inner)).join(", ")})`;
  }
  return javaScalarLiteral(v, t);
}

/** Recursively emit a C++ literal expression matching a declared rawType
 * (e.g. "vector<int>", "vector<vector<int>>", "const vector<int>&"). */
export function cppLiteral(v: LiteralValue, rawType: string): string {
  let t = rawType.trim().replace(/^const\s+/, "").replace(/\s*&$/, "").trim();

  let m = /^(?:std::)?vector<\s*(?:std::)?vector<\s*(\w+)\s*>\s*>$/.exec(t);
  if (m && Array.isArray(v)) {
    const base = m[1];
    const rows = (v as LiteralValue[]).map(
      (row) => `{${(row as LiteralValue[]).map((x) => cppScalarLiteral(x, base)).join(", ")}}`,
    );
    return `{${rows.join(", ")}}`;
  }
  m = /^(?:std::)?vector<\s*(\w+)\s*>$/.exec(t);
  if (m && Array.isArray(v)) {
    const base = m[1];
    return `{${(v as LiteralValue[]).map((x) => cppScalarLiteral(x, base)).join(", ")}}`;
  }
  return cppScalarLiteral(v, t);
}

function cppScalarLiteral(v: LiteralValue, base: string): string {
  const b = base.trim();
  if (/^(bool)$/.test(b)) return v ? "true" : "false";
  if (/^(?:std::)?string$/.test(b)) return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (/^char$/.test(b)) return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  return String(v);
}
