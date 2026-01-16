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

/**
 * Retrieves a list of unstaged files in the working directory.
 *
 * Unstaged files are modified files that have not been added to the
 * git index with `git add`. Returns an empty array if git command fails.
 *
 * @returns Array of file paths with unstaged changes, empty array if none or on error
 * @example
 * ```typescript
 * const files = await getUnstagedFiles();
 * console.log(`${files.length} unstaged files found`);
 * files.forEach(file => console.log(`  - ${file}`));
 * ```
 */
export async function getUnstagedFiles(): Promise<string[]> {
    try {
        const { stdout } = await execa("git", ["diff", "--name-only"]);
        return stdout.trim().split("\n").filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Stages specified files for commit by adding them to the git index.
 *
 * Executes `git add` for the provided file paths. Throws an error
 * if the git command fails.
 *
 * @param files - Array of file paths to stage
 * @throws Error if git add command fails
 * @example
 * ```typescript
 * await addFiles(["src/index.ts", "package.json"]);
 * // Or stage all files
 * await addFiles(["."]);
 * ```
 */
export async function addFiles(files: string[]): Promise<void> {
    await execa("git", ["add", ...files]);
}
