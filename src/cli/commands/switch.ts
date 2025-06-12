import { define } from "gunshi";
import {
  getWorktreeBySlot,
  getWorktreesByRepository,
} from "../../core/config.js";
import { findRepository } from "../../core/ghq.js";
import { existsSync } from "node:fs";
import { GhqWorktreeError } from "../../types/index.js";

export const switchCommand = define({
  name: "switch",
  description:
    "Switch to worktree directory (prints path for shell navigation)",
  args: {
    repository: {
      type: "string" as const,
      short: "r",
      description: "Repository query",
    },
    branch: {
      type: "string" as const,
      short: "b",
      description: "Branch name to switch to",
    },
  },
  run: async (ctx) => {
    const { repository: repoQuery, branch } = ctx.values;

    if (!repoQuery && !branch) {
      throw new GhqWorktreeError(
        "Either repository or branch must be specified",
      );
    }

    try {
      let worktreePath: string | undefined;

      if (branch) {
        // Switch by branch name
        const worktree = await getWorktreeBySlot(branch);
        if (!worktree) {
          throw new GhqWorktreeError(`No worktree found for branch ${branch}`);
        }
        worktreePath = worktree.path;
        console.log(`🔄 Switching to branch ${branch}: ${worktree.repository}`);
      } else if (repoQuery) {
        // Switch by repository (use first available worktree)
        const repo = await findRepository(repoQuery);
        if (!repo) {
          throw new GhqWorktreeError(`Repository not found: ${repoQuery}`);
        }

        const worktrees = await getWorktreesByRepository(repo.relativePath);
        if (worktrees.length === 0) {
          throw new GhqWorktreeError(
            `No worktrees found for repository: ${repo.name}`,
          );
        }

        // Use the first worktree (sorted by branch)
        worktrees.sort((a, b) => a.slot.localeCompare(b.slot));
        const worktree = worktrees[0]!;
        worktreePath = worktree.path;

        if (worktrees.length > 1) {
          console.log(
            `🔄 Multiple worktrees found for ${repo.name}, switching to branch ${worktree.branch}`,
          );
          console.log(
            `   Other branches: ${worktrees
              .slice(1)
              .map((w) => w.branch)
              .join(", ")}`,
          );
        } else {
          console.log(
            `🔄 Switching to ${repo.name} worktree: branch ${worktree.branch}`,
          );
        }
      }

      // Check if worktreePath is defined and path exists
      if (!worktreePath) {
        throw new GhqWorktreeError("Unable to determine worktree path");
      }

      if (!existsSync(worktreePath)) {
        throw new GhqWorktreeError(
          `Worktree path does not exist: ${worktreePath}`,
        );
      }

      // Output the path for shell integration
      console.log(`📁 Path: ${worktreePath}`);
      console.log();
      console.log("💡 To navigate to this directory, use:");
      console.log(`   cd "${worktreePath}"`);
      console.log();
      console.log(
        "💡 Or add this function to your shell profile for easy switching:",
      );
      console.log(
        '   gw() { cd "$(ghq-wt switch "$@" | grep "^📁 Path:" | cut -d" " -f3-)"; }',
      );

      // Output just the path to stderr for potential shell integration
      console.error(worktreePath);
    } catch (error) {
      if (error instanceof GhqWorktreeError) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  },
});
