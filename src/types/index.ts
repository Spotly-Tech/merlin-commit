/**
 * Answers collected during commit message creation, following conventional commit format.
 */
export type CommitAnswers = {
    /**
     * Commit type categorizing the change.
     * @example "feat" | "fix" | "docs" | "refactor"
     */
    type: string;

    /**
     * Optional scope indicating affected codebase area.
     * Limited by maxScopeLength config (default: 20 characters).
     * @example "parser" | "api" | "ui/button"
     * @see MerlinConfig.maxScopeLength
     */
    scope?: string;

    /**
     * Short imperative description in present tense.
     * Appears after type and scope in format: `<type>(<scope>): <subject>`
     * Total line length limited by maxSubjectLength config (default: 72 characters).
     * @example "add user authentication" | "fix memory leak in parser"
     * @see MerlinConfig.maxSubjectLength
     */
    subject: string;

    /**
     * Optional detailed explanation with context and rationale.
     * Separated from subject by blank line in final commit message.
     * @example "This change improves performance by 40% through caching. Previously, every request hit the database."
     */
    body?: string;

    /**
     * Optional description of breaking changes for major version bumps.
     * Prefixed with "BREAKING CHANGE:" in commit footer.
     * @example "API endpoints now require authentication tokens in headers instead of query params"
     */
    breaking?: string;

    /**
     * Optional comma-separated issue references.
     * Automatically closes/updates referenced issues in many issue trackers.
     * @example "fixes #123" | "closes #456, #789" | "refs JIRA-101"
     */
    issues?: string;
};

/**
 * Configuration for a single conventional commit type option.
 */
export type CommitType = {
    /**
     * Machine-readable identifier used in commit messages.
     * @example "feat" | "fix" | "chore"
     */
    value: string;

    /**
     * Human-readable display name shown in selection prompts.
     * Can include formatting, emoji, and description for better UX.
     * @example "feat:     ✨ A new feature" | "fix:      🐛 A bug fix"
     */
    name: string;

    /**
     * Brief explanation of when to use this commit type.
     * @example "A new feature" | "A bug fix" | "Documentation changes"
     */
    description: string;

    /**
     * Visual icon representing this type.
     * @example "✨" | "🐛" | "📚" | ""
     */
    emoji: string;
};

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
 * All user-facing messages for a themed commit interface.
 * Different message sets enable wizard or standard themes.
 */
export type WizardMessages = {
    /**
     * Welcome message displayed when wizard starts.
     * @example "🧙 Merlin is ready to guide your commit"
     */
    intro: string;

    /**
     * Status messages during pre-flight validation checks.
     */
    checking: {
        /**
         * Message while verifying git repository exists.
         * @example "🔮 Verifying the sacred repository"
         */
        repo: string;

        /**
         * Message while checking for staged changes.
         * @example "📜 Examining the staged scrolls"
         */
        staged: string;

        /**
         * Message while detecting unstaged changes.
         * @example "👀 Searching for unstaged artifacts"
         */
        unstaged: string;
    };

    /**
     * Interactive prompts for commit message inputs.
     */
    prompts: {
        /**
         * Prompt for selecting commit type.
         * @example "✨ Choose the spell type:"
         */
        type: string;

        /**
         * Prompt for entering optional scope.
         * @example "🎯 What realm does this affect? (optional):"
         */
        scope: string;

        /**
         * Prompt for writing commit subject.
         * @example "📝 Describe your incantation (brief):"
         */
        subject: string;

        /**
         * Prompt for entering optional detailed body.
         * @example "📖 Weave the detailed tale?"
         */
        body: string;

        /**
         * Prompt for describing optional breaking changes.
         * @example "⚠️  Does this spell break ancient contracts?"
         */
        breaking: string;

        /**
         * Prompt for referencing optional issues.
         * @example "🔗 Does this resolve any quests?"
         */
        issues: string;

        /**
         * Prompt for final commit confirmation.
         * @example "🔮 Shall Merlin cast this spell?"
         */
        confirm: string;
    };

    /**
     * Success messages for completed operations.
     */
    success: {
        /**
         * Message after successful commit creation.
         * @example "✨ Commit successfully conjured!"
         */
        commit: string;

        /**
         * Message after successful commit amend.
         * @example "🔄 Previous spell has been enhanced!"
         */
        amend: string;

        /**
         * Message after saving configuration.
         * @example "⚙️  Merlin's preferences have been inscribed"
         */
        config: string;

        /**
         * Message after successful initialization.
         * @example "🎉 Your repository is now enchanted!"
         */
        init: string;

        /**
         * Message after dry-run completion (preview without committing).
         * @example "👁️  Merlin peers into the future..."
         */
        dryRun: string;
    };

    /**
     * Error messages for failed operations or validation.
     */
    errors: {
        /**
         * Error when current directory is not a git repository.
         * @example "❌ This realm is not under Git's dominion"
         */
        notRepo: string;

        /**
         * Error when no staged changes exist to commit.
         * @example "❌ No artifacts have been staged for the ritual"
         */
        noStaged: string;

        /**
         * Error when required field is empty.
         * @example "❌ The ancient texts demand this field"
         */
        required: string;

        /**
         * Error when input exceeds maximum length.
         * @example "❌ This incantation is too powerful (too long)"
         */
        tooLong: string;

        /**
         * Error when input contains invalid format or characters.
         * @example "❌ This spell is malformed"
         */
        malformed: string;

        /**
         * Error when git commit command fails.
         * @example "❌ The spell failed to materialize"
         */
        commitFailed: string;

        /**
         * Error when external editor fails to launch or save.
         * @example "❌ The magical editor has vanished"
         */
        editorFailed: string;
    };

    /**
     * Warning messages for non-critical issues or important notices.
     */
    warnings: {
        /**
         * Warning when git hooks are bypassed with --no-verify.
         * @example "⚠️  Merlin bypasses the guardian hooks"
         */
        noVerify: string;

        /**
         * Warning when user cancels the commit operation.
         * @example "🌙 The ritual has been cancelled"
         */
        cancel: string;

        /**
         * Warning before resetting configuration to defaults.
         * @example "⚠️  This will erase all of Merlin's learned preferences"
         */
        resetConfig: string;
    };

    /**
     * Helpful tips displayed contextually during the process.
     */
    tips: {
        /**
         * Tip explaining how to stage files with git add.
         * @example "💡 Summon artifacts with \"git add <file>\""
         */
        gitAdd: string;

        /**
         * Tip about using external editor for longer messages.
         * @example "📖 Press Enter to open the magical tome (editor)"
         */
        useEditor: string;

        /**
         * Tip explaining breaking changes and their implications.
         * @example "⚠️  Breaking changes alter the fabric of reality"
         */
        breakingChange: string;
    };

    /**
     * Farewell message when wizard exits or completes.
     * @example "🔮 Spell complete. Your history is preserved."
     */
    exit: string;
};

/**
 * Validator function signature matching Inquirer's expected interface.
 * Returns `true` if valid, or an error message string if invalid.
 */
export type Validator = (input: string) => true | string;
