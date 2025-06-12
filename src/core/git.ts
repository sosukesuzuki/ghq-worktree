import { execCommand } from "./utils.js";
import { GitWorktreeListItem, GitError } from "../types/index.js";

export async function listWorktrees(
  repoPath: string,
): Promise<GitWorktreeListItem[]> {
  try {
    const result = await execCommand(
      "git",
      ["worktree", "list", "--porcelain"],
      { cwd: repoPath },
    );
    if (result.exitCode !== 0) {
      throw new GitError(
        `Failed to list worktrees: ${result.stderr}`,
        result.exitCode,
      );
    }

    const worktrees: GitWorktreeListItem[] = [];
    const lines = result.stdout.split("\n");
    let current: Partial<GitWorktreeListItem> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (current.path) {
          worktrees.push(current as GitWorktreeListItem);
        }
        current = { path: line.substring(9) };
      } else if (line.startsWith("HEAD ")) {
        current.commit = line.substring(5);
      } else if (line.startsWith("branch ")) {
        current.branch = line.substring(7);
      } else if (line === "bare") {
        current.bare = true;
      } else if (line === "detached") {
        current.detached = true;
      } else if (line === "locked") {
        current.locked = true;
      } else if (line === "prunable") {
        current.prunable = true;
      }
    }

    if (current.path) {
      worktrees.push(current as GitWorktreeListItem);
    }

    return worktrees;
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError("Failed to list git worktrees");
  }
}

export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
  createBranch = false,
): Promise<void> {
  const args = ["worktree", "add"];

  if (createBranch) {
    // Create new branch from HEAD (current branch)
    args.push("-b", branch, worktreePath, "HEAD");
  } else {
    args.push(worktreePath, branch);
  }

  try {
    const result = await execCommand("git", args, { cwd: repoPath });
    if (result.exitCode !== 0) {
      throw new GitError(
        `Failed to create worktree: ${result.stderr}`,
        result.exitCode,
      );
    }
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to create worktree at ${worktreePath}`);
  }
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force = false,
): Promise<void> {
  const args = ["worktree", "remove"];

  if (force) {
    args.push("--force");
  }

  args.push(worktreePath);

  try {
    const result = await execCommand("git", args, { cwd: repoPath });
    if (result.exitCode !== 0) {
      throw new GitError(
        `Failed to remove worktree: ${result.stderr}`,
        result.exitCode,
      );
    }
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to remove worktree at ${worktreePath}`);
  }
}

export async function branchExists(
  repoPath: string,
  branchName: string,
): Promise<boolean> {
  try {
    const result = await execCommand(
      "git",
      ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      {
        cwd: repoPath,
      },
    );
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function remoteBranchExists(
  repoPath: string,
  branchName: string,
  remote = "origin",
): Promise<boolean> {
  try {
    const result = await execCommand(
      "git",
      [
        "show-ref",
        "--verify",
        "--quiet",
        `refs/remotes/${remote}/${branchName}`,
      ],
      {
        cwd: repoPath,
      },
    );
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function getCurrentBranch(
  repoPath: string,
): Promise<string | null> {
  try {
    const result = await execCommand("git", ["branch", "--show-current"], {
      cwd: repoPath,
    });
    if (result.exitCode === 0 && result.stdout) {
      return result.stdout;
    }
    return null;
  } catch {
    return null;
  }
}

export async function isWorktreeClean(worktreePath: string): Promise<boolean> {
  try {
    const result = await execCommand("git", ["status", "--porcelain"], {
      cwd: worktreePath,
    });
    return result.exitCode === 0 && result.stdout === "";
  } catch {
    return false;
  }
}
