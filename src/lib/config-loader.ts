import { existsSync, readFileSync } from "fs";
import { join } from "path";

import type { MerlinConfig, ThemeMessages } from "../types/index.js";
import { loadUserConfig, validateConfig } from "../utils/config.js";
import {
    DEFAULT_CONFIG,
    STANDARD_MESSAGES,
    WIZARD_MESSAGES,
} from "../utils/constants.js";

/**
 * Resolves the default editor by reading environment variables at call time.
 * Called lazily inside loadConfig() so tests can control the value by setting
 * process.env.EDITOR before calling loadConfig().
 */
function resolveDefaultEditor(): string {
    return (
        process.env.EDITOR ||
        process.env.VISUAL ||
        (process.platform === "win32" ? "notepad" : "vim")
    );
}

/**
 * Loads and validates project-level config from <repoRoot>/.merlinrc.json.
 * Returns only the validated fields (not merged with defaults).
 */
function loadProjectConfig(repoRoot: string): Partial<MerlinConfig> {
    const projectConfigPath = join(repoRoot, ".merlinrc.json");
    if (!existsSync(projectConfigPath)) {
        return {};
    }
    try {
        const rawConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"));
        return validateConfig(rawConfig);
    } catch {
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
 * Retrieves the appropriate message set based on the merged theme config.
 *
 * @param repoRoot - Repository root path for project-level config, or null/undefined to skip
 * @returns Message object containing all UI text for prompts, errors, and tips
 */
export function getMessages(repoRoot?: string | null): ThemeMessages {
    const config = loadConfig(repoRoot);
    return config.theme === "wizard" ? WIZARD_MESSAGES : STANDARD_MESSAGES;
}
