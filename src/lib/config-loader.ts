import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { MerlinConfig, ThemeMessages } from "../types/index.js";
import { validateConfig } from "../utils/config.js";
import {
    DEFAULT_CONFIG,
    STANDARD_MESSAGES,
    WIZARD_MESSAGES,
} from "../utils/constants.js";
import { normalizeEmojiSpacing } from "./terminal.js";

const USER_CONFIG_PATH = join(homedir(), ".merlinrc.json");

/**
 * Resolves the default editor by reading environment variables at call time.
 * Called lazily inside loadConfig() so tests can control the value by setting
 * process.env.EDITOR before calling loadConfig().
 */
function resolveDefaultEditor(): string {
    return (
        process.env.EDITOR ??
        process.env.VISUAL ??
        (process.platform === "win32" ? "notepad" : "vim")
    );
}

/**
 * Loads and validates user-level config from ~/.merlinrc.json.
 * Returns only the validated fields (not merged with defaults).
 *
 * @returns Validated partial config from user's home directory
 */
export function loadUserConfig(): Partial<MerlinConfig> {
    if (!existsSync(USER_CONFIG_PATH)) {
        return {};
    }

    try {
        const rawConfig = JSON.parse(readFileSync(USER_CONFIG_PATH, "utf-8"));
        return validateConfig(rawConfig);
    } catch {
        console.warn("merlin: ~/.merlinrc.json could not be parsed - using defaults");
        return {};
    }
}

/**
 * Loads and validates project-level config from <repoRoot>/.merlinrc.json.
 * Returns only the validated fields (not merged with defaults).
 */
export function loadProjectConfig(repoRoot: string): Partial<MerlinConfig> {
    const projectConfigPath = join(repoRoot, ".merlinrc.json");
    if (!existsSync(projectConfigPath)) {
        return {};
    }
    try {
        const rawConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
        return validateConfig(rawConfig);
    } catch {
        console.warn(
            "merlin: .merlinrc.json could not be parsed - ignoring project config"
        );
        return {};
    }
}

/**
 * Loads Merlin configuration with 3-tier merge priority.
 *
 * Merge order (later wins):
 * 1. DEFAULT_CONFIG (hardcoded fallback)
 * 2. ~/.merlinrc.json (user preferences)
 * 3. <repo-root>/.merlinrc.json (project/team config)
 *
 * @param repoRoot - Repository root path for project-level config, or null/undefined to skip
 * @returns Complete configuration with all required fields
 */
export function loadConfig(repoRoot?: string | null): Required<MerlinConfig> {
    const userConfig = loadUserConfig();
    const projectConfig = repoRoot ? loadProjectConfig(repoRoot) : {};
    const merged = { ...DEFAULT_CONFIG, ...userConfig, ...projectConfig };
    // Resolve editor from env vars at call time when no explicit editor is configured.
    // userConfig/projectConfig take precedence; only fall through to resolveDefaultEditor()
    // when neither specifies an editor, so tests can control the value via process.env.EDITOR.
    return {
        ...merged,
        editor: userConfig.editor ?? projectConfig.editor ?? resolveDefaultEditor(),
    };
}

/**
 * Saves user configuration to the global Merlin config file.
 *
 * Merges provided configuration options with existing settings and writes the
 * result to `~/.merlinrc.json`. This allows users to customize Merlin's behavior
 * persistently across all projects. Creates the file if it doesn't exist.
 *
 * @param config - Partial configuration object with settings to save
 */
export function saveConfig(config: Partial<MerlinConfig>): void {
    const currentConfig = loadUserConfig();
    const newConfig = { ...DEFAULT_CONFIG, ...currentConfig, ...config };
    writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(newConfig, null, 4)}\n`);
}

/**
 * Resets user configuration to default settings.
 *
 * Overwrites the global Merlin configuration file (`~/.merlinrc.json`) with
 * default values, effectively removing all user customizations. If the config
 * file doesn't exist, this function does nothing.
 */
export function resetConfig(): void {
    if (existsSync(USER_CONFIG_PATH)) {
        writeFileSync(USER_CONFIG_PATH, `${JSON.stringify(DEFAULT_CONFIG, null, 4)}\n`);
    }
}
/**
 * Saves project-level configuration to <repoRoot>/.merlinrc.json.
 *
 * Merges provided options with existing project config.
 * Does NOT spread DEFAULT_CONFIG - project config should contain only explicitly set values
 *
 * @param config - Partial configuration to save
 * @param repoRoot - Repository root directory path
 */
export function saveProjectConfig(config: Partial<MerlinConfig>, repoRoot: string): void {
    const projectConfigPath = join(repoRoot, ".merlinrc.json");
    const currentProjectConfig = loadProjectConfig(repoRoot);
    const newConfig = { ...currentProjectConfig, ...config };

    writeFileSync(projectConfigPath, `${JSON.stringify(newConfig, null, 4)}\n`);
}

/**
 * Removes a single field from the project-level config,
 * letting it fall back to the user or default tier.
 *
 * @param field - Config key to remove
 * @param repoRoot - Repository root directory path
 */
export function removeProjectConfigField(
    field: keyof MerlinConfig,
    repoRoot: string
): void {
    const projectConfigPath = join(repoRoot, ".merlinrc.json");
    const currentProjectConfig = loadProjectConfig(repoRoot);

    delete (currentProjectConfig as Record<string, unknown>)[field];
    writeFileSync(
        projectConfigPath,
        `${JSON.stringify(currentProjectConfig, null, 4)}\n`
    );
}

/**
 * Resets the project-level config to its minimal seed state.
 *
 * Removes all project overrides except `theme`, which is preserved as a
 * baseline so the project still has an explicit theme choice (matching the
 * shape produced by `ensureProjectConfigExists` when seeding a new file).
 * All other fields fall back to user config or defaults.
 *
 * @param repoRoot - Repository root directory path
 */
export function resetProjectConfig(repoRoot: string): void {
    const projectConfigPath = join(repoRoot, ".merlinrc.json");
    if (!existsSync(projectConfigPath)) {
        return;
    }
    const seedConfig = { theme: DEFAULT_CONFIG.theme };
    writeFileSync(projectConfigPath, `${JSON.stringify(seedConfig, null, 4)}\n`);
}

/**
 * Recursively normalizes VS16 emoji spacing in all string values of a nested object.
 * Used to adjust emoji spacing in ThemeMessages based on the current terminal.
 */
function normalizeThemeStrings<T>(object: T): T {
    if (typeof object === "function") {
        return object;
    }
    if (typeof object === "string") {
        return normalizeEmojiSpacing(object) as T;
    }
    if (typeof object === "object" && object !== null) {
        const result = {} as Record<string, unknown>;
        for (const [key, value] of Object.entries(object)) {
            result[key] = normalizeThemeStrings(value);
        }
        return result as T;
    }
    return object;
}

/**
 * Retrieves the appropriate message set based on the merged theme config.
 *
 * For the wizard theme, VS16 emoji spacing is normalized at runtime based on
 * terminal detection. Standard theme has no VS16 emojis and skips normalization.
 *
 * @param repoRoot - Repository root path for project-level config, or null/undefined to skip
 * @returns Message object containing all UI text for prompts, errors, and tips
 */
export function getMessages(repoRoot?: string | null): ThemeMessages {
    const config = loadConfig(repoRoot);
    if (config.theme !== "wizard") {
        return STANDARD_MESSAGES;
    }
    return normalizeThemeStrings(WIZARD_MESSAGES);
}
