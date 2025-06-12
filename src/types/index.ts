export interface WorktreeInfo {
  id: string;
  slot: string;
  repository: string;
  branch: string;
  path: string;
  created: string;
  active?: boolean;
}

export interface GhqWorktreeConfig {
  worktrees: Record<string, WorktreeInfo>;
  config: {
    maxSlots: number;
    baseDir: string;
    ghqRoot?: string;
  };
}

export interface Repository {
  name: string;
  fullPath: string;
  relativePath: string;
  host: string;
  owner: string;
  repo: string;
}

export interface GitWorktreeListItem {
  path: string;
  commit: string;
  branch?: string;
  bare?: boolean;
  detached?: boolean;
  locked?: boolean;
  prunable?: boolean;
}

export class GhqWorktreeError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "GhqWorktreeError";
  }
}

export class GitError extends GhqWorktreeError {
  constructor(
    message: string,
    public exitCode?: number,
  ) {
    super(message, "GIT_ERROR");
    this.name = "GitError";
  }
}

export class GhqError extends GhqWorktreeError {
  constructor(
    message: string,
    public exitCode?: number,
  ) {
    super(message, "GHQ_ERROR");
    this.name = "GhqError";
  }
}
