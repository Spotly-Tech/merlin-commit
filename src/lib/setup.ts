import { existsSync } from "fs";
import { chmod, writeFile } from "fs/promises";
import { platform } from "node:os";
import { join } from "node:path";
import { execa } from "execa";

import { DEFAULT_CONFIG } from "../utils/constants.js";

/**
 * Options for dependency installation.
 */
type InstallOptions = {
    /** If true, suppresses npm output (useful for spinner integration). */
    silent?: boolean;
};

/**
 * Result of detecting existing setup files in the project.
 */
type DetectedSetup = {
    /** Whether .husky directory exists. */
    husky: boolean;
    /** Whether .husky/commit-msg hook exists. */
    commitMsgHook: boolean;
    /** Whether any commitlint config file exists. */
    commitlintConfig: boolean;
    /** Whether .merlinrc.json exists in project root. */
    merlinConfig: boolean;
};

/**
 * Hook content for commit-msg that runs commitlint validation.
 * Uses Husky v9 format; cross-platform execution handled by Husky's shim.
 */
const COMMIT_MSG_HOOK_CONTENT = `npx --no -- commitlint --edit $1`;

/**
 * ESM commitlint configuration extending conventional commits.
 */
const COMMITLINT_CONFIG_CONTENT = `export default { extends: ['@commitlint/config-conventional'] };`;

/**
 * Dependencies required for the init command setup.
 * Installed as devDependencies via npm.
 */
export const INIT_DEPENDENCIES = [
    "husky",
    "@commitlint/cli",
    "@commitlint/config-conventional",
] as const;

/**
 * Checks if a package.json file exists in the current working directory.
 *
 * @returns True if package.json exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await hasPackageJson()) {
 *   await installDependencies([...INIT_DEPENDENCIES]);
 * }
 * ```
 */
export async function hasPackageJson(): Promise<boolean> {
    // Note: Uses sync check for simplicity; async signature maintained for API consistency
    return existsSync("package.json");
}

/**
 * Detects which setup files already exist in the project.
 * Used to determine what needs to be created vs skipped during init.
 *
 * @returns Object indicating presence of husky, commit hook, commitlint config, and merlin config
 *
 * @example
 * ```typescript
 * const setup = await detectExistingSetup();
 * if (setup.husky) {
 *   console.log("Husky already initialized");
 * }
 * ```
 */
export async function detectExistingSetup(): Promise<DetectedSetup> {
    // Note: Uses sync checks for simplicity; async signature maintained for API consistency
    return {
        husky: existsSync(".husky"),
        commitMsgHook: existsSync(".husky/commit-msg"),
        commitlintConfig:
            existsSync("commitlint.config.js") ||
            existsSync("commitlint.config.cjs") ||
            existsSync("commitlint.config.mjs") ||
            existsSync("commitlint.config.ts") ||
            existsSync(".commitlintrc") ||
            existsSync(".commitlintrc.json") ||
            existsSync(".commitlintrc.js") ||
            existsSync(".commitlintrc.yaml") ||
            existsSync(".commitlintrc.yml"),
        merlinConfig: existsSync(".merlinrc.json"),
    };
}

/**
 * Checks whether a specific npm package is installed locally
 * by verifying its presence in node_modules.
 *
 * @param packageName - The npm package name to check (e.g., "husky", "@commitlint/cli")
 * @returns True if the package directory exists in node_modules, false otherwise
 */
export async function isPackageInstalled(packageName: string): Promise<boolean> {
    return existsSync(join("node_modules", packageName));
}

/**
 * Installs npm packages as dev dependencies.
 *
 * @param deps - Array of package names to install
 * @param options - Installation options
 * @param options.silent - If true, suppresses npm output (default: false)
 *
 * @example
 * ```typescript
 * // Install with output visible
 * await installDependencies(["husky", "@commitlint/cli"]);
 *
 * // Install silently (for spinner integration)
 * await installDependencies(["husky"], { silent: true });
 * ```
 */
