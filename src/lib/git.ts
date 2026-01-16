import { execa } from "execa";

/**
 * Checks if the current directory is inside a git repository.
 *
 * Uses `git rev-parse --git-dir` to verify git repository existence.
 *
 * @returns True if current directory is in a git repository, false otherwise
 * @example
 * ```typescript
 * const isRepo = await isGitRepo();
 * if (!isRepo) {
 *   console.error("Not a git repository");
 * }
 * ```
 */
export async function isGitRepo(): Promise<boolean> {
    try {
        await execa("git", ["rev-parse", "--git-dir"]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if there are any staged changes in the git repository.
 *
 * Staged changes are files that have been added to the git index
 * with `git add` and are ready to be committed.
 *
 * @returns True if there are staged changes, false otherwise
 * @example
 * ```typescript
 * const hasStaged = await hasStagedChanges();
 * if (!hasStaged) {
 *   console.log("No files staged for commit");
 * }
 * ```
 */
export async function hasStagedChanges(): Promise<boolean> {
    try {
        const { stdout } = await execa("git", ["diff", "--cached", "--name-only"]);
        return stdout.trim().length > 0;
    } catch {
        return false;
    }
}
