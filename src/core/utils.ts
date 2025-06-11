import { spawn } from "node:child_process";
import { GhqWorktreeError } from "../types/index.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = options.timeout
      ? setTimeout(() => {
          child.kill("SIGTERM");
          reject(
            new GhqWorktreeError(
              `Command timeout: ${command} ${args.join(" ")}`,
            ),
          );
        }, options.timeout)
      : null;

    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
      });
    });

    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      reject(
        new GhqWorktreeError(`Failed to execute command: ${error.message}`),
      );
    });
  });
}

export function parseRepositoryPath(repoPath: string): {
  host: string;
  owner: string;
  repo: string;
} {
  const parts = repoPath.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 3) {
    throw new GhqWorktreeError(`Invalid repository path format: ${repoPath}`);
  }

  const [host, owner, repo] = parts.slice(-3);
  return { host: host!, owner: owner!, repo: repo! };
}

export function generateWorktreeId(): string {
  return `wt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function validateSlotNumber(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1) {
    throw new GhqWorktreeError(
      `Invalid slot number: ${slot}. Must be a positive integer.`,
    );
  }
}

export function formatWorktreePath(
  baseDir: string,
  slot: number,
  owner: string,
  repo: string,
): string {
  return `${baseDir}/ghq-worktree-${slot}/${owner}/${repo}`;
}
