// Local, non-containerized execution: writes generated files to a fresh temp
// dir, optionally compiles, runs with a hard timeout, captures stdout/stderr.
// No sandboxing beyond the timeout -- accepted tradeoff for a personal,
// single-user tool running only the user's own practice code (Docker/Judge0
// wasn't available on this machine; see AGENTS.md "The judge").

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const TIMEOUT_MS = 10_000;

// The Next.js dev/build process itself runs under nvm's Node 20 (see
// web/.nvmrc), but a child_process spawned from an API route doesn't
// necessarily inherit nvm's shim on PATH -- resolve the same binary
// explicitly so executing submitted JS code doesn't silently fall back to
// the system's Node 12.
const NVM_NODE_CANDIDATES = [
  path.join(os.homedir(), ".nvm/versions/node/v20.20.2/bin/node"),
  process.execPath, // fallback: whatever node is currently running this process
];

async function resolveNodeBinary(): Promise<string> {
  for (const candidate of NVM_NODE_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return "node";
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
  failedStep?: "compile" | "run";
}

function run(cmd: string, args: string[], cwd: string, timeoutMs = TIMEOUT_MS): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const errAny = err as (NodeJS.ErrnoException & { killed?: boolean; signal?: string }) | null;
      const timedOut = !!errAny && errAny.killed === true && errAny.signal === "SIGTERM";
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        timedOut,
        exitCode: err ? (typeof err.code === "number" ? err.code : null) : 0,
      });
    });
  });
}

export interface HarnessFile {
  name: string;
  content: string;
}

export interface RunSpec {
  files: HarnessFile[];
  compile?: (dir: string) => Promise<{ cmd: string; args: string[] }>;
  execute: (dir: string) => Promise<{ cmd: string; args: string[] }>;
}

export async function runHarness(spec: RunSpec): Promise<ExecResult> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "algobench-judge-"));
  try {
    for (const f of spec.files) {
      await fs.writeFile(path.join(dir, f.name), f.content, "utf-8");
    }
    if (spec.compile) {
      const { cmd, args } = await spec.compile(dir);
      const compileResult = await run(cmd, args, dir, TIMEOUT_MS);
      if (compileResult.exitCode !== 0 || compileResult.timedOut) {
        return { ...compileResult, failedStep: "compile" };
      }
    }
    const { cmd, args } = await spec.execute(dir);
    const result = await run(cmd, args, dir, TIMEOUT_MS);
    return result.exitCode !== 0 || result.timedOut ? { ...result, failedStep: "run" } : result;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export { resolveNodeBinary };
