import { confirm, input, select, Separator } from "@inquirer/prompts";

import {
    getMessages,
    loadConfig,
    loadProjectConfig,
    removeProjectConfigField,
    resetConfig,
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
    ProjectConfigMenuAction,
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
];

/**
 * Builds menu choices with current configuration values displayed.
 * Uses theme-aware prefixes (emojis for wizard, bullets for standard).
 */
function buildMenuChoices(config: Required<MerlinConfig>) {
    const isWizardTheme = config.theme === "wizard";
    const prefix = isWizardTheme
        ? {
              theme: "🎨",
              maxSubjectLength: "📏",
              maxScopeLength: "🎯",
              editor: "📝",
              autoAdd: "🔄",
              show: "👁️ ",
              reset: "🗑️ ",
              exit: "👋",
          }
        : {
              theme: "•",
              maxSubjectLength: "•",
              maxScopeLength: "•",
              editor: "•",
              autoAdd: "•",
              show: "•",
              reset: "•",
              exit: "•",
          };

    const choices = [
        {
            value: "theme" as ConfigMenuAction,
            name: `${prefix.theme} Theme                    [${config.theme}]`,
        },
        {
            value: "maxSubjectLength" as ConfigMenuAction,
            name: `${prefix.maxSubjectLength} Max subject length        [${config.maxSubjectLength}]`,
        },
        {
            value: "maxScopeLength" as ConfigMenuAction,
            name: `${prefix.maxScopeLength} Max scope length          [${config.maxScopeLength}]`,
        },
        {
            value: "editor" as ConfigMenuAction,
            name: `${prefix.editor} Default editor            [${config.editor}]`,
        },
        {
            value: "autoAdd" as ConfigMenuAction,
            name: `${prefix.autoAdd} Auto-add unstaged files   [${config.autoAdd}]`,
        },
        {
            value: "show" as ConfigMenuAction,
            name: `${prefix.show} Show current config`,
        },
        {
            value: "reset" as ConfigMenuAction,
            name: `${prefix.reset} Reset to defaults`,
        },
        {
            value: "exit" as ConfigMenuAction,
            name: `${prefix.exit} Exit`,
        },
    ];

    return choices.map((choice) => ({
        ...choice,
        name: normalizeVS16Spacing(choice.name),
    }));
}

/**
 * Configure the UI theme (wizard or standard).
 */
async function configureTheme(
    config: Required<MerlinConfig>,
    save: SaveFn
): Promise<void> {
    const theme = await select({
        message: "Select theme:",
        choices: [
            {
                value: "wizard" as const,
                name: "wizard   - Magical experience with themed messages",
            },
            {
                value: "standard" as const,
                name: "standard - Minimalist, professional interface",
            },
        ],
        default: config.theme,
    });

    save({ theme });
    console.log(colors.success(`\nTheme set to: ${theme}`));
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
        message: "Maximum subject line length (10-200):",
        default: String(config.maxSubjectLength),
        validate: createRangeValidator(10, 200),
    });

    save({ maxSubjectLength: parseInt(value, 10) });
    console.log(colors.success(`\nMax subject length set to: ${value}`));
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
        message: "Maximum scope length (5-50):",
        default: String(config.maxScopeLength),
        validate: createRangeValidator(5, 50),
    });

    save({ maxScopeLength: parseInt(value, 10) });
    console.log(colors.success(`\nMax scope length set to: ${value}`));
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
        message: "External editor command:",
        default: config.editor,
        validate: createNonEmptyValidator("Editor command"),
    });

    save({ editor: editor.trim() });
    console.log(colors.success(`\nEditor set to: ${editor.trim()}`));
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
        message: "Automatically stage all changes before committing?",
        default: config.autoAdd,
    });

    save({ autoAdd });
    console.log(colors.success(`\nAuto-add set to: ${autoAdd}`));
}

/**
 * Display the current configuration as formatted JSON.
 */
async function showConfig(): Promise<void> {
    const repoRoot = await getRepoRoot();
    const config = loadConfig(repoRoot);

    console.log(colors.header("\nCurrent Configuration:"));
    console.log(colors.muted("-".repeat(60)));

    const displayConfig = {
        theme: config.theme,
        maxSubjectLength: config.maxSubjectLength,
        maxScopeLength: config.maxScopeLength,
        editor: config.editor,
        autoAdd: config.autoAdd,
        types: `[${config.types.length} commit types]`,
    };

    console.log(colors.content(JSON.stringify(displayConfig, null, 2)));
    console.log(colors.muted("-".repeat(60)));
    console.log(colors.muted(`Config file: ~/.merlinrc.json\n`));
}

