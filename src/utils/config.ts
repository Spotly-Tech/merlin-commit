import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import type { CommitType, MerlinConfig, WizardMessages } from "../types/index.js";
import { DEFAULT_CONFIG, STANDARD_MESSAGES, WIZARD_MESSAGES } from "./constants.js";

const USER_CONFIG_PATH = join(homedir(), ".merlinrc.json");

/**
 * Validates a single commit type object.
 */
function isValidCommitType(type: unknown): type is CommitType {
    if (typeof type !== "object" || type === null) return false;
    const t = type as Record<string, unknown>;
    return (
        typeof t.value === "string" &&
        typeof t.name === "string" &&
        typeof t.description === "string" &&
        typeof t.emoji === "string"
    );
}

/**
 * Validates and sanitizes user configuration.
 * Returns only valid fields, ignoring malformed values.
 */
export function validateConfig(userConfig: unknown): Partial<MerlinConfig> {
    if (typeof userConfig !== "object" || userConfig === null) {
        return {};
    }

    const config = userConfig as Record<string, unknown>;
    const validated: Partial<MerlinConfig> = {};

    // Validate types array
    if (Array.isArray(config.types)) {
        const validTypes = config.types.filter(isValidCommitType);
        if (validTypes.length > 0) {
            validated.types = validTypes;
        }
    }

    // Validate maxSubjectLength
    if (typeof config.maxSubjectLength === "number" && config.maxSubjectLength > 0) {
        validated.maxSubjectLength = config.maxSubjectLength;
    }

    // Validate maxScopeLength
    if (typeof config.maxScopeLength === "number" && config.maxScopeLength > 0) {
        validated.maxScopeLength = config.maxScopeLength;
    }

    // Validate editor
    if (typeof config.editor === "string" && config.editor.trim().length > 0) {
        validated.editor = config.editor;
    }

    // Validate autoAdd
    if (typeof config.autoAdd === "boolean") {
        validated.autoAdd = config.autoAdd;
    }

    // Validate theme
    if (config.theme === "wizard" || config.theme === "standard") {
        validated.theme = config.theme;
    }

    return validated;
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
        return {};
    }
}

/**
 * Loads Merlin configuration with user settings merged over defaults.
 *
 * Reads user-level config from `~/.merlinrc.json` and merges it with
 * DEFAULT_CONFIG to ensure all required fields are present. This will
 * be replaced by the async version in lib/config-loader.ts once
 * project-level config support is added.
 *
 * @returns Complete configuration object with all required fields populated
 *
 * @example
 * const config = loadConfig();
 * console.log(config.maxSubjectLength); // 72 (default or user-configured)
 * console.log(config.theme); // "wizard" or "standard"
 */
export function loadConfig(): Required<MerlinConfig> {
    const userConfig = loadUserConfig();
    return { ...DEFAULT_CONFIG, ...userConfig };
}

/**
 * Retrieves the appropriate message set based on the configured theme.
 *
 * Returns either wizard-themed messages (with emojis and mystical language) or
 * standard messages (minimalist and professional) depending on the user's theme
 * preference in their configuration.
 *
 * @returns Message object containing all UI text for prompts, errors, and tips
 *
 * @example
 * const messages = getMessages();
 * console.log(messages.intro);
 * // With wizard theme: "🧙 Merlin is ready to guide your commit"
 * // With standard theme: "Ready to create commit"
 */
export function getMessages(): WizardMessages {
    const config = loadConfig();
    return config.theme === "wizard" ? WIZARD_MESSAGES : STANDARD_MESSAGES;
}

/**
 * Saves user configuration to the global Merlin config file.
 *
 * Merges provided configuration options with existing settings and writes the
 * result to `~/.merlinrc.json`. This allows users to customize Merlin's behavior
 * persistently across all projects. Creates the file if it doesn't exist.
 *
 * @param config - Partial configuration object with settings to save
 *
 * @example
 * // Change theme to standard
 * saveConfig({ theme: 'standard' });
 *
 * @example
 * // Customize multiple settings
 * saveConfig({
 *   maxSubjectLength: 50,
 *   autoAdd: true,
 *   editor: 'code --wait'
 * });
 *
 * @example
 * // Add custom commit types
 * saveConfig({
 *   types: [
 *     { value: 'feature', name: 'New Feature', description: 'A new feature', emoji: '✨' },
 *     { value: 'bugfix', name: 'Bug Fix', description: 'A bug fix', emoji: '🐛' }
 *   ]
 * });
 */
export function saveConfig(config: Partial<MerlinConfig>): void {
    const currentConfig = loadUserConfig();
    const newConfig = { ...DEFAULT_CONFIG, ...currentConfig, ...config };
    writeFileSync(USER_CONFIG_PATH, JSON.stringify(newConfig, null, 4));
}

/**
 * Resets user configuration to default settings.
 *
 * Overwrites the global Merlin configuration file (`~/.merlinrc.json`) with
 * default values, effectively removing all user customizations. If the config
 * file doesn't exist, this function does nothing. This is useful for troubleshooting
 * or when users want to start fresh with default settings.
 *
 * @example
 * // Reset all settings to defaults
 * resetConfig();
 * // Now loadConfig() will return DEFAULT_CONFIG values
 *
 * @example
 * // Typical usage with confirmation
 * const messages = getMessages();
 * const confirmed = await confirm(messages.warnings.resetConfig);
 * if (confirmed) {
 *   resetConfig();
 *   console.log(messages.success.config);
 * }
 */
export function resetConfig(): void {
    if (existsSync(USER_CONFIG_PATH)) {
        writeFileSync(USER_CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4));
    }
}
