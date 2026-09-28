import { LiteralValue } from "../literals";
import { findSignatureByName, MethodSignature } from "../signature";
import { RunSpec } from "../runner";
import { jsLiteral, RESULT_MARKER } from "./emit";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

const NVM_NODE = path.join(os.homedir(), ".nvm/versions/node/v20.20.2/bin/node");

export function buildJavaScriptRunSpec(
  userCode: string,
  reference: MethodSignature,
  args: LiteralValue[],
  expectedName: { className: string | null; methodName: string },
): RunSpec {
  const sig: MethodSignature | null = findSignatureByName("javascript", userCode, null, expectedName.methodName);
  if (!sig) throw new Error(`could not locate '${expectedName.methodName}' in the submitted JavaScript code`);

  const argLines = args.map((a, i) => `const __arg${i} = ${jsLiteral(a)};`).join("\n");
  const argNames = args.map((_, i) => `__arg${i}`).join(", ");
  const isVoid = reference.returnShape?.kind === "void";
  const arrayIdx = reference.params.findIndex((p) => p.shape?.kind === "array");

  const call = isVoid
    ? `${sig.methodName}(${argNames});\nconst __result = __arg${arrayIdx};`
    : `const __result = ${sig.methodName}(${argNames});`;

  const harness = `

${argLines}
${call}
console.log("${RESULT_MARKER}" + JSON.stringify(__result));
`;

  return {
    files: [{ name: "solution.js", content: userCode + harness }],
    execute: async () => {
      const node = (await fs
        .access(NVM_NODE)
        .then(() => NVM_NODE)
        .catch(() => "node")) as string;
      return { cmd: node, args: ["solution.js"] };
    },
  };
}
