import type { CommitType, MerlinConfig } from "../types/index.js";

/**
 * Validates a single commit type object.
 */
function isValidCommitType(type: unknown): type is CommitType {
    if (typeof type !== "object" || type === null) return false;
    const commitType = type as Record<string, unknown>;
    return (
        typeof commitType.value === "string" &&
        typeof commitType.name === "string" &&
        typeof commitType.description === "string" &&
        typeof commitType.emoji === "string"
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

    // Validate showCharacterCounter
    if (typeof config.showCharacterCounter === "boolean") {
        validated.showCharacterCounter = config.showCharacterCounter;
    }

    // Validate theme
    if (config.theme === "wizard" || config.theme === "standard") {
        validated.theme = config.theme;
    }

    return validated;
}
