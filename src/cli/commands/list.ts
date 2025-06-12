import { define } from "gunshi";
import {
  getAllWorktrees,
  getWorktreesByRepository,
} from "../../core/config.js";
import { findRepository } from "../../core/ghq.js";
import { isWorktreeClean, getCurrentBranch } from "../../core/git.js";
import { existsSync } from "node:fs";
import { GhqWorktreeError } from "../../types/index.js";

export const listCommand = define({
  name: "list",
  description: "List all worktrees or worktrees for a specific repository",
  args: {
    repository: {
      type: "string" as const,
      short: "r",
      description: "Repository query to filter worktrees (optional)",
    },
    verbose: {
      type: "boolean" as const,
      short: "v",
      description: "Show detailed information",
    },
  },
  run: async (ctx) => {
    const { repository: repoQuery, verbose } = ctx.values;

    try {
      let worktrees = await getAllWorktrees();

      // Filter by repository if specified
      if (repoQuery) {
        const repo = await findRepository(repoQuery);
        if (!repo) {
          throw new GhqWorktreeError(`Repository not found: ${repoQuery}`);
        }
        worktrees = await getWorktreesByRepository(repo.relativePath);
      }

      if (worktrees.length === 0) {
        if (repoQuery) {
          console.log(`No worktrees found for repository: ${repoQuery}`);
        } else {
          console.log('No worktrees found. Use "ghq-wt add" to create one.');
        }
        return;
      }

      // Sort by branch name
      worktrees.sort((a, b) => a.slot.localeCompare(b.slot));

      console.log(
        `📋 Found ${worktrees.length} worktree${worktrees.length === 1 ? "" : "s"}:`,
      );
      console.log();

      for (const worktree of worktrees) {
        const exists = existsSync(worktree.path);
        const status = exists ? "✅" : "❌";

        console.log(
          `${status} Branch ${worktree.branch}: ${worktree.repository}`,
        );
        console.log(`   Path: ${worktree.path}`);

        if (verbose) {
          console.log(`   ID: ${worktree.id}`);
          console.log(
            `   Created: ${new Date(worktree.created).toLocaleString()}`,
          );

          if (exists) {
            try {
              const currentBranch = await getCurrentBranch(worktree.path);
              const isClean = await isWorktreeClean(worktree.path);

              console.log(`   Current Branch: ${currentBranch || "detached"}`);
              console.log(`   Status: ${isClean ? "clean" : "dirty"}`);
            } catch (error) {
              console.log(
                `   Status: unable to check (${error instanceof Error ? error.message : "unknown error"})`,
              );
            }
          } else {
            console.log(`   Status: path does not exist`);
          }
        } else if (!exists) {
          console.log(`   ⚠️  Path does not exist`);
        }

        console.log();
      }

      if (!verbose && worktrees.some((w) => !existsSync(w.path))) {
        console.log("💡 Use --verbose (-v) to see detailed status information");
        console.log('💡 Use "ghq-wt cleanup" to remove invalid worktrees');
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
