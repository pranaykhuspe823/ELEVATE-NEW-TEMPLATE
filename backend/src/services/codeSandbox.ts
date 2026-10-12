import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

export type SandboxLanguage = "javascript" | "python" | "c" | "cpp";

export interface SandboxResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  exitCode: number | null;
  compileError: string | null;
}

const RUN_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 10000;
const GCC_BIN = process.env.GCC_PATH || "gcc";
const GPP_BIN = process.env.GPP_PATH || "g++";

// Candidate code must never inherit the backend's environment -- it holds
// DATABASE_URL, SESSION_SECRET and API keys, and `print(os.environ)` would
// leak them all. Pass only what compilers/interpreters need to start.
const SANDBOX_ENV_KEYS = [
  "PATH",
  "SystemRoot",
  "SYSTEMROOT",
  "windir",
  "TEMP",
  "TMP",
  "TMPDIR",
  "LANG",
  "PATHEXT",
  "COMSPEC",
];
function sandboxEnv(cwd: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of SANDBOX_ENV_KEYS) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.HOME = cwd;
  env.USERPROFILE = cwd;
  env.PYTHONDONTWRITEBYTECODE = "1";
  env.PYTHONIOENCODING = "utf-8";
  return env;
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: sandboxEnv(cwd),
      timeout: timeoutMs,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const killTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      if (stdout.length < 20000) stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < 20000) stderr += d.toString();
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      resolve({ stdout, stderr, timedOut, exitCode: code });
    });

    child.on("error", (err) => {
      clearTimeout(killTimer);
      resolve({ stdout, stderr: stderr + err.message, timedOut, exitCode: null });
    });
  });
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = path.join(os.tmpdir(), `elevate-code-${crypto.randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runJavaScript(fullCode: string): Promise<SandboxResult> {
  return withTempDir(async (dir) => {
    const file = path.join(dir, "main.js");
    await fs.writeFile(file, fullCode, "utf-8");
    const { stdout, stderr, timedOut, exitCode } = await runProcess(
      "node",
      [file],
      dir,
      RUN_TIMEOUT_MS
    );
    return { stdout, stderr, timedOut, exitCode, compileError: null };
  });
}

async function runPython(fullCode: string): Promise<SandboxResult> {
  return withTempDir(async (dir) => {
    const file = path.join(dir, "main.py");
    await fs.writeFile(file, fullCode, "utf-8");
    const { stdout, stderr, timedOut, exitCode } = await runProcess(
      "python",
      [file],
      dir,
      RUN_TIMEOUT_MS
    );
    return { stdout, stderr, timedOut, exitCode, compileError: null };
  });
}

async function runC(fullCode: string): Promise<SandboxResult> {
  return withTempDir(async (dir) => {
    const srcFile = path.join(dir, "main.c");
    const exeFile = path.join(dir, "main.exe");
    await fs.writeFile(srcFile, fullCode, "utf-8");

    const compile = await runProcess(
      GCC_BIN,
      [srcFile, "-O0", "-o", exeFile],
      dir,
      COMPILE_TIMEOUT_MS
    );
    if (compile.exitCode !== 0 || compile.timedOut) {
      return {
        stdout: "",
        stderr: "",
        timedOut: compile.timedOut,
        exitCode: compile.exitCode,
        compileError: compile.stderr || "Compilation failed.",
      };
    }

    const { stdout, stderr, timedOut, exitCode } = await runProcess(
      exeFile,
      [],
      dir,
      RUN_TIMEOUT_MS
    );
    return { stdout, stderr, timedOut, exitCode, compileError: null };
  });
}

async function runCpp(fullCode: string): Promise<SandboxResult> {
  return withTempDir(async (dir) => {
    const srcFile = path.join(dir, "main.cpp");
    const exeFile = path.join(dir, "main.exe");
    await fs.writeFile(srcFile, fullCode, "utf-8");

    const compile = await runProcess(
      GPP_BIN,
      [srcFile, "-O0", "-std=c++17", "-o", exeFile],
      dir,
      COMPILE_TIMEOUT_MS
    );
    if (compile.exitCode !== 0 || compile.timedOut) {
      return {
        stdout: "",
        stderr: "",
        timedOut: compile.timedOut,
        exitCode: compile.exitCode,
        compileError: compile.stderr || "Compilation failed.",
      };
    }

    const { stdout, stderr, timedOut, exitCode } = await runProcess(
      exeFile,
      [],
      dir,
      RUN_TIMEOUT_MS
    );
    return { stdout, stderr, timedOut, exitCode, compileError: null };
  });
}

/**
 * Runs untrusted candidate code in a throwaway temp directory with a hard
 * timeout that force-kills the process. This is best-effort process
 * isolation (timeout + a scratch dir cleaned up afterward), not a true
 * container sandbox -- there's no Docker/gVisor-style boundary here, so it
 * does not fully block file or network access. The backend's environment
 * (secrets) is not passed through; see sandboxEnv. Acceptable for a
 * single-tenant dev tool; would need real containerization before ever
 * running submissions from untrusted strangers at scale.
 */
export async function runInSandbox(
  language: SandboxLanguage,
  fullCode: string
): Promise<SandboxResult> {
  switch (language) {
    case "javascript":
      return runJavaScript(fullCode);
    case "python":
      return runPython(fullCode);
    case "c":
      return runC(fullCode);
    case "cpp":
      return runCpp(fullCode);
  }
}
