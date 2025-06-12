# ghq-worktree

A CLI tool for managing git worktrees with [ghq](https://github.com/x-motemen/ghq) repository organization. This tool enables efficient parallel development workflows by creating isolated worktrees while maintaining the organized structure that ghq provides.

## Features

- 🌳 **Git worktree management**: Create, list, switch, and remove git worktrees
- 📁 **ghq integration**: Seamlessly works with ghq-managed repositories
- 🎯 **Branch-based organization**: Organize worktrees by branch names (`~/ghq-worktree-feature_auth/`, `~/ghq-worktree-hotfix_bug/`, etc.)
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
ghq-wt switch <repository|branch> [options]

# Remove a worktree
ghq-wt remove <branch|"all"> [options]

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

- `-h, --help` - Display help for command

**Examples:**

```bash
# Create worktree for existing branch
ghq-wt add my-project feature/auth-improvement

# Create worktree (automatically creates branch if it doesn't exist)
ghq-wt add my-project feature/new-feature

# Multiple repositories with same branch name will share the same slot
ghq-wt add repo-a feature/auth
ghq-wt add repo-b feature/auth  # Goes into same slot as repo-a
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
ghq-wt switch <repository|branch> [options]
```

**Arguments:**

- `repository` - Repository query
- `branch` - Branch name to switch to

**Options:**

- `-h, --help` - Display help for command

**Examples:**

```bash
# Switch by repository (uses first available worktree)
ghq-wt switch my-project

# Switch by branch name
ghq-wt switch --branch feature/auth

# Shell integration helper function
gw() { cd "$(ghq-wt switch "$@" | grep "^📁 Path:" | cut -d" " -f3-)"; }
```

### `remove` - Remove Worktree

Remove worktree by branch name or remove all worktrees.

```bash
ghq-wt remove <branch|"all"> [options]
```

**Arguments:**

- `branch` - Branch name to remove, or "all" to remove all worktrees

**Options:**

- `-f, --force` - Force removal even if worktree has uncommitted changes
- `--config-only` - Remove from config only (do not delete worktree directory)
- `-h, --help` - Display help for command

**Examples:**

```bash
# Remove specific worktree by branch name
ghq-wt remove --branch feature/auth

# Force remove with uncommitted changes
ghq-wt remove --branch hotfix/bug --force

# Remove all worktrees
ghq-wt remove all

# Remove from config only
ghq-wt remove --branch feature/auth --config-only
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
      "slot": "feature/new-feature",
      "repository": "github.com/user/repo",
      "branch": "feature/new-feature",
      "path": "/Users/user/ghq-worktree-feature_new-feature/user/repo",
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

- `maxSlots` - Maximum number of parallel worktree slots (default: 5, not enforced in branch-based mode)
- `baseDir` - Base directory for worktree creation (default: home directory)
- `ghqRoot` - Path to ghq root directory (auto-detected)

## Directory Structure

```
~/ghq/github.com/user/repo/               # Main repository (ghq-managed)
~/ghq-worktree-feature_auth/user/repo/    # Worktree for feature/auth branch
~/ghq-worktree-hotfix_bug/user/repo/      # Worktree for hotfix/bug branch
~/ghq-worktree-main/user/repo/            # Worktree for main branch
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
gw my-project              # Switch to first worktree of my-project
gw --branch feature/auth   # Switch to feature/auth branch worktree
```

## Error Handling

The tool provides clear error messages and appropriate exit codes:

- **Exit Code 0**: Success
- **Exit Code 1**: General error (missing repository, invalid slot, etc.)

Common error scenarios:

- Repository not found in ghq
- Worktree path does not exist
- Branch name contains invalid characters

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
ghq-wt add my-app hotfix/login-issue

# 3. List current worktrees
ghq-wt list my-app

# 4. Switch between worktrees
ghq-wt switch my-app                          # Switch to first available (feature branch)
ghq-wt switch --branch hotfix/login-issue     # Switch to hotfix branch

# 5. Check status
ghq-wt status

# 6. Clean up when done
ghq-wt remove --branch feature/user-authentication
ghq-wt remove --branch hotfix/login-issue
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
