import { define } from "gunshi";
import {
  getAllWorktrees,
  removeWorktreeFromConfig,
} from "../../core/config.js";
import { findRepository } from "../../core/ghq.js";
import { listWorktrees } from "../../core/git.js";
import { existsSync } from "node:fs";
import { GhqWorktreeError } from "../../types/index.js";

export const cleanupCommand = define({
  name: "cleanup",
  description: "Clean up invalid worktrees and orphaned configuration entries",
  args: {
    "dry-run": {
      type: "boolean" as const,
      short: "d",
      description: "Show what would be cleaned up without actually doing it",
    },
  },
  run: async (ctx) => {
    const { "dry-run": dryRun } = ctx.values;

    try {
      console.log(`🧹 ${dryRun ? "Analyzing" : "Cleaning up"} worktrees...`);
      console.log();

      const allWorktrees = await getAllWorktrees();
      if (allWorktrees.length === 0) {
        console.log("No worktrees found.");
        return;
      }

      const toRemove: string[] = [];
      const toKeep: string[] = [];

      for (const worktree of allWorktrees) {
        console.log(
          `🔍 Checking slot ${worktree.slot}: ${worktree.repository} (${worktree.branch})`,
        );

        let shouldRemove = false;
        let reason = "";

        // Check if path exists
        if (!existsSync(worktree.path)) {
          shouldRemove = true;
          reason = "path does not exist";
        } else {
          // Check if repository still exists in ghq
          const repo = await findRepository(worktree.repository);
          if (!repo) {
            shouldRemove = true;
            reason = "repository not found in ghq";
          } else {
            // Check if worktree is still registered in git
            try {
              const gitWorktrees = await listWorktrees(repo.fullPath);
              const gitWorktree = gitWorktrees.find(
                (gw) => gw.path === worktree.path,
              );
              if (!gitWorktree) {
                shouldRemove = true;
                reason = "not registered in git worktree list";
              }
            } catch (error) {
              console.log(
                `   ⚠️  Could not check git worktrees: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              );
              // Don't remove in this case, might be a temporary issue
            }
          }
        }

        if (shouldRemove) {
          console.log(`   ❌ Invalid: ${reason}`);
          toRemove.push(worktree.id);
        } else {
          console.log(`   ✅ Valid`);
          toKeep.push(worktree.id);
        }
      }

      console.log();
      console.log(`📊 Summary:`);
      console.log(`   Valid worktrees: ${toKeep.length}`);
      console.log(`   Invalid worktrees: ${toRemove.length}`);

      if (toRemove.length === 0) {
        console.log(`🎉 All worktrees are valid! No cleanup needed.`);
        return;
      }

      if (dryRun) {
        console.log();
        console.log(
          `🔍 Dry run - would remove ${toRemove.length} invalid worktree${
            toRemove.length === 1 ? "" : "s"
          }:`,
        );
        for (const id of toRemove) {
          const worktree = allWorktrees.find((w) => w.id === id)!;
          console.log(
            `   - Slot ${worktree.slot}: ${worktree.repository} (${worktree.branch})`,
          );
        }
        console.log();
        console.log(
          `💡 Run without --dry-run to actually clean up these worktrees.`,
        );
      } else {
        console.log();
        console.log(
          `🗑️  Removing ${toRemove.length} invalid worktree${
            toRemove.length === 1 ? "" : "s"
          }...`,
        );

        for (const id of toRemove) {
          const worktree = allWorktrees.find((w) => w.id === id)!;
          console.log(
            `   Removing slot ${worktree.slot}: ${worktree.repository} (${worktree.branch})`,
          );
          await removeWorktreeFromConfig(id);
        }

        console.log(
          `🎉 Cleanup completed! Removed ${toRemove.length} invalid worktree${
            toRemove.length === 1 ? "" : "s"
          }.`,
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
