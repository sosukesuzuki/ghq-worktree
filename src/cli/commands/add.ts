import { define } from "gunshi";
import { findRepository } from "../../core/ghq.js";
import {
  createWorktree,
  branchExists,
  remoteBranchExists as checkRemoteBranchExists,
} from "../../core/git.js";
import {
  addWorktree,
  findAvailableSlot,
  isSlotAvailable,
  loadConfig,
} from "../../core/config.js";
import {
  generateWorktreeId,
  validateSlotNumber,
  formatWorktreePath,
} from "../../core/utils.js";
import { WorktreeInfo, GhqWorktreeError } from "../../types/index.js";

export const addCommand = define({
  name: "add",
  description: "Create new worktree for specified repository and branch",
  args: {
    repository: {
      type: "string" as const,
      description: "Repository query (fuzzy search supported)",
      required: true,
    },
    branch: {
      type: "string" as const,
      description: "Branch name to checkout",
      required: true,
    },
    slot: {
      type: "number" as const,
      short: "s",
      description: "Specific slot number (auto-assigned if omitted)",
    },
    create: {
      type: "boolean" as const,
      short: "c",
      description: "Create branch if it does not exist",
    },
  },
  run: async (ctx) => {
    const {
      repository: repoQuery,
      branch,
      slot: requestedSlot,
      create,
    } = ctx.values;

    if (!repoQuery) {
      throw new GhqWorktreeError(
        "Repository is required. Use --repository <repo>",
      );
    }

    if (!branch) {
      throw new GhqWorktreeError("Branch is required. Use --branch <branch>");
    }

    try {
      // Find repository
      console.log(`🔍 Searching for repository: ${repoQuery}`);
      const repo = await findRepository(repoQuery);
      if (!repo) {
        throw new GhqWorktreeError(`Repository not found: ${repoQuery}`);
      }
      console.log(`✅ Found repository: ${repo.name} at ${repo.fullPath}`);

      // Determine slot
      let slot: number;
      if (requestedSlot) {
        validateSlotNumber(requestedSlot);
        if (!(await isSlotAvailable(requestedSlot))) {
          throw new GhqWorktreeError(`Slot ${requestedSlot} is already in use`);
        }
        slot = requestedSlot;
      } else {
        slot = await findAvailableSlot();
      }

      // Check branch existence
      const localBranchExists = await branchExists(repo.fullPath, branch);
      const remoteBranchExists = await checkRemoteBranchExists(
        repo.fullPath,
        branch,
      );

      if (!localBranchExists && !remoteBranchExists && !create) {
        throw new GhqWorktreeError(
          `Branch '${branch}' does not exist. Use --create to create a new branch.`,
        );
      }

      // Generate worktree path
      const config = await loadConfig();
      const worktreePath = formatWorktreePath(
        config.config.baseDir,
        slot,
        repo.owner,
        repo.repo,
      );

      console.log(`📁 Creating worktree at: ${worktreePath}`);

      // Create worktree
      await createWorktree(
        repo.fullPath,
        worktreePath,
        branch,
        create || (!localBranchExists && remoteBranchExists),
      );

      // Save worktree info
      const worktreeInfo: WorktreeInfo = {
        id: generateWorktreeId(),
        slot,
        repository: repo.relativePath,
        branch,
        path: worktreePath,
        created: new Date().toISOString(),
      };

      await addWorktree(worktreeInfo);

      console.log(`🎉 Worktree created successfully!`);
      console.log(`   Repository: ${repo.name}`);
      console.log(`   Branch: ${branch}`);
      console.log(`   Slot: ${slot}`);
      console.log(`   Path: ${worktreePath}`);

      if (create && !localBranchExists && !remoteBranchExists) {
        console.log(`   ✨ New branch '${branch}' created`);
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