export async function installDependencies(
    deps: string[],
    options: InstallOptions = {}
): Promise<void> {
    const stdio = options.silent ? "pipe" : "inherit";
    await execa("npm", ["install", "--save-dev", ...deps], { stdio });
}

/**
 * Initializes Husky in the project by running `npx husky init`.
 * Creates the .husky directory and base configuration.
 *
 * @remarks
 * Requires Husky v9+. The init command creates:
 * - .husky/ directory
 * - .husky/pre-commit (default hook)
 *
 * @example
 * ```typescript
 * await initializeHusky();
 * // .husky/ directory now exists
 * ```
 */
export async function initializeHusky(): Promise<void> {
    await execa("npx", ["husky", "init"], { stdio: "pipe" });
}

/**
 * Creates the commit-msg hook that runs commitlint validation.
 * Makes the hook executable on Unix systems (chmod 755).
 *
 * @remarks
 * Precondition: .husky/ directory must exist (call initializeHusky first).
 * The hook content uses $1 bash variable; Husky v9's shim handles Windows.
 *
 * @example
 * ```typescript
 * await initializeHusky();
 * await createCommitMsgHook();
 * // .husky/commit-msg now exists and is executable
 * ```
 */
export async function createCommitMsgHook(): Promise<void> {
    const hookPath = join(".husky", "commit-msg");

    await writeFile(hookPath, COMMIT_MSG_HOOK_CONTENT, "utf-8");

    // Make executable on Unix systems (chmod 755)
    // Windows doesn't require this; Husky's shim handles execution
    if (platform() !== "win32") {
        await chmod(hookPath, 0o755);
    }
}

/**
 * Creates a commitlint configuration file with conventional commits preset.
 * Generates an ESM config file (commitlint.config.js).
 *
 * @example
 * ```typescript
 * await createCommitlintConfig();
 * // commitlint.config.js now exists with conventional config
 * ```
 */
export async function createCommitlintConfig(): Promise<void> {
    await writeFile("commitlint.config.js", COMMITLINT_CONFIG_CONTENT, "utf-8");
}

/**
 * Checks if a git alias for 'merlin' already exists.
 *
 * @returns The current alias value if it exists, null otherwise
 *
 * @example
 * ```typescript
 * const existing = await checkGitAlias();
 * if (existing) {
 *   console.log(`Alias exists: git merlin -> ${existing}`);
 * }
 * ```
 */
export async function checkGitAlias(): Promise<string | null> {
    try {
        const { stdout } = await execa("git", ["config", "--get", "alias.merlin"]);
        return stdout.trim() || null;
    } catch {
        // Git returns non-zero exit code when alias doesn't exist
        return null;
    }
}

/**
 * Configures a git alias so `git merlin` invokes the merlin CLI.
 *
 * @param scope - Whether to set the alias globally or locally
 *   - "global": Applies to all repositories for the current user
 *   - "local": Applies only to the current repository
 *
 * @example
 * ```typescript
 * // Set globally (all repos)
 * await setupGitAlias("global");
 *
 * // Set locally (this repo only)
 * await setupGitAlias("local");
 *
 * // Now `git merlin` works as an alias for `merlin`
 * ```
 */
export async function setupGitAlias(scope: "global" | "local"): Promise<void> {
    const scopeFlag = scope === "global" ? "--global" : "--local";
    await execa("git", ["config", scopeFlag, "alias.merlin", "!merlin"]);
}

/**
 * Creates a project-level .merlinrc.json configuration file.
 * Uses default configuration values for theme and length limits.
 *
 * @remarks
 * This file can be committed to version control to share team preferences.
 *
 * @example
 * ```typescript
 * await createProjectConfig();
 * // .merlinrc.json now exists with default settings
 * ```
 */
export async function createProjectConfig(): Promise<void> {
    const projectConfig = {
        theme: DEFAULT_CONFIG.theme,
        maxSubjectLength: DEFAULT_CONFIG.maxSubjectLength,
        maxScopeLength: DEFAULT_CONFIG.maxScopeLength,
    };

    await writeFile(
        ".merlinrc.json",
        JSON.stringify(projectConfig, null, 4) + "\n",
        "utf-8"
    );
}
