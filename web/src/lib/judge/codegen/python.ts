import { LiteralValue } from "../literals";
import { findSignatureByName, MethodSignature } from "../signature";
import { RunSpec } from "../runner";
import { pythonLiteral, RESULT_MARKER } from "./emit";

// `reference` (the typed Java/C++ signature) decides void-return / which
// param is the mutated array to print for in-place-mutation problems, since
// Python's own signature carries no static types to determine that from.
export function buildPythonRunSpec(
  userCode: string,
  reference: MethodSignature,
  args: LiteralValue[],
  expectedName: { className: string | null; methodName: string },
): RunSpec {
  const sig: MethodSignature | null = findSignatureByName("python3", userCode, null, expectedName.methodName);
  if (!sig) throw new Error(`could not locate '${expectedName.methodName}' in the submitted Python code`);

  const argLines = args.map((a, i) => `__arg${i} = ${pythonLiteral(a)}`).join("\n");
  const argNames = args.map((_, i) => `__arg${i}`).join(", ");
  const isVoid = reference.returnShape?.kind === "void";
  const arrayIdx = reference.params.findIndex((p) => p.shape?.kind === "array");

  const call = isVoid
    ? `${sig.methodName}(${argNames})\n__result = __arg${arrayIdx}`
    : `__result = ${sig.methodName}(${argNames})`;

  const harness = `

import json as __json
${argLines}
${call}
print("${RESULT_MARKER}" + __json.dumps(__result))
`;

  return {
    files: [{ name: "solution.py", content: userCode + harness }],
    execute: async () => ({ cmd: "python3", args: ["solution.py"] }),
  };
}
