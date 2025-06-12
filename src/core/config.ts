import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import {
  GhqWorktreeConfig,
  WorktreeInfo,
  GhqWorktreeError,
} from "../types/index.js";
import { getGhqRoot } from "./ghq.js";

const CONFIG_FILE = join(homedir(), ".ghq-worktree.json");

const DEFAULT_CONFIG: GhqWorktreeConfig = {
  worktrees: {},
  config: {
    maxSlots: 5,
    baseDir: homedir(),
  },
};

export async function loadConfig(): Promise<GhqWorktreeConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      const config = { ...DEFAULT_CONFIG };
      config.config.ghqRoot = await getGhqRoot();
      await saveConfig(config);
      return config;
    }

    const content = await readFile(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content) as GhqWorktreeConfig;

    // Ensure ghqRoot is set
    if (!config.config.ghqRoot) {
      config.config.ghqRoot = await getGhqRoot();
      await saveConfig(config);
    }

    // Validate and merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...config,
      config: {
        ...DEFAULT_CONFIG.config,
        ...config.config,
      },
    };
  } catch (error) {
    throw new GhqWorktreeError(
      `Failed to load configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function saveConfig(config: GhqWorktreeConfig): Promise<void> {
  try {
    const configDir = dirname(CONFIG_FILE);
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new GhqWorktreeError(
      `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function addWorktree(worktree: WorktreeInfo): Promise<void> {
  const config = await loadConfig();
  config.worktrees[worktree.id] = worktree;
  await saveConfig(config);
}

export async function removeWorktreeFromConfig(id: string): Promise<void> {
  const config = await loadConfig();
  delete config.worktrees[id];
  await saveConfig(config);
}

export async function getWorktreeBySlot(
  slot: number,
): Promise<WorktreeInfo | null> {
  const config = await loadConfig();
  const worktree = Object.values(config.worktrees).find((w) => w.slot === slot);
  return worktree || null;
}

export async function getWorktreesBySlot(
  slot: number,
): Promise<WorktreeInfo[]> {
  const config = await loadConfig();
  return Object.values(config.worktrees).filter((w) => w.slot === slot);
}

export async function getWorktreesByRepository(
  repository: string,
): Promise<WorktreeInfo[]> {
  const config = await loadConfig();
  return Object.values(config.worktrees).filter(
    (w) => w.repository === repository,
  );
}

export async function getAllWorktrees(): Promise<WorktreeInfo[]> {
  const config = await loadConfig();
  return Object.values(config.worktrees);
}

export async function findAvailableSlot(): Promise<number> {
  const config = await loadConfig();
  const usedSlots = new Set(Object.values(config.worktrees).map((w) => w.slot));

  for (let slot = 1; slot <= config.config.maxSlots; slot++) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }

  throw new GhqWorktreeError(
    `No available slots. Maximum slots: ${config.config.maxSlots}`,
  );
}

export async function isSlotAvailable(
  slot: number,
  repository?: string,
): Promise<boolean> {
  const config = await loadConfig();
  return !Object.values(config.worktrees).some(
    (w) => w.slot === slot && (!repository || w.repository === repository),
  );
}

export async function updateConfig(
  updates: Partial<GhqWorktreeConfig["config"]>,
): Promise<void> {
  const config = await loadConfig();
  config.config = { ...config.config, ...updates };
  await saveConfig(config);
}