/**
 * Reset configuration to defaults with user confirmation.
 */
async function resetConfigWithConfirmation(messages: ThemeMessages): Promise<void> {
    console.log(colors.warning(`\n${messages.warnings.resetConfig}`));

    const confirmed = await confirm({
        message: "Are you sure you want to reset all settings?",
        default: false,
    });

    if (confirmed) {
        resetConfig();
        console.log(colors.success(`\n${messages.success.config}`));
    } else {
        console.log(colors.muted("\nReset cancelled."));
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
        console.log(colors.warning(messages.warnings.noProjectConfig));
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
async function runProjectConfigMenu(
    repoRoot: string,
    messages: ThemeMessages
): Promise<void> {
    const save: SaveFn = (config) => saveProjectConfig(config, repoRoot);

    let running = true;
    while (running) {
        const config = loadConfig(repoRoot);
        const projectConfig = loadProjectConfig(repoRoot);
        const configuredFields = ALL_CONFIGURABLE_FIELDS.filter(
            (field) => field in projectConfig
        );
        const availableFields = ALL_CONFIGURABLE_FIELDS.filter(
            (field) => !(field in projectConfig)
        );

        const choices: ({ value: ProjectConfigMenuAction; name: string } | Separator)[] =
            [];

        if (configuredFields.length > 0) {
            choices.push(new Separator(" "));
            choices.push(new Separator("─ Project overrides ─────────────────"));
            for (const field of configuredFields) {
                choices.push({
                    value: field,
                    name: `  ${field}  [${String(config[field])}]`,
                });
            }
        }

        if (availableFields.length > 0) {
            choices.push(new Separator(" "));
            choices.push(new Separator("─ Add override ──────────────────────"));
            for (const field of availableFields) {
                choices.push({ value: field, name: `  ${field}` });
            }
        }

        choices.push(new Separator(" "));
        choices.push(new Separator("─────────────────────────────────────"));
        choices.push({ value: "exit", name: "  Exit" });

        const choice = await select<ProjectConfigMenuAction>({
            message: messages.config.projectMenu,
            choices,
            pageSize: choices.length,
            loop: false,
        });

        if (choice === "exit") {
            running = false;
            console.log(colors.muted(`\n${messages.config.exit}\n`));
            break;
        }

        const isConfigured = configuredFields.includes(choice);
        if (isConfigured) {
            const action = await select({
                message: `${choice} [${String(config[choice])}]:`,
                choices: [
                    { value: "change", name: "Change value" },
                    { value: "remove", name: "Remove from project config" },
                ],
            });

            if (action === "remove") {
                removeProjectConfigField(choice, repoRoot);
                console.log(colors.success(`\nRemoved ${choice} from project config`));
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
}

/**
 * Main interactive configuration menu loop.
 * Opens with a scope selector, then shows the appropriate menu.
 */
async function interactiveConfigMenu(): Promise<void> {
    const repoRoot = await getRepoRoot();
    const initialMessages = getMessages(repoRoot);
    console.log(colors.header(`\n${initialMessages.config.intro}`));
    console.log(colors.muted(`${initialMessages.config.subtitle}\n`));

    const scope = await selectConfigScope(repoRoot, initialMessages);

    if (scope === "project") {
        const hasProjectConfig = await ensureProjectConfigExists(
            repoRoot!,
            initialMessages
        );
        if (!hasProjectConfig) {
            return;
        }
        await runProjectConfigMenu(repoRoot!, initialMessages);
        return;
    }

    let running = true;
    while (running) {
        const config = loadConfig(repoRoot);
        const messages = getMessages(repoRoot);

        const menuChoices = buildMenuChoices(config);
        const choice = await select<ConfigMenuAction>({
            message:
                config.theme === "wizard"
                    ? "What would you like to configure?"
                    : "Select option:",
            choices: menuChoices,
            pageSize: menuChoices.length,
            loop: true,
        });

        switch (choice) {
            case "theme":
            case "maxSubjectLength":
            case "maxScopeLength":
            case "editor":
            case "autoAdd":
                await dispatchConfigureAction(choice, config, saveConfig);
                break;
            case "show":
                await showConfig();
                break;
            case "reset":
                await resetConfigWithConfirmation(messages);
                break;
            case "exit":
                running = false;
                console.log(colors.muted(`\n${messages.config.exit}\n`));
                break;
            default:
                break;
        }

        if (running) {
            console.log(); // Add spacing between menu iterations
        }
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
 * @param options.show - Display current config as formatted JSON and exit
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
            await showConfig();
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
