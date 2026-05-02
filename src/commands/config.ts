import { basename } from "path";
import { confirm, input, select, Separator } from "@inquirer/prompts";

import {
    getMessages,
    loadConfig,
    loadProjectConfig,
    loadUserConfig,
    removeProjectConfigField,
    resetConfig,
    resetProjectConfig,
    saveConfig,
    saveProjectConfig,
} from "../lib/config-loader.js";
import { getRepoRoot } from "../lib/git.js";
import { setupSigintHandler } from "../lib/sigint.js";
import { normalizeVS16Spacing } from "../lib/terminal.js";
import type {
    ConfigMenuAction,
    ConfigOptions,
    ConfigurableField,
    MerlinConfig,
    ThemeMessages,
} from "../types/index.js";
import { colors, DEFAULT_CONFIG } from "../utils/constants.js";
import { createNonEmptyValidator, createRangeValidator } from "../utils/validators.js";

type SaveFn = (config: Partial<MerlinConfig>) => void;

const ALL_CONFIGURABLE_FIELDS: ConfigurableField[] = [
    "theme",
    "maxSubjectLength",
    "maxScopeLength",
    "editor",
    "autoAdd",
    "showCharacterCounter",
];

// Menu chrome (labels, prompts, section headers) is intentionally non-themable
// - config is an admin screen where clarity beats flavor. Visual emoji prefixes
// still vary by theme via FIELD_EMOJI_PREFIXES below. Feedback messages
// (success.config, warnings.resetConfig, warnings.cancel) stay themed.

const FIELD_LABELS = {
    theme: "Theme",
    maxSubjectLength: "Max subject length",
    maxScopeLength: "Max scope length",
    editor: "Default editor",
    autoAdd: "Auto-add unstaged files",
    showCharacterCounter: "Show character counter",
    showConfig: "Show current config",
    resetConfig: "Reset to defaults",
    back: "Back to scope selection",
    exit: "Exit",
};

const SECTION_HEADERS = {
    settings: "Settings",
    projectOverrides: "Project overrides",
    addOverride: "Add override",
} as const;

const MENU_PROMPT = "Select an option:";

const FIELD_ACTION_LABELS = {
    change: "Change value",
    remove: "Remove from project config",
} as const;

const CONFIGURE_PROMPTS = {
    theme: "Select theme:",
    themeWizardLabel: "wizard   - Magical experience with themed messages",
    themeStandardLabel: "standard - Minimalist, professional interface",
    maxSubjectLength: "Maximum subject line length (10-200):",
    maxScopeLength: "Maximum scope length (5-50):",
    editor: "External editor command:",
    autoAdd: "Automatically stage all changes before committing?",
    showCharacterCounter: "Show character counter on subject and scope inputs?",
} as const;

const SET_TO_PREFIX = {
    theme: "Theme set to",
    maxSubjectLength: "Max subject length set to",
    maxScopeLength: "Max scope length set to",
    editor: "Editor set to",
    autoAdd: "Auto-add set to",
    showCharacterCounter: "Character counter set to",
} as const;

const DISPLAY = {
    currentConfigHeader: "Current Configuration:",
    userConfigHeader: "User Configuration:",
    noUserConfig: "No user configuration set.",
    effectiveConfigNote:
        "Effective config - merges defaults, ~/.merlinrc.json, and project overrides",
    userConfigFile: "~/.merlinrc.json",
    projectOverridesHeader: "Project Overrides",
    noProjectOverrides: "No project overrides set.",
    configFileLabel: "Config file:",
    noProjectOverridesToReset: "No project overrides to reset.",
    resetUserConfirm: "Are you sure you want to reset all settings?",
    resetProjectConfirm: "Reset all project overrides (theme baseline will be kept)?",
    resetCancelled: "Reset cancelled.",
    removedFieldPrefix: "Removed",
} as const;

