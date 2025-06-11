import { define } from "gunshi";
import { getAllWorktrees, loadConfig } from "../../core/config.js";
import { findRepository } from "../../core/ghq.js";
import { getCurrentBranch, isWorktreeClean } from "../../core/git.js";
import { existsSync } from "node:fs";
import { GhqWorktreeError } from "../../types/index.js";

export const statusCommand = define({
  name: "status",
  description: "Show status of all worktrees and configuration",
  args: {
    repository: {
      type: "string" as const,
      description:
        "Repository query to show status for specific repository only",
    },
  },
  run: async (ctx) => {
    const { repository: repoQuery } = ctx.values;

    try {
      const config = await loadConfig();
      let worktrees = await getAllWorktrees();

      // Filter by repository if specified
      if (repoQuery) {
        const repo = await findRepository(repoQuery);
        if (!repo) {
          throw new GhqWorktreeError(`Repository not found: ${repoQuery}`);
        }
        worktrees = worktrees.filter((w) => w.repository === repo.relativePath);
      }

      console.log(`📊 Worktree Status Report`);
      console.log(`${"=".repeat(50)}`);
      console.log();

      // Configuration info
      console.log(`⚙️  Configuration:`);
      console.log(`   Config file: ~/.ghq-worktree.json`);
      console.log(`   Base directory: ${config.config.baseDir}`);
      console.log(`   ghq root: ${config.config.ghqRoot || "not set"}`);
      console.log(`   Max slots: ${config.config.maxSlots}`);
      console.log();

      // Slot usage
      const usedSlots = new Set(worktrees.map((w) => w.slot));
      const availableSlots = [];
      for (let i = 1; i <= config.config.maxSlots; i++) {
        if (!usedSlots.has(i)) {
          availableSlots.push(i);
        }
      }

      console.log(`📈 Slot Usage:`);
      console.log(`   Used slots: ${usedSlots.size}/${config.config.maxSlots}`);
      console.log(
        `   Available slots: ${availableSlots.length > 0 ? availableSlots.join(", ") : "none"}`,
      );
      console.log();

      if (worktrees.length === 0) {
        console.log(
          `📭 No worktrees found${repoQuery ? ` for repository: ${repoQuery}` : ""}.`,
        );
        console.log(
          `💡 Use "ghq-wt add <repository> <branch>" to create your first worktree.`,
        );
        return;
      }

      // Worktree details
      worktrees.sort((a, b) => a.slot - b.slot);

      console.log(`📋 Worktrees (${worktrees.length}):`);
      console.log();

      let validCount = 0;
      let invalidCount = 0;

      for (const worktree of worktrees) {
        const exists = existsSync(worktree.path);
        const status = exists ? "✅" : "❌";

        if (exists) validCount++;
        else invalidCount++;

        console.log(`${status} Slot ${worktree.slot}: ${worktree.repository}`);
        console.log(`   Branch: ${worktree.branch}`);
        console.log(`   Path: ${worktree.path}`);
        console.log(
          `   Created: ${new Date(worktree.created).toLocaleString()}`,
        );

        if (exists) {
          try {
            const currentBranch = await getCurrentBranch(worktree.path);
            const isClean = await isWorktreeClean(worktree.path);

            console.log(`   Current branch: ${currentBranch || "detached"}`);
            console.log(
              `   Working tree: ${isClean ? "🟢 clean" : "🟡 dirty"}`,
            );

            if (currentBranch !== worktree.branch) {
              console.log(
                `   ⚠️  Branch mismatch: expected '${worktree.branch}', current '${currentBranch}'`,
              );
            }
          } catch (error) {
            console.log(`   Status: ❌ unable to check git status`);
            console.log(
              `   Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        } else {
          console.log(`   Status: ❌ path does not exist`);
        }

        console.log();
      }

      // Summary
      console.log(`📈 Summary:`);
      console.log(`   Valid worktrees: ${validCount}`);
      console.log(`   Invalid worktrees: ${invalidCount}`);

      if (invalidCount > 0) {
        console.log();
        console.log(`💡 Use "ghq-wt cleanup" to remove invalid worktrees.`);
      }

      if (availableSlots.length === 0 && config.config.maxSlots < 10) {
        console.log();
        console.log(
          `💡 All slots are used. Consider increasing maxSlots in the config.`,
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
