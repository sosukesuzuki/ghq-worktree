import { define } from "gunshi";
import {
  getWorktreesBySlot,
  removeWorktreeFromConfig,
  getAllWorktrees,
} from "../../core/config.js";
import { removeWorktree } from "../../core/git.js";
import { findRepository } from "../../core/ghq.js";
import { existsSync } from "node:fs";
import { GhqWorktreeError } from "../../types/index.js";

export const removeCommand = define({
  name: "remove",
  description: "Remove worktree by branch name or remove all worktrees",
  args: {
    branch: {
      type: "string" as const,
      short: "b",
      description: 'Branch name to remove, or "all" to remove all worktrees',
    },
    force: {
      type: "boolean" as const,
      short: "f",
      description: "Force removal even if worktree has uncommitted changes",
    },
    "config-only": {
      type: "boolean" as const,
      description: "Remove from config only (do not delete worktree directory)",
    },
  },
  run: async (ctx) => {
    const {
      branch: branchInput,
      force,
      "config-only": configOnly,
    } = ctx.values;

    // Default to "all" if no branch is provided
    const effectiveBranchInput = branchInput || "all";

    try {
      if (effectiveBranchInput === "all") {
        await removeAllWorktrees(force || false, configOnly || false);
      } else {
        await removeSingleWorktree(
          effectiveBranchInput,
          force || false,
          configOnly || false,
        );
      }
    } catch (error) {
      if (error instanceof GhqWorktreeError) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  },
});

async function removeSingleWorktree(
  branch: string,
  force: boolean,
  configOnly: boolean,
): Promise<void> {
  const worktrees = await getWorktreesBySlot(branch);
  if (worktrees.length === 0) {
    throw new GhqWorktreeError(`No worktree found for branch ${branch}`);
  }

  console.log(
    `🗑️  Removing ${worktrees.length} worktree${worktrees.length === 1 ? "" : "s"} from branch ${branch}:`,
  );

  for (const worktree of worktrees) {
    console.log(`   Repository: ${worktree.repository}`);
    console.log(`   Branch: ${worktree.branch}`);
    console.log(`   Path: ${worktree.path}`);

    const exists = existsSync(worktree.path);

    if (!configOnly && exists) {
      // Find the repository to get the main repo path for git commands
      const repo = await findRepository(worktree.repository);
      if (!repo) {
        console.log(`   ⚠️  Repository not found: ${worktree.repository}`);
        console.log(`   Removing from config only...`);
      } else {
        console.log(`   🔄 Removing git worktree...`);
        try {
          await removeWorktree(repo.fullPath, worktree.path, force);
          console.log(`   ✅ Git worktree removed successfully`);
        } catch (error) {
          console.log(
            `   ⚠️  Failed to remove git worktree: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          console.log(`   Removing from config only...`);
        }
      }
    } else if (!exists) {
      console.log(`   ⚠️  Worktree path does not exist: ${worktree.path}`);
      console.log(`   Removing from config only...`);
    }

    // Remove from config
    await removeWorktreeFromConfig(worktree.id);
    console.log(`   ✅ Worktree removed from configuration`);
    console.log();
  }
}

async function removeAllWorktrees(
  force: boolean,
  configOnly: boolean,
): Promise<void> {
  const worktrees = await getAllWorktrees();

  if (worktrees.length === 0) {
    console.log("No worktrees found to remove.");
    return;
  }

  console.log(`🗑️  Removing all ${worktrees.length} worktrees...`);
  console.log();

  for (const worktree of worktrees) {
    console.log(`📁 Branch ${worktree.branch}: ${worktree.repository}`);

    const exists = existsSync(worktree.path);

    if (!configOnly && exists) {
      const repo = await findRepository(worktree.repository);
      if (repo) {
        try {
          await removeWorktree(repo.fullPath, worktree.path, force);
          console.log(`   ✅ Git worktree removed`);
        } catch (error) {
          console.log(
            `   ⚠️  Failed to remove git worktree: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      } else {
        console.log(`   ⚠️  Repository not found, skipping git removal`);
      }
    } else if (!exists) {
      console.log(`   ⚠️  Path does not exist`);
    }

    await removeWorktreeFromConfig(worktree.id);
    console.log(`   ✅ Removed from config`);
    console.log();
  }

  console.log(`🎉 All worktrees removed successfully!`);
}
