# ghq-worktree

A CLI tool for managing git worktrees with [ghq](https://github.com/x-motemen/ghq) repository organization. This tool enables efficient parallel development workflows by creating isolated worktrees while maintaining the organized structure that ghq provides.

## Features

- 🌳 **Git worktree management**: Create, list, switch, and remove git worktrees
- 📁 **ghq integration**: Seamlessly works with ghq-managed repositories
- 🎯 **Slot-based organization**: Organize worktrees in numbered slots (`~/ghq-worktree-1/`, `~/ghq-worktree-2/`, etc.)
- 🔍 **Fuzzy repository search**: Find repositories by partial names or paths
- 🧹 **Automatic cleanup**: Detect and remove invalid or orphaned worktrees
- ⚙️ **Configuration management**: Persistent settings via JSON configuration file
- 🚀 **Type-safe**: Built with TypeScript and [gunshi](https://github.com/kazupon/gunshi) CLI framework

## Prerequisites

- Node.js >= 20
- [ghq](https://github.com/x-motemen/ghq) installed and configured
- Git repositories managed by ghq

## Installation

```bash
# Clone and build
git clone <repository-url>
cd ghq-worktree
pnpm install
pnpm build

# Install globally (optional)
npm link
```

## Usage

### Basic Commands

```bash
# Create a new worktree
ghq-wt add <repository> <branch> [options]

# List all worktrees
ghq-wt list [repository] [options]

# Switch to a worktree
ghq-wt switch <repository|slot> [options]

# Remove a worktree
ghq-wt remove <slot|"all"> [options]

# Clean up invalid worktrees
ghq-wt cleanup [options]

# Show detailed status
ghq-wt status [repository]
```

## Commands Reference

### `add` - Create New Worktree

Create a new worktree for a specified repository and branch.

```bash
ghq-wt add <repository> <branch> [options]
```

**Arguments:**

- `repository` - Repository query (supports fuzzy search)
- `branch` - Branch name to checkout

**Options:**

- `-s, --slot <number>` - Specific slot number (auto-assigned if omitted)
- `-c, --create` - Create branch if it does not exist
- `-h, --help` - Display help for command

**Examples:**

```bash
# Create worktree for existing branch
ghq-wt add my-project feature/auth-improvement

# Create worktree with specific slot
ghq-wt add my-project hotfix/urgent-bug --slot 3

# Create new branch and worktree
ghq-wt add my-project feature/new-feature --create
```

### `list` - List Worktrees

List all worktrees or worktrees for a specific repository.

```bash
ghq-wt list [repository] [options]
```

**Arguments:**

- `repository` - Repository query to filter worktrees (optional)

**Options:**

- `-v, --verbose` - Show detailed information including git status
- `-h, --help` - Display help for command

**Examples:**

```bash
# List all worktrees
ghq-wt list

# List worktrees for specific repository
ghq-wt list my-project

# Show detailed information
ghq-wt list --verbose
```

### `switch` - Switch to Worktree

Switch to a worktree directory (prints path for shell navigation).

```bash
ghq-wt switch <repository|slot> [options]
```

**Arguments:**

- `repository` - Repository query
- `slot` - Slot number to switch to

**Options:**

- `-h, --help` - Display help for command

**Examples:**

```bash
# Switch by repository (uses first available worktree)
ghq-wt switch my-project

# Switch by slot number
ghq-wt switch --slot 2

# Shell integration helper function
gw() { cd "$(ghq-wt switch "$@" | grep "^📁 Path:" | cut -d" " -f3-)"; }
```

### `remove` - Remove Worktree

Remove worktree by slot number or remove all worktrees.

```bash
ghq-wt remove <slot|"all"> [options]
```

**Arguments:**

- `slot` - Slot number to remove, or "all" to remove all worktrees

**Options:**

- `-f, --force` - Force removal even if worktree has uncommitted changes
- `--config-only` - Remove from config only (do not delete worktree directory)
- `-h, --help` - Display help for command

**Examples:**

```bash
# Remove specific worktree
ghq-wt remove 1

# Force remove with uncommitted changes
ghq-wt remove 2 --force

# Remove all worktrees
ghq-wt remove all

# Remove from config only
ghq-wt remove 1 --config-only
```

### `cleanup` - Clean Up Invalid Worktrees

Clean up invalid worktrees and orphaned configuration entries.

```bash
ghq-wt cleanup [options]
```

**Options:**

- `-d, --dry-run` - Show what would be cleaned up without actually doing it
- `-h, --help` - Display help for command

**Examples:**

```bash
# Preview cleanup actions
ghq-wt cleanup --dry-run

# Perform cleanup
ghq-wt cleanup
```

### `status` - Show Status

Show status of all worktrees and configuration.

```bash
ghq-wt status [repository]
```

**Arguments:**

- `repository` - Repository query to show status for specific repository only

**Options:**

- `-h, --help` - Display help for command

**Examples:**

```bash
# Show status of all worktrees
ghq-wt status

# Show status for specific repository
ghq-wt status my-project
```

## Configuration

The tool uses a JSON configuration file located at `~/.ghq-worktree.json`:

```json
{
  "worktrees": {
    "wt_1234567890_abc123": {
      "id": "wt_1234567890_abc123",
      "slot": 1,
      "repository": "github.com/user/repo",
      "branch": "feature/new-feature",
      "path": "/Users/user/ghq-worktree-1/user/repo",
      "created": "2024-01-15T10:30:00.000Z"
    }
  },
  "config": {
    "maxSlots": 5,
    "baseDir": "/Users/user",
    "ghqRoot": "/Users/user/ghq"
  }
}
```

**Configuration Options:**

- `maxSlots` - Maximum number of parallel worktree slots (default: 5)
- `baseDir` - Base directory for worktree creation (default: home directory)
- `ghqRoot` - Path to ghq root directory (auto-detected)

## Directory Structure

```
~/ghq/github.com/user/repo/          # Main repository (ghq-managed)
~/ghq-worktree-1/user/repo/          # Worktree slot 1
~/ghq-worktree-2/user/repo/          # Worktree slot 2
~/ghq-worktree-3/user/repo/          # Worktree slot 3
```

## Shell Integration

For easier navigation, add this function to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Quick worktree navigation
gw() {
  local path=$(ghq-wt switch "$@" 2>&1 | tail -1)
  if [[ -d "$path" ]]; then
    cd "$path"
  else
    echo "Failed to switch to worktree"
    return 1
  fi
}
```

Then use:

```bash
gw my-project      # Switch to first worktree of my-project
gw --slot 2        # Switch to worktree in slot 2
```

## Error Handling

The tool provides clear error messages and appropriate exit codes:

- **Exit Code 0**: Success
- **Exit Code 1**: General error (missing repository, invalid slot, etc.)

Common error scenarios:

- Repository not found in ghq
- Branch does not exist (use `--create` to create)
- Slot already in use
- No available slots (increase `maxSlots` in config)
- Worktree path does not exist

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build
pnpm build

# Run built version
pnpm start
```

## Examples

### Typical Workflow

```bash
# 1. Create worktree for feature development
ghq-wt add my-app feature/user-authentication

# 2. Create another worktree for bug fix
ghq-wt add my-app hotfix/login-issue --slot 2

# 3. List current worktrees
ghq-wt list my-app

# 4. Switch between worktrees
ghq-wt switch my-app     # Switch to slot 1 (feature branch)
ghq-wt switch --slot 2   # Switch to slot 2 (hotfix branch)

# 5. Check status
ghq-wt status

# 6. Clean up when done
ghq-wt remove 1
ghq-wt remove 2
```

### Working with Multiple Projects

```bash
# Create worktrees for different projects
ghq-wt add frontend feature/redesign
ghq-wt add backend feature/api-v2
ghq-wt add docs update/installation

# List all active worktrees
ghq-wt list

# Clean up invalid worktrees
ghq-wt cleanup --dry-run
ghq-wt cleanup
```

## License

MIT
