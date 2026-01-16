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

/**
 * Creates a git commit with the specified message.
 *
 * Executes `git commit` with the provided message. Optionally bypasses
 * pre-commit and commit-msg hooks with the `--no-verify` flag.
 *
 * @param message - Commit message text
 * @param noVerify - If true, bypasses git hooks (default: false)
 * @throws Error if git commit command fails
 * @example
 * ```typescript
 * // Standard commit
 * await commit("feat: add new feature");
 *
 * // Commit bypassing hooks
 * await commit("fix: emergency hotfix", true);
 * ```
 */
export async function commit(message: string, noVerify = false): Promise<void> {
    const args = ["commit", "-m", message];
    if (noVerify) {
        args.push("--no-verify");
    }
    await execa("git", args, { stdio: "inherit" });
}

/**
 * Amends the most recent commit with a new message.
 *
 * Replaces the previous commit's message without creating a new commit.
 * Useful for fixing commit messages or adding forgotten changes.
 * Optionally bypasses git hooks with the `--no-verify` flag.
 *
 * @param message - New commit message to replace the previous one
 * @param noVerify - If true, bypasses git hooks (default: false)
 * @throws Error if git commit --amend command fails
 * @example
 * ```typescript
 * // Fix the last commit message
 * await amendCommit("feat: add feature (fixed typo)");
 *
 * // Amend without running hooks
 * await amendCommit("fix: corrected implementation", true);
 * ```
 * @warning This rewrites git history. Avoid amending commits that have been pushed to shared branches.
 */
export async function amendCommit(message: string, noVerify = false): Promise<void> {
    const args = ["commit", "--amend", "-m", message];
    if (noVerify) {
        args.push("--no-verify");
    }
    await execa("git", args, { stdio: "inherit" });
}
