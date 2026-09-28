import { getProblem, Problem } from "../problems";
import { classifyProblemSupport, extractSignature } from "./signature";
import { bindExampleArgs, parseExpectedOutput } from "./binder";
import { literalsEqual, LiteralValue } from "./literals";
import { runHarness } from "./runner";
import { RESULT_MARKER } from "./codegen/emit";
import { buildJavaRunSpec } from "./codegen/java";
import { buildCppRunSpec } from "./codegen/cpp";
import { buildPythonRunSpec } from "./codegen/python";
import { buildJavaScriptRunSpec } from "./codegen/javascript";

export interface ExampleResult {
  exampleIndex: number;
  pass: boolean;
  expected: LiteralValue | null;
  actual: LiteralValue | null;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface SubmitResult {
  supported: boolean;
  reason?: string;
  results: ExampleResult[];
  allPassed: boolean;
}

function parseResultFromStdout(stdout: string): LiteralValue | null {
  const lines = stdout.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const idx = lines[i].indexOf(RESULT_MARKER);
    if (idx !== -1) {
      try {
        return JSON.parse(lines[i].slice(idx + RESULT_MARKER.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

type Builder = (
  code: string,
  reference: import("./signature").MethodSignature,
  args: LiteralValue[],
  expectedName: { className: string | null; methodName: string },
) => import("./runner").RunSpec;

const BUILDERS: Record<string, Builder> = {
  java: buildJavaRunSpec,
  cpp: buildCppRunSpec,
  python3: buildPythonRunSpec,
  javascript: buildJavaScriptRunSpec,
};

export async function submit(patternSlug: string, problemSlug: string, language: string, code: string): Promise<SubmitResult> {
  const problem: Problem | null = getProblem(patternSlug, problemSlug);
  if (!problem) throw new Error("problem not found");

  const support = classifyProblemSupport(problem.starterCode ?? {});
  if (!support.supported || !support.reference) {
    return { supported: false, reason: support.reason, results: [], allPassed: false };
  }

  const builder = BUILDERS[language];
  if (!builder) {
    return { supported: false, reason: `Unsupported language '${language}'.`, results: [], allPassed: false };
  }

  // The expected method (and, for Java/C++, class) name is derived once from
  // this language's pristine starter code, which always has the TODO marker.
  // A real submission may have no TODO left at all (see codegen/*.ts) -- the
  // per-example harness builders locate the method by this known name.
  const starterCode = problem.starterCode?.[language];
  const starterSig = starterCode ? extractSignature(language, starterCode) : null;
  if (!starterSig) {
    return {
      supported: false,
      reason: `Could not determine the expected function/method name for '${language}' from this problem's starter code.`,
      results: [],
      allPassed: false,
    };
  }
  const expectedName = { className: starterSig.className, methodName: starterSig.methodName };

  if (!problem.examples || problem.examples.length === 0) {
    return {
      supported: true,
      reason: "No example test cases were available for this problem in the source material.",
      results: [],
      allPassed: false,
    };
  }

  const results: ExampleResult[] = [];
  for (let i = 0; i < problem.examples.length; i++) {
    const ex = problem.examples[i];
    const bind = bindExampleArgs(ex.input, support.reference);
    const expected = parseExpectedOutput(ex.output);

    if (!bind.ok || expected === null) {
      results.push({
        exampleIndex: i,
        pass: false,
        expected,
        actual: null,
        stdout: "",
        stderr: "",
        error: !bind.ok ? bind.error : "could not parse expected output for this example",
      });
      continue;
    }

    try {
      const spec = builder(code, support.reference, bind.args, expectedName);
      const execResult = await runHarness(spec);
      if (execResult.failedStep) {
        results.push({
          exampleIndex: i,
          pass: false,
          expected,
          actual: null,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          error: execResult.timedOut
            ? "Execution timed out."
            : `${execResult.failedStep === "compile" ? "Compilation" : "Execution"} failed.`,
        });
        continue;
      }
      const actual = parseResultFromStdout(execResult.stdout);
      results.push({
        exampleIndex: i,
        pass: actual !== null && literalsEqual(actual, expected),
        expected,
        actual,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
      });
    } catch (e) {
      results.push({
        exampleIndex: i,
        pass: false,
        expected,
        actual: null,
        stdout: "",
        stderr: "",
        error: (e as Error).message,
      });
    }
  }

  return {
    supported: true,
    results,
    allPassed: results.length > 0 && results.every((r) => r.pass),
  };
}