const FIELD_EMOJI_PREFIXES = {
    wizard: {
        theme: "🎨",
        maxSubjectLength: "📏",
        maxScopeLength: "🎯",
        editor: "📝",
        autoAdd: "🔄",
        showCharacterCounter: "🔢",
        show: "👁️ ",
        reset: "🗑️ ",
        back: "⬅️ ",
        exit: "👋",
    },
    standard: {
        theme: "•",
        maxSubjectLength: "•",
        maxScopeLength: "•",
        editor: "•",
        autoAdd: "•",
        showCharacterCounter: "•",
        show: "•",
        reset: "•",
        back: "←",
        exit: "•",
    },
};

const LABEL_COLUMN_WIDTH = 24;
const SEPARATOR_WIDTH_CHARACTERS = 60;

type MenuChoice = {
    value: ConfigMenuAction;
    name: string;
    short: string;
};

/**
 * Pads a label with spaces so the value column lines up across rows.
 * Always returns at least one space so adjacent text never collides.
 */
function padTo(label: string): string {
    const padding = LABEL_COLUMN_WIDTH - label.length;
    return padding > 0 ? " ".repeat(padding) : " ";
}

/**
 * Formats a single field choice with emoji prefix, human-readable label,
 * column-aligned current value, and a clean `short` property.
 */
function formatFieldChoice(
    field: ConfigurableField,
    currentValue: string | number | boolean,
    config: Required<MerlinConfig>
): MenuChoice {
    const isWizardTheme = config.theme === "wizard";
    const prefix = isWizardTheme
        ? FIELD_EMOJI_PREFIXES.wizard[field]
        : FIELD_EMOJI_PREFIXES.standard[field];
    const label = FIELD_LABELS[field];

    return {
        value: field,
        name: normalizeVS16Spacing(`${prefix} ${label}${padTo(label)}[${currentValue}]`),
        short: label,
    };
}

/**
 * Formats a field choice without a current value, used by the project menu's
 * "Add override" section where the field is not yet configured.
 */
function formatFieldChoiceNoValue(
    field: ConfigurableField,
    config: Required<MerlinConfig>
): MenuChoice {
    const isWizardTheme = config.theme === "wizard";
    const prefix = isWizardTheme
        ? FIELD_EMOJI_PREFIXES.wizard[field]
        : FIELD_EMOJI_PREFIXES.standard[field];
    const label = FIELD_LABELS[field];

    return {
        value: field,
        name: normalizeVS16Spacing(`${prefix} ${label}`),
        short: label,
    };
}

/**
 * Formats a navigation/utility action choice (show, reset, exit).
 */
function formatActionChoice(
    action: "show" | "reset" | "back" | "exit",
    config: Required<MerlinConfig>
): MenuChoice {
    const isWizardTheme = config.theme === "wizard";
    const prefixMap = isWizardTheme
        ? FIELD_EMOJI_PREFIXES.wizard
        : FIELD_EMOJI_PREFIXES.standard;
    const labelMap: Record<"show" | "reset" | "back" | "exit", string> = {
        show: FIELD_LABELS.showConfig,
        reset: FIELD_LABELS.resetConfig,
        back: FIELD_LABELS.back,
        exit: FIELD_LABELS.exit,
    };

    return {
        value: action,
        name: normalizeVS16Spacing(`${prefixMap[action]} ${labelMap[action]}`),
        short: labelMap[action],
    };
}

/**
 * Builds a section header pair (blank spacer + titled rule) for menus.
 */
function createSection(title: string): [Separator, Separator] {
    return [
        new Separator(" "),
        new Separator(`─ ${title} ${"─".repeat(Math.max(0, 35 - title.length))}`),
    ];
}

/**
 * Builds the user-tier menu choices with section separators, current values,
 * and `short` properties on every actionable choice.
 */
function buildUserMenuChoices(
    config: Required<MerlinConfig>
): (MenuChoice | Separator)[] {
    const choices: (MenuChoice | Separator)[] = [];

    choices.push(...createSection(SECTION_HEADERS.settings));
    for (const field of ALL_CONFIGURABLE_FIELDS) {
        choices.push(formatFieldChoice(field, config[field], config));
    }

    choices.push(new Separator(" "));
    choices.push(new Separator("─────────────────────────────────────"));
    choices.push(formatActionChoice("show", config));
    choices.push(formatActionChoice("reset", config));
    choices.push(formatActionChoice("back", config));
    choices.push(formatActionChoice("exit", config));

    return choices;
}

