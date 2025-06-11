#!/usr/bin/env node

import { execSync } from "child_process";

/**
 * Execute a command and log it
 */
function exec(command) {
  console.log(`📦 Running: ${command}`);
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

/**
 * Main release function
 */
function release() {
  console.log("🎉 Starting patch release...\n");

  try {
    // Build the project
    console.log("🧪 Building project...");
    exec("pnpm build");

    // Bump patch version and create git tag
    console.log("\n📈 Bumping patch version...");
    exec("npm version patch");

    // Push changes and tags to remote
    console.log("\n🚀 Pushing to remote...");
    exec("git push --follow-tags");

    console.log("\n🎉 Release completed successfully!");
    console.log("✅ Patch version bumped");
    console.log("✅ Git tag created");
    console.log("✅ Changes pushed to remote");
  } catch (error) {
    console.error("\n❌ Release failed");
    process.exit(1);
  }
}

// Handle help flag
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
📦 Simple Release Script

This script automates patch version releases:

1. 🧪 Builds the project (pnpm build)
2. 📈 Bumps patch version (npm version patch)
3. 🚀 Pushes changes and tags (git push --follow-tags)

Usage:
  pnpm run release

Notes:
- Uses npm version for reliable version management
- Automatically creates git commit and tag
- Pushes both commits and tags in one command
`);
  process.exit(0);
}

release();
