import type { CommitType } from "./commit.js";

/**
 * Configuration options for customizing Merlin's behavior.
 * Can be defined in package.json under "merlin" key or in a dedicated config file.
 */
export type MerlinConfig = {
    /**
     * Custom commit types to override defaults.
     * If undefined, uses built-in types (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert).
     * @example [{ value: "feature", name: "Feature ✨", description: "New feature", emoji: "✨" }]
     */
    types?: CommitType[];

    /**
     * Maximum commit subject length including type and scope.
     * Total length of `<type>(<scope>): <subject>` should not exceed this.
     * @default 72
     * @example 50 | 72 | 100
     */
    maxSubjectLength?: number;

    /**
     * Maximum scope length in characters.
     * @default 20
     * @example 10 | 15 | 20
     */
    maxScopeLength?: number;

    /**
     * Command to launch external text editor for body/breaking changes.
     * Falls back to $EDITOR, $VISUAL environment variables, or 'vim'.
     * @default process.env.EDITOR || process.env.VISUAL || 'vim'
     * @example "vim" | "nano" | "code --wait" | "subl -w"
     */
    editor?: string;

    /**
     * Automatically stage all changes before committing.
     * When true, runs `git add .` before the commit prompt.
     * @default false
     */
    autoAdd?: boolean;

    /**
     * Visual theme for the commit interface.
     * - "wizard": Guided experience with themed messages and tips
     * - "standard": Minimalist interface with simple prompts
     * @default "wizard"
     */
    theme?: "wizard" | "standard";
};

/**
 * Command-line options for the `merlin config` command.
 * Controls whether to display or reset configuration.
 */
export type ConfigOptions = {
    /**
     * When true, display the current configuration and exit without opening the menu.
     * @default false
     */
    show?: boolean;

    /**
     * When true, reset configuration to defaults and exit without opening the menu.
     * @default false
     */
    reset?: boolean;
};

/**
 * Identifies which action the user selected from the config menu.
 * Each value maps to a setting key or a navigation action.
 */
export type ConfigMenuAction =
    | "theme"
    | "maxSubjectLength"
    | "maxScopeLength"
    | "editor"
    | "autoAdd"
    | "show"
    | "reset"
    | "exit";
