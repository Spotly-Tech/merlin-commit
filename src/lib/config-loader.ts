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
    return { ...DEFAULT_CONFIG, ...userConfig, ...projectConfig };
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
