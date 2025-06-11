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
      description: "Repository query",
    },
    slot: {
      type: "number" as const,
      description: "Slot number to switch to",
    },
  },
  run: async (ctx) => {
    const { repository: repoQuery, slot } = ctx.values;

    if (!repoQuery && !slot) {
      throw new GhqWorktreeError("Either repository or slot must be specified");
    }

    try {
      let worktreePath: string | undefined;

      if (slot) {
        // Switch by slot number
        const worktree = await getWorktreeBySlot(slot);
        if (!worktree) {
          throw new GhqWorktreeError(`No worktree found for slot ${slot}`);
        }
        worktreePath = worktree.path;
        console.log(
          `🔄 Switching to slot ${slot}: ${worktree.repository} (${worktree.branch})`,
        );
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

        // Use the first worktree (sorted by slot)
        worktrees.sort((a, b) => a.slot - b.slot);
        const worktree = worktrees[0]!;
        worktreePath = worktree.path;

        if (worktrees.length > 1) {
          console.log(
            `🔄 Multiple worktrees found for ${repo.name}, switching to slot ${worktree.slot} (${worktree.branch})`,
          );
          console.log(
            `   Other slots: ${worktrees
              .slice(1)
              .map((w) => `${w.slot} (${w.branch})`)
              .join(", ")}`,
          );
        } else {
          console.log(
            `🔄 Switching to ${repo.name} worktree: slot ${worktree.slot} (${worktree.branch})`,
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