/**
 * Configure the UI theme (wizard or standard).
 */
async function configureTheme(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const theme = await select({
        message: CONFIGURE_PROMPTS.theme,
        choices: [
            {
                value: "wizard" as const,
                name: CONFIGURE_PROMPTS.themeWizardLabel,
                short: "wizard",
            },
            {
                value: "standard" as const,
                name: CONFIGURE_PROMPTS.themeStandardLabel,
                short: "standard",
            },
        ],
        default: config.theme,
    });

    save({ theme });
    console.log(colors.success(`\n${SET_TO_PREFIX.theme}: ${theme}`));
}

/**
 * Configure the maximum subject line length.
 * Validates input is a number between 10-200.
 */
async function configureMaxSubjectLength(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const value = await input({
        message: CONFIGURE_PROMPTS.maxSubjectLength,
        default: String(config.maxSubjectLength),
        validate: createRangeValidator(10, 200),
    });

    save({ maxSubjectLength: parseInt(value, 10) });
    console.log(colors.success(`\n${SET_TO_PREFIX.maxSubjectLength}: ${value}`));
}

/**
 * Configure the maximum scope length.
 * Validates input is a number between 5-50.
 */
async function configureMaxScopeLength(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const value = await input({
        message: CONFIGURE_PROMPTS.maxScopeLength,
        default: String(config.maxScopeLength),
        validate: createRangeValidator(5, 50),
    });

    save({ maxScopeLength: parseInt(value, 10) });
    console.log(colors.success(`\n${SET_TO_PREFIX.maxScopeLength}: ${value}`));
}

/**
 * Configure the external editor command.
 * Validates input is not empty.
 */
async function configureEditor(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const editor = await input({
        message: CONFIGURE_PROMPTS.editor,
        default: config.editor,
        validate: createNonEmptyValidator("Editor command"),
    });

    save({ editor: editor.trim() });
    console.log(colors.success(`\n${SET_TO_PREFIX.editor}: ${editor.trim()}`));
}

/**
 * Configure the auto-add setting.
 * Toggles whether to automatically stage changes before commit.
 */
async function configureAutoAdd(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const autoAdd = await confirm({
        message: CONFIGURE_PROMPTS.autoAdd,
        default: config.autoAdd,
    });

    save({ autoAdd });
    console.log(colors.success(`\n${SET_TO_PREFIX.autoAdd}: ${autoAdd}`));
}

async function configureShowCharacterCounter(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const showCharacterCounter = await confirm({
        message: CONFIGURE_PROMPTS.showCharacterCounter,
        default: config.showCharacterCounter,
    });

    save({ showCharacterCounter });
    console.log(
        colors.success(`\n${SET_TO_PREFIX.showCharacterCounter}: ${showCharacterCounter}`)
    );
}

/**
 * Display the current configuration as formatted JSON.
 */
async function showConfig(): Promise<void> {
    const repoRoot = await getRepoRoot();
    const config = loadConfig(repoRoot);

    console.log(colors.header(`\n${DISPLAY.currentConfigHeader}`));
    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));

    const displayConfig = {
        theme: config.theme,
        maxSubjectLength: config.maxSubjectLength,
        maxScopeLength: config.maxScopeLength,
        editor: config.editor,
        autoAdd: config.autoAdd,
        showCharacterCounter: config.showCharacterCounter,
        types: `[${config.types.length} commit types]`,
    };

    console.log(colors.content(JSON.stringify(displayConfig, null, 2)));
    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));
    console.log(colors.muted(`${DISPLAY.effectiveConfigNote}\n`));
}

/**
 * Display the current project-level overrides as formatted JSON.
 * Shows only fields explicitly set in <repoRoot>/.merlinrc.json, not the
 * merged effective config.
 */
