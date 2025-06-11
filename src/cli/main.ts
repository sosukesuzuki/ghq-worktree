import { cli } from "gunshi";
import { addCommand } from "./commands/add.js";
import { listCommand } from "./commands/list.js";
import { removeCommand } from "./commands/remove.js";
import { switchCommand } from "./commands/switch.js";
import { cleanupCommand } from "./commands/cleanup.js";
import { statusCommand } from "./commands/status.js";

const mainCommand = {
  name: "ghq-wt",
  description:
    "A CLI tool for managing git worktrees with ghq repository organization",
  examples:
    "ghq-wt add ofro feature/new-auth\nghq-wt list\nghq-wt switch ofro 1\nghq-wt remove 1\nghq-wt status",
  run: async () => {
    console.log(
      "🌳 ghq-worktree - Git worktree management with ghq organization",
    );
    console.log();
    console.log("Available commands:");
    console.log(
      "  add       Create new worktree for specified repository and branch",
    );
    console.log(
      "  list      List all worktrees or worktrees for a specific repository",
    );
    console.log("  switch    Switch to worktree directory");
    console.log(
      "  remove    Remove worktree by slot number or remove all worktrees",
    );
    console.log(
      "  cleanup   Clean up invalid worktrees and orphaned configuration entries",
    );
    console.log("  status    Show status of all worktrees and configuration");
    console.log();
    console.log(
      'Use "ghq-wt <command> --help" for more information about a command.',
    );
    console.log();
    console.log("Examples:");
    console.log(
      "  ghq-wt add my-repo feature/new-feature    # Create worktree for branch",
    );
    console.log(
      "  ghq-wt add my-repo hotfix --create        # Create new branch and worktree",
    );
    console.log(
      "  ghq-wt list                               # Show all worktrees",
    );
    console.log(
      "  ghq-wt switch my-repo 1                   # Switch to slot 1 of repository",
    );
    console.log(
      "  ghq-wt remove 1                           # Remove worktree in slot 1",
    );
    console.log(
      "  ghq-wt status                             # Show detailed status",
    );
  },
};

const subCommands = new Map();
subCommands.set("add", addCommand);
subCommands.set("list", listCommand);
subCommands.set("switch", switchCommand);
subCommands.set("remove", removeCommand);
subCommands.set("cleanup", cleanupCommand);
subCommands.set("status", statusCommand);

export async function runCli(args: string[]) {
  try {
    await cli(args, mainCommand, { subCommands });
  } catch (error) {
    console.error(
      "💥 Unexpected error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}
