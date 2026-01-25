import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { setupSigintHandler } from "../lib/sigint.js";
import type { MerlinConfig, WizardMessages } from "../types/index.js";
import { getMessages, loadConfig, resetConfig, saveConfig } from "../utils/config.js";
import { createNonEmptyValidator, createRangeValidator } from "../utils/validators.js";

type ConfigOptions = {
    show?: boolean;
    reset?: boolean;
};

type MenuChoice =
    | "theme"
    | "maxSubjectLength"
    | "maxScopeLength"
    | "editor"
    | "autoAdd"
    | "show"
    | "reset"
    | "exit";

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

    return [
        {
            value: "theme" as MenuChoice,
            name: `${prefix.theme} Theme                    [${config.theme}]`,
        },
        {
            value: "maxSubjectLength" as MenuChoice,
            name: `${prefix.maxSubjectLength} Max subject length        [${config.maxSubjectLength}]`,
        },
        {
            value: "maxScopeLength" as MenuChoice,
            name: `${prefix.maxScopeLength} Max scope length          [${config.maxScopeLength}]`,
        },
        {
            value: "editor" as MenuChoice,
            name: `${prefix.editor} Default editor            [${config.editor}]`,
        },
        {
            value: "autoAdd" as MenuChoice,
            name: `${prefix.autoAdd} Auto-add unstaged files   [${config.autoAdd}]`,
        },
        {
            value: "show" as MenuChoice,
            name: `${prefix.show} Show current config`,
        },
        {
            value: "reset" as MenuChoice,
            name: `${prefix.reset} Reset to defaults`,
        },
        {
            value: "exit" as MenuChoice,
            name: `${prefix.exit} Exit`,
        },
    ];
}

/**
 * Configure the UI theme (wizard or standard).
 */
async function configureTheme(config: Required<MerlinConfig>): Promise<void> {
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

    saveConfig({ theme });
    console.log(chalk.green(`\nTheme set to: ${theme}`));
}

/**
 * Configure the maximum subject line length.
 * Validates input is a number between 10-200.
 */
async function configureMaxSubjectLength(config: Required<MerlinConfig>): Promise<void> {
    const value = await input({
        message: "Maximum subject line length (10-200):",
        default: String(config.maxSubjectLength),
        validate: createRangeValidator(10, 200),
    });

    saveConfig({ maxSubjectLength: parseInt(value, 10) });
    console.log(chalk.green(`\nMax subject length set to: ${value}`));
}

/**
 * Configure the maximum scope length.
 * Validates input is a number between 5-50.
 */
async function configureMaxScopeLength(config: Required<MerlinConfig>): Promise<void> {
    const value = await input({
        message: "Maximum scope length (5-50):",
        default: String(config.maxScopeLength),
        validate: createRangeValidator(5, 50),
    });

    saveConfig({ maxScopeLength: parseInt(value, 10) });
    console.log(chalk.green(`\nMax scope length set to: ${value}`));
}

/**
 * Configure the external editor command.
 * Validates input is not empty.
 */
async function configureEditor(config: Required<MerlinConfig>): Promise<void> {
    const editor = await input({
        message: "External editor command:",
        default: config.editor,
        validate: createNonEmptyValidator("Editor command"),
    });

    saveConfig({ editor: editor.trim() });
    console.log(chalk.green(`\nEditor set to: ${editor.trim()}`));
}

/**
 * Configure the auto-add setting.
 * Toggles whether to automatically stage changes before commit.
 */
async function configureAutoAdd(config: Required<MerlinConfig>): Promise<void> {
    const autoAdd = await confirm({
        message: "Automatically stage all changes before committing?",
        default: config.autoAdd,
    });

    saveConfig({ autoAdd });
    console.log(chalk.green(`\nAuto-add set to: ${autoAdd}`));
}

/**
 * Display the current configuration as formatted JSON.
 */
function showConfig(): void {
    const config = loadConfig();

    console.log(chalk.bold.cyan("\nCurrent Configuration:"));
    console.log(chalk.gray("-".repeat(60)));

    const displayConfig = {
        theme: config.theme,
        maxSubjectLength: config.maxSubjectLength,
        maxScopeLength: config.maxScopeLength,
        editor: config.editor,
        autoAdd: config.autoAdd,
        types: `[${config.types.length} commit types]`,
    };

    console.log(chalk.white(JSON.stringify(displayConfig, null, 2)));
    console.log(chalk.gray("-".repeat(60)));
    console.log(chalk.gray(`Config file: ~/.merlinrc.json\n`));
}

/**
 * Reset configuration to defaults with user confirmation.
 */
async function resetConfigWithConfirmation(messages: WizardMessages): Promise<void> {
    console.log(chalk.yellow(`\n${messages.warnings.resetConfig}`));

    const confirmed = await confirm({
        message: "Are you sure you want to reset all settings?",
        default: false,
    });

    if (confirmed) {
        resetConfig();
        console.log(chalk.green(`\n${messages.success.config}`));
    } else {
        console.log(chalk.gray("\nReset cancelled."));
    }
}

/**
 * Main interactive configuration menu loop.
 * Displays all options with current values and processes user selections.
 */
async function interactiveConfigMenu(messages: WizardMessages): Promise<void> {
    console.log(chalk.bold.cyan(`\n${messages.intro}`));
    console.log(chalk.gray("Configure Merlin's settings\n"));

    let running = true;
    while (running) {
        const config = loadConfig();

        const choice = await select<MenuChoice>({
            message:
                config.theme === "wizard"
                    ? "What would you like to configure?"
                    : "Select option:",
            choices: buildMenuChoices(config),
        });

        switch (choice) {
            case "theme":
                await configureTheme(config);
                break;
            case "maxSubjectLength":
                await configureMaxSubjectLength(config);
                break;
            case "maxScopeLength":
                await configureMaxScopeLength(config);
                break;
            case "editor":
                await configureEditor(config);
                break;
            case "autoAdd":
                await configureAutoAdd(config);
                break;
            case "show":
                showConfig();
                break;
            case "reset":
                await resetConfigWithConfirmation(messages);
                break;
            case "exit":
                running = false;
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
    const messages = getMessages();
    const removeSigintHandler = setupSigintHandler(messages);

    try {
        if (options.show) {
            showConfig();
            return;
        }

        if (options.reset) {
            await resetConfigWithConfirmation(messages);
            return;
        }

        await interactiveConfigMenu(messages);
    } catch (error) {
        // Handle ExitPromptError (thrown by Inquirer on Ctrl+C)
        if ((error as Error).name === "ExitPromptError") {
            console.log(chalk.yellow(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }

        // Re-throw unexpected errors
        console.error(chalk.red("\nAn unexpected error occurred:"));
        console.error(chalk.red((error as Error).message));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