async function showProjectConfig(repoRoot: string): Promise<void> {
    const projectConfig = loadProjectConfig(repoRoot);
    const repoName = basename(repoRoot);

    console.log(colors.header(`\n${DISPLAY.projectOverridesHeader} (${repoName}):`));
    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));

    if (Object.keys(projectConfig).length === 0) {
        console.log(colors.muted(DISPLAY.noProjectOverrides));
    } else {
        console.log(colors.content(JSON.stringify(projectConfig, null, 2)));
    }

    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));
    console.log(colors.muted(`${DISPLAY.configFileLabel} ${repoName}/.merlinrc.json\n`));
}

/**
 * Display the current user-level configuration as formatted JSON.
 * Shows only fields explicitly set in ~/.merlinrc.json, not the
 * merged effective config.
 */
async function showUserConfig(): Promise<void> {
    const userConfig = loadUserConfig();

    console.log(colors.header(`\n${DISPLAY.userConfigHeader}`));
    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));

    if (Object.keys(userConfig).length === 0) {
        console.log(colors.muted(DISPLAY.noUserConfig));
    } else {
        console.log(colors.content(JSON.stringify(userConfig, null, 2)));
    }

    console.log(colors.muted("-".repeat(SEPARATOR_WIDTH_CHARACTERS)));
    console.log(colors.muted(`${DISPLAY.configFileLabel} ${DISPLAY.userConfigFile}\n`));
}

/**
 * Reset project-level overrides with user confirmation.
 *
 * Semantics: resetProjectConfig (Option B) seeds the file with the theme
 * baseline, so "reset" means "clear all overrides except theme". We early-
 * return when the only field is already theme, because then a reset would
 * be a no-op and the confirm prompt would be misleading.
 */
async function resetProjectConfigWithConfirmation(
    repoRoot: string,
    messages: ThemeMessages
): Promise<void> {
    const projectConfig = loadProjectConfig(repoRoot);
    const fields = Object.keys(projectConfig);
    const hasResettableOverrides =
        fields.length > 1 || (fields.length === 1 && fields[0] !== "theme");

    if (!hasResettableOverrides) {
        console.log(colors.muted(`\n${DISPLAY.noProjectOverridesToReset}\n`));
        return;
    }

    console.log(colors.warning(`\n${messages.warnings.config.resetConfig}`));

    const confirmed = await confirm({
        message: DISPLAY.resetProjectConfirm,
        default: false,
    });

    if (!confirmed) {
        console.log(colors.muted(`\n${DISPLAY.resetCancelled}`));
        return;
    }

    resetProjectConfig(repoRoot);
    console.log(colors.success(`\n${messages.success.config.saved}`));
}

/**
 * Reset configuration to defaults with user confirmation.
 */
async function resetConfigWithConfirmation(messages: ThemeMessages): Promise<void> {
    console.log(colors.warning(`\n${messages.warnings.config.resetConfig}`));

    const confirmed = await confirm({
        message: DISPLAY.resetUserConfirm,
        default: false,
    });

    if (confirmed) {
        resetConfig();
        console.log(colors.success(`\n${messages.success.config.saved}`));
    } else {
        console.log(colors.muted(`\n${DISPLAY.resetCancelled}`));
    }
}

/**
 * Dispatches a configure action to the appropriate handler.
 * Shared by both user and project config menus to avoid duplication.
 */
async function dispatchConfigureAction(
    field: ConfigurableField,
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    switch (field) {
        case "theme":
            await configureTheme(config, save);
            break;
        case "maxSubjectLength":
            await configureMaxSubjectLength(config, save);
            break;
        case "maxScopeLength":
            await configureMaxScopeLength(config, save);
            break;
        case "editor":
            await configureEditor(config, save);
            break;
        case "autoAdd":
            await configureAutoAdd(config, save);
            break;
        case "showCharacterCounter":
            await configureShowCharacterCounter(config, save);
            break;
        default:
            break;
    }
}

/**
 * Asks which config scope to edit. Skips the selector and warns
 * when there is no git repository (project config is unavailable).
 */
async function selectConfigScope(
    repoRoot: string | null,
    messages: ThemeMessages
): Promise<"user" | "project"> {
    if (repoRoot === null) {
        console.log(colors.warning(messages.warnings.config.noProjectConfig));
        return "user";
    }

    return select({
        message: messages.config.scopeSelector,
        choices: [
            { value: "user" as const, name: messages.config.scopeUser },
            { value: "project" as const, name: messages.config.scopeProject },
        ],
    });
}

