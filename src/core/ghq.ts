import { execCommand, parseRepositoryPath } from "./utils.js";
import { Repository, GhqError } from "../types/index.js";

export async function getGhqRoot(): Promise<string> {
  try {
    const result = await execCommand("ghq", ["root"]);
    if (result.exitCode !== 0) {
      throw new GhqError(
        `Failed to get ghq root: ${result.stderr}`,
        result.exitCode,
      );
    }
    return result.stdout;
  } catch (error) {
    if (error instanceof GhqError) throw error;
    throw new GhqError("ghq command not found. Please install ghq first.");
  }
}

export async function listRepositories(): Promise<Repository[]> {
  try {
    const result = await execCommand("ghq", ["list", "--full-path"]);
    if (result.exitCode !== 0) {
      throw new GhqError(
        `Failed to list repositories: ${result.stderr}`,
        result.exitCode,
      );
    }

    const ghqRoot = await getGhqRoot();

    return result.stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((fullPath) => {
        const relativePath = fullPath.replace(ghqRoot + "/", "");
        const { host, owner, repo } = parseRepositoryPath(relativePath);

        return {
          name: `${owner}/${repo}`,
          fullPath,
          relativePath,
          host,
          owner,
          repo,
        };
      });
  } catch (error) {
    if (error instanceof GhqError) throw error;
    throw new GhqError("Failed to list repositories");
  }
}

export async function findRepository(
  query: string,
): Promise<Repository | null> {
  const repositories = await listRepositories();

  // Exact match by name (owner/repo)
  let repo = repositories.find((r) => r.name === query);
  if (repo) return repo;

  // Partial match by repo name only
  repo = repositories.find((r) => r.repo === query);
  if (repo) return repo;

  // Fuzzy search in name
  repo = repositories.find((r) => r.name.includes(query));
  if (repo) return repo;

  // Fuzzy search in relative path
  repo = repositories.find((r) => r.relativePath.includes(query));
  if (repo) return repo;

  return null;
}

export async function validateRepository(repoPath: string): Promise<boolean> {
  try {
    const result = await execCommand("git", ["rev-parse", "--git-dir"], {
      cwd: repoPath,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
