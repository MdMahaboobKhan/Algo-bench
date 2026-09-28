import { LiteralValue } from "../literals";
import { findSignatureByName, MethodSignature } from "../signature";
import { RunSpec } from "../runner";
import { javaLiteral, RESULT_MARKER } from "./emit";

const JSON_HELPER = `
class Json {
  static String stringify(Object o) {
    if (o == null) return "null";
    if (o instanceof String) return "\\"" + ((String) o).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
    if (o instanceof Character) return "\\"" + o + "\\"";
    if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Double || o instanceof Float) return String.valueOf(o);
    if (o instanceof int[]) {
      int[] a = (int[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (o instanceof long[]) {
      long[] a = (long[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (o instanceof double[]) {
      double[] a = (double[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (o instanceof boolean[]) {
      boolean[] a = (boolean[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
      return sb.append("]").toString();
    }
    if (o instanceof char[]) {
      char[] a = (char[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(stringify(a[i])); }
      return sb.append("]").toString();
    }
    if (o instanceof Object[]) {
      Object[] a = (Object[]) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(stringify(a[i])); }
      return sb.append("]").toString();
    }
    if (o instanceof java.util.List) {
      java.util.List<?> l = (java.util.List<?>) o;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(","); sb.append(stringify(l.get(i))); }
      return sb.append("]").toString();
    }
    return String.valueOf(o);
  }
}
`;

export function buildJavaRunSpec(
  userCode: string,
  reference: MethodSignature,
  args: LiteralValue[],
  expectedName: { className: string | null; methodName: string },
): RunSpec {
  const sig: MethodSignature | null = findSignatureByName("java", userCode, expectedName.className, expectedName.methodName);
  if (!sig || !sig.className) throw new Error(`could not locate '${expectedName.methodName}' in the submitted Java code`);

  const paramLines = sig.params
    .map((p, i) => `    ${p.rawType ?? "Object"} arg${i} = ${javaLiteral(args[i], p.rawType ?? "")};`)
    .join("\n");
  const argNames = sig.params.map((_, i) => `arg${i}`).join(", ");
  const callTarget = sig.isStatic ? `${sig.className}.${sig.methodName}` : null;

  const isVoid = reference.returnShape?.kind === "void";
  const arrayParamIdx = reference.params.findIndex((p) => p.shape?.kind === "array");

  let callAndPrint: string;
  if (!sig.isStatic) {
    const ctorLine = `    ${sig.className} __obj = new ${sig.className}();`;
    if (isVoid) {
      callAndPrint = `${ctorLine}\n    __obj.${sig.methodName}(${argNames});\n    System.out.println("${RESULT_MARKER}" + Json.stringify(arg${arrayParamIdx}));`;
    } else {
      callAndPrint = `${ctorLine}\n    Object __result = __obj.${sig.methodName}(${argNames});\n    System.out.println("${RESULT_MARKER}" + Json.stringify(__result));`;
    }
  } else if (isVoid) {
    callAndPrint = `    ${callTarget}(${argNames});\n    System.out.println("${RESULT_MARKER}" + Json.stringify(arg${arrayParamIdx}));`;
  } else {
    callAndPrint = `    Object __result = ${callTarget}(${argNames});\n    System.out.println("${RESULT_MARKER}" + Json.stringify(__result));`;
  }

  const mainJava = `import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
${paramLines}
${callAndPrint}
  }
}
${JSON_HELPER}
`;

  return {
    files: [
      { name: "Solution.java", content: userCode },
      { name: "Main.java", content: mainJava },
    ],
    compile: async () => ({ cmd: "javac", args: ["Solution.java", "Main.java"] }),
    execute: async () => ({ cmd: "java", args: ["Main"] }),
  };
}