/**
 * Ensures a project .merlinrc.json exists at the repo root.
 * Prompts to create one if missing, seeding with only the theme field.
 */
async function ensureProjectConfigExists(
    repoRoot: string,
    messages: ThemeMessages
): Promise<boolean> {
    const projectConfig = loadProjectConfig(repoRoot);
    if (Object.keys(projectConfig).length > 0) {
        return true;
    }

    console.log(colors.muted(`\n${messages.config.noProjectConfig}`));
    const shouldCreate = await confirm({
        message: messages.config.createProjectConfig,
        default: true,
    });

    if (!shouldCreate) {
        return false;
    }

    saveProjectConfig({ theme: DEFAULT_CONFIG.theme }, repoRoot);
    console.log(colors.success(`\n${messages.config.projectConfigCreated}`));
    return true;
}

/**
 * Two-section project config menu. Shows fields explicitly set in
 * .merlinrc.json ("Project overrides") and fields available to add
 * ("Add override"). Selecting an override offers change or remove.
 */
async function runProjectConfigMenu(repoRoot: string): Promise<"back" | "exit"> {
    const save: SaveFn = (config) => saveProjectConfig(config, repoRoot);

    let running = true;
    while (running) {
        const config = loadConfig(repoRoot);
        const messages = getMessages(repoRoot);
        const projectConfig = loadProjectConfig(repoRoot);
        const configuredFields = ALL_CONFIGURABLE_FIELDS.filter(
            (field) => field in projectConfig
        );
        const availableFields = ALL_CONFIGURABLE_FIELDS.filter(
            (field) => !(field in projectConfig)
        );

        const choices: (
            | { value: ConfigMenuAction; name: string; short?: string }
            | Separator
        )[] = [];

        if (configuredFields.length > 0) {
            choices.push(...createSection(SECTION_HEADERS.projectOverrides));
            for (const field of configuredFields) {
                choices.push(formatFieldChoice(field, config[field], config));
            }
        }

        if (availableFields.length > 0) {
            choices.push(...createSection(SECTION_HEADERS.addOverride));
            for (const field of availableFields) {
                choices.push(formatFieldChoiceNoValue(field, config));
            }
        }

        choices.push(new Separator(" "));
        choices.push(new Separator("─────────────────────────────────────"));
        choices.push(formatActionChoice("show", config));
        choices.push(formatActionChoice("reset", config));
        choices.push(formatActionChoice("back", config));
        choices.push(formatActionChoice("exit", config));

        const choice = await select<ConfigMenuAction>({
            message: MENU_PROMPT,
            choices,
            pageSize: choices.length,
            loop: false,
        });

        if (choice === "back") {
            console.log(colors.muted(`\n${messages.config.back}`));
            return "back";
        }

        if (choice === "exit") {
            running = false;
            console.log(colors.muted(`\n${messages.config.exit}\n`));
            return "exit";
        }

        if (choice === "show") {
            await showProjectConfig(repoRoot);
            console.log();
            continue;
        }

        if (choice === "reset") {
            await resetProjectConfigWithConfirmation(repoRoot, messages);
            console.log();
            continue;
        }

        const isConfigured = configuredFields.includes(choice);
        if (isConfigured) {
            const action = await select({
                message: messages.config.projectFieldAction(choice),
                choices: [
                    { value: "change", name: FIELD_ACTION_LABELS.change },
                    { value: "remove", name: FIELD_ACTION_LABELS.remove },
                ],
            });

            if (action === "remove") {
                removeProjectConfigField(choice, repoRoot);
                console.log(
                    colors.success(
                        `\n${DISPLAY.removedFieldPrefix} ${choice} from project config`
                    )
                );
            } else {
                await dispatchConfigureAction(choice, config, save);
            }
        } else {
            await dispatchConfigureAction(choice, config, save);
        }

        if (running) {
            console.log();
        }
    }

    return "exit";
}

