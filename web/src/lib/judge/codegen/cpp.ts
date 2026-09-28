import { LiteralValue } from "../literals";
import { findSignatureByName, MethodSignature } from "../signature";
import { RunSpec } from "../runner";
import { cppLiteral, RESULT_MARKER } from "./emit";

const TOJSON_HELPER = `
#include <string>
#include <vector>
#include <utility>
#include <sstream>
std::string toJson(int v) { return std::to_string(v); }
std::string toJson(long v) { return std::to_string(v); }
std::string toJson(long long v) { return std::to_string(v); }
std::string toJson(double v) { std::ostringstream o; o << v; return o.str(); }
std::string toJson(bool v) { return v ? "true" : "false"; }
std::string toJson(char v) { return std::string("\\"") + v + "\\""; }
std::string toJson(const std::string& v) {
  std::string r = "\\"";
  for (char c : v) { if (c == '"' || c == '\\\\') r += '\\\\'; r += c; }
  return r + "\\"";
}
template<typename T> std::string toJson(const std::vector<T>& v) {
  std::string r = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) r += ","; r += toJson(v[i]); }
  return r + "]";
}
template<typename A, typename B> std::string toJson(const std::pair<A, B>& p) {
  return "[" + toJson(p.first) + "," + toJson(p.second) + "]";
}
`;

/** User C++ starter code isn't guaranteed to be free of its own `int main()`
 * (a handful of problems embed a demo driver), so the submission is wrapped
 * in a namespace rather than concatenated at global scope -- avoids a
 * duplicate-main compile error without editing the user's code. */
export function buildCppRunSpec(
  userCode: string,
  reference: MethodSignature,
  args: LiteralValue[],
  expectedName: { className: string | null; methodName: string },
): RunSpec {
  const sig: MethodSignature | null = findSignatureByName("cpp", userCode, expectedName.className, expectedName.methodName);
  if (!sig || !sig.className) throw new Error(`could not locate '${expectedName.methodName}' in the submitted C++ code`);

  const paramLines = sig.params
    .map((p, i) => `  ${(p.rawType ?? "auto").replace(/&$/, "").trim()} arg${i} = ${cppLiteral(args[i], p.rawType ?? "")};`)
    .join("\n");
  const argNames = sig.params.map((_, i) => `arg${i}`).join(", ");

  const isVoid = reference.returnShape?.kind === "void";
  const arrayParamIdx = reference.params.findIndex((p) => p.shape?.kind === "array");
  const callTarget = sig.isStatic ? `usercode::${sig.className}::${sig.methodName}` : null;

  let callAndPrint: string;
  if (!sig.isStatic) {
    callAndPrint = `  usercode::${sig.className} obj;\n  auto result = obj.${sig.methodName}(${argNames});\n  std::cout << "${RESULT_MARKER}" << toJson(result) << std::endl;`;
  } else if (isVoid) {
    callAndPrint = `  ${callTarget}(${argNames});\n  std::cout << "${RESULT_MARKER}" << toJson(arg${arrayParamIdx}) << std::endl;`;
  } else {
    callAndPrint = `  auto result = ${callTarget}(${argNames});\n  std::cout << "${RESULT_MARKER}" << toJson(result) << std::endl;`;
  }

  // #include lines must stay at global scope -- textually nesting them
  // inside `namespace usercode { ... }` breaks libc++'s internal
  // "using ::size_t / ::nullptr_t / ::abort" declarations, which assume
  // they land in the global namespace. Hoist any #include / top-level
  // `using namespace ...;` lines out; everything else (the actual class
  // definitions) stays wrapped in the namespace.
  const userLines = userCode.split("\n");
  const hoisted: string[] = [];
  const rest: string[] = [];
  for (const line of userLines) {
    if (/^\s*#include\b/.test(line) || /^\s*using\s+namespace\s+\w+\s*;\s*$/.test(line)) {
      hoisted.push(line);
    } else {
      rest.push(line);
    }
  }

  const mainCpp = `using namespace std;
${hoisted.join("\n")}
namespace usercode {
${rest.join("\n")}
}
${TOJSON_HELPER}
int main() {
${paramLines}
${callAndPrint}
  return 0;
}
`;

  return {
    files: [{ name: "main.cpp", content: mainCpp }],
    compile: async () => ({ cmd: "g++", args: ["-std=c++17", "-O0", "-o", "prog", "main.cpp"] }),
    execute: async () => ({ cmd: "./prog", args: [] }),
  };
}
