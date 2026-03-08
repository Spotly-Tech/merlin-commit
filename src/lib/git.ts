import { execa } from "execa";

type SystemError = Error & { code: string };

function isEnoentError(error: unknown): error is SystemError {
    return (
        error instanceof Error &&
        "code" in error &&
        (error as SystemError).code === "ENOENT"
    );
}

function throwGitUnavailable(error: SystemError): never {
    throw new Error(`git is not available on this system: ${error.message}`);
}

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
    } catch (error) {
        if (isEnoentError(error)) {
            throwGitUnavailable(error);
        }
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
    } catch (error) {
        if (isEnoentError(error)) {
            throwGitUnavailable(error);
        }
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
    } catch (error) {
        if (isEnoentError(error)) {
            throwGitUnavailable(error);
        }
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
 * @returns Git commit output (e.g., "[main abc1234] feat: add new feature")
 * @throws Error if git commit command fails
 * @example
 * ```typescript
 * // Standard commit
 * const output = await commit("feat: add new feature");
 * console.log(output); // "[main abc1234] feat: add new feature"
 *
 * // Commit bypassing hooks
 * await commit("fix: emergency hotfix", true);
 * ```
 */
export async function commit(message: string, noVerify = false): Promise<string> {
    const args = ["commit", "-m", message];
    if (noVerify) {
        args.push("--no-verify");
    }
    const { stdout } = await execa("git", args);
    return stdout;
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
 * @returns Git commit output (e.g., "[main abc1234] feat: add feature (fixed typo)")
 * @throws Error if git commit --amend command fails
 * @example
 * ```typescript
 * // Fix the last commit message
 * const output = await amendCommit("feat: add feature (fixed typo)");
 * console.log(output);
 *
 * // Amend without running hooks
 * await amendCommit("fix: corrected implementation", true);
 * ```
 * @warning This rewrites git history. Avoid amending commits that have been pushed to shared branches.
 */
export async function amendCommit(message: string, noVerify = false): Promise<string> {
    const args = ["commit", "--amend", "-m", message];
    if (noVerify) {
        args.push("--no-verify");
    }
    const { stdout } = await execa("git", args);
    return stdout;
}

/**
 * Gets the path to the .git directory for the current repository.
 *
 * This works correctly for both regular repositories and worktrees.
 * The returned path can be used to locate git-specific files like
 * COMMIT_EDITMSG.
 *
 * @returns Absolute path to the .git directory
 * @throws Error if not in a git repository
 * @example
 * ```typescript
 * const gitDir = await getGitDirectory();
 * // => "C:/projects/myrepo/.git" or "/home/user/myrepo/.git"
 * ```
 */
export async function getGitDirectory(): Promise<string> {
    const { stdout } = await execa("git", ["rev-parse", "--git-dir"]);
    return stdout.trim();
}

/**
 * Gets the root directory of the current git repository.
 *
 * Uses `git rev-parse --show-toplevel` to find the repository root.
 * Returns null if not inside a git repository, allowing callers
 * to gracefully skip project-level config.
 *
 * @returns Absolute path to repository root, or null if not in a git repository
 * @example
 * ```typescript
 * const repoRoot = await getRepoRoot();
 * if (repoRoot) {
 *   // Load project-level config from repoRoot
 * }
 * ```
 */
export async function getRepoRoot(): Promise<string | null> {
    try {
        const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
        return stdout.trim();
    } catch {
        // Intentional: returns null when not in a git repo so callers
        // can skip project-level config gracefully.
        return null;
    }
}

/**
 * Represents a staged file with its status indicator.
 */
export type StagedFile = {
    status: "modified" | "new file" | "deleted" | "renamed" | "copied" | "typechange";
    path: string;
};

/**
 * Retrieves a list of staged files with their status.
 *
 * Uses `git diff --cached --name-status` to get both the status
 * indicator and file path for each staged file.
 *
 * @returns Array of staged files with status, empty array if none or on error
 * @example
 * ```typescript
 * const files = await getStagedFilesWithStatus();
 * // => [
 * //   { status: "modified", path: "src/index.ts" },
 * //   { status: "new file", path: "src/utils.ts" }
 * // ]
 * ```
 */
export async function getStagedFilesWithStatus(): Promise<StagedFile[]> {
    try {
        const { stdout } = await execa("git", ["diff", "--cached", "--name-status"]);
        if (!stdout.trim()) {
            return [];
        }

        const statusMap: Record<string, StagedFile["status"]> = {
            M: "modified",
            A: "new file",
            D: "deleted",
            R: "renamed",
            C: "copied",
            T: "typechange",
        };

        return stdout
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const [statusCode, ...pathParts] = line.split("\t");
                const status = statusMap[statusCode.charAt(0)] || "modified";
                const path = pathParts.join("\t"); // Handle paths with tabs (rare but possible)
                return { status, path };
            });
    } catch (error) {
        if (isEnoentError(error)) {
            throwGitUnavailable(error);
        }
        return [];
    }
}