/**
 * Runs the user-tier config menu loop. Returns "back" when the user
 * wants to return to the scope selector, or "exit" to quit entirely.
 */
async function runUserConfigMenu(repoRoot: string | null): Promise<"back" | "exit"> {
    let running = true;
    while (running) {
        const config = loadConfig(repoRoot);
        const messages = getMessages(repoRoot);

        const menuChoices = buildUserMenuChoices(config);
        const choice = await select<ConfigMenuAction>({
            message: MENU_PROMPT,
            choices: menuChoices,
            pageSize: menuChoices.length,
            loop: false,
        });

        switch (choice) {
            case "theme":
            case "maxSubjectLength":
            case "maxScopeLength":
            case "editor":
            case "autoAdd":
            case "showCharacterCounter":
                await dispatchConfigureAction(choice, config, saveConfig);
                break;
            case "show":
                await showConfig();
                break;
            case "reset":
                await resetConfigWithConfirmation(messages);
                break;
            case "back":
                console.log(colors.muted(`\n${messages.config.back}`));
                return "back";
            case "exit":
                running = false;
                console.log(colors.muted(`\n${messages.config.exit}\n`));
                return "exit";
            default:
                break;
        }

        if (running) {
            console.log();
        }
    }

    return "exit";
}

/**
 * Main interactive configuration menu loop.
 * Opens with a scope selector, then shows the appropriate sub-menu.
 * When a sub-menu returns "back", re-displays the scope selector.
 */
async function interactiveConfigMenu(): Promise<void> {
    const repoRoot = await getRepoRoot();
    const initialMessages = getMessages(repoRoot);
    console.log(colors.header(`\n${initialMessages.config.intro}\n`));

    let navigating = true;
    while (navigating) {
        const messages = getMessages(repoRoot);
        const scope = await selectConfigScope(repoRoot, messages);

        let menuResult: "back" | "exit";

        if (scope === "project") {
            const hasProjectConfig = await ensureProjectConfigExists(repoRoot!, messages);
            if (!hasProjectConfig) {
                continue;
            }
            menuResult = await runProjectConfigMenu(repoRoot!);
        } else {
            menuResult = await runUserConfigMenu(repoRoot);
        }

        if (menuResult === "exit") {
            navigating = false;
        }
    }
}

async function handleShowConfig(
    scope: boolean | "user" | "project",
    repoRoot: string | null,
    messages: ThemeMessages
): Promise<void> {
    switch (scope) {
        case "user":
            await showUserConfig();
            return;
        case "project":
            if (!repoRoot) {
                console.log(
                    colors.warning(`\n${messages.warnings.config.noProjectConfig}\n`)
                );
                return;
            }
            await showProjectConfig(repoRoot);
            return;
        default:
            await showConfig();
    }
}

/**
 * Configuration management command handler.
 *
 * Provides three modes of operation:
 * - `--show`: Display current configuration as formatted JSON
 * - `--reset`: Reset configuration to defaults with confirmation
 * - Default: Interactive menu for modifying individual settings
 *
 * @param options - Command line options
 * @param options.show - Scope to display: "user", "project", or true for effective config
 * @param options.reset - Reset all settings to defaults after confirmation
 *
 * @example
 * // Show current config
 * merlin config --show
 *
 * @example
 * // Reset to defaults
 * merlin config --reset
 *
 * @example
 * // Interactive configuration
 * merlin config
 */
export async function configCommand(options: ConfigOptions): Promise<void> {
    const repoRoot = await getRepoRoot();
    const messages = getMessages(repoRoot);
    const removeSigintHandler = setupSigintHandler(messages);

    try {
        if (options.show) {
            await handleShowConfig(options.show, repoRoot, messages);
            return;
        }

        if (options.reset) {
            await resetConfigWithConfirmation(messages);
            return;
        }

        await interactiveConfigMenu();
    } catch (error) {
        // Handle ExitPromptError (thrown by Inquirer on Ctrl+C)
        if ((error as Error).name === "ExitPromptError") {
            console.log(colors.warning(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }

        // Re-throw unexpected errors
        console.error(colors.error("\nAn unexpected error occurred:"));
        console.error(colors.error((error as Error).message));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
