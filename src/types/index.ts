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
     * Messages specific to the commit command.
     */
    commit: {
        /**
         * Welcome message displayed when commit wizard starts.
         * @example "🧙 Merlin is ready to guide your commit" (wizard)
         * @example "Ready to create a commit" (standard)
         */
        intro: string;

        /**
         * Farewell message when commit completes or exits.
         * @example "🔮 Your spell is woven into history." (wizard)
         * @example "Commit complete" (standard)
         */
        exit: string;
    };

    /**
     * Messages specific to the config command.
     */
    config: {
        /**
         * Welcome message displayed when config menu starts.
         * @example "🧙 Merlin opens the tome of settings" (wizard)
         * @example "Configuration settings" (standard)
         */
        intro: string;

        /**
         * Farewell message when config menu exits.
         * @example "📜 Merlin's tome of secrets has been closed." (wizard)
         * @example "Configuration closed" (standard)
         */
        exit: string;
    };

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

        /**
         * Error when package.json is not found during init.
         * @example "❌ No package.json scroll found in this realm"
         */
        noPackageJson: string;

        /**
         * Error when npm install fails during init.
         * @example "❌ Failed to summon dependencies from the npm realm"
         */
        installFailed: string;

        /**
         * Error when husky initialization fails.
         * @example "❌ The husky guardian refused to awaken"
         */
        huskyFailed: string;

        /**
         * Error when commit-msg hook creation fails.
         * @example "❌ Failed to inscribe the commit-msg spell"
         */
        hookFailed: string;

        /**
         * Error when commitlint config creation fails.
         * @example "❌ Failed to create the commitlint tome"
         */
        configFailed: string;

        /**
         * Error when git alias setup fails.
         * @example "❌ Failed to bind the magical alias"
         */
        aliasFailed: string;
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

        /**
         * Warning when existing setup files are detected during init.
         * @example "⚠️  Existing enchantments detected:"
         */
        existingSetup: string;

        /**
         * Warning when git merlin alias already exists.
         * @example "⚠️  A binding for 'git merlin' already exists"
         */
        aliasExists: string;
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

        /**
         * Tip to run git init when not in a repository.
         * @example '💡 Invoke "git init" to create a sacred repository'
         */
        runGitInit: string;

        /**
         * Tip to run npm init when package.json is missing.
         * @example '💡 Invoke "npm init" to create a package.json scroll'
         */
        runNpmInit: string;

        /**
         * Tip for manual dependency installation when npm install fails.
         * @example "💡 Try summoning manually: npm install -D"
         */
        manualInstall: string;

        /**
         * Next steps guidance after successful init.
         * @example "🌟 Your enchantment is ready! Next steps:"
         */
        nextSteps: string;
    };

    /**
     * Messages for the `merlin init` command that sets up husky and commitlint.
     */
    init: {
        /**
         * Welcome message when init command starts.
         * @example "🧙 Merlin will enchant your repository with commit guardians" (wizard)
         * @example "Setting up conventional commits for your repository" (standard)
         */
        intro: string;

        /**
         * Farewell message displayed when init command completes.
         * @example "🔮 Your repository enchantments are complete." (wizard)
         * @example "Repository setup complete." (standard)
         */
        exit: string;

        /**
         * Message while checking for package.json existence.
         * @example "📦 Searching for package.json in the realm" (wizard)
         * @example "Checking for package.json" (standard)
         */
        checkingPackageJson: string;

        /**
         * Prompt asking if user wants to install dependencies.
         * @example "📦 Summon husky and commitlint from the ether?" (wizard)
         * @example "Install husky and commitlint dependencies?" (standard)
         */
        installDeps: string;

        /**
         * Spinner message during npm install.
         * @example "🔮 Summoning dependencies from the npm realm..." (wizard)
         * @example "Installing dependencies..." (standard)
         */
        installingDeps: string;

        /**
         * Prompt asking if user wants to initialize husky.
         * @example "🎣 Awaken the husky guardian?" (wizard)
         * @example "Initialize husky git hooks?" (standard)
         */
        initHusky: string;

        /**
         * Spinner message during husky initialization.
         * @example "🎣 Awakening the husky guardian..." (wizard)
         * @example "Initializing husky..." (standard)
         */
        initializingHusky: string;

        /**
         * Prompt asking if user wants to create commit-msg hook.
         * @example "📜 Inscribe the commit-msg protection spell?" (wizard)
         * @example "Create commit-msg hook for validation?" (standard)
         */
        createHook: string;

        /**
         * Spinner message during hook file creation.
         * @example "📜 Inscribing the commit-msg guardian..." (wizard)
         * @example "Creating commit-msg hook..." (standard)
         */
        creatingHook: string;

        /**
         * Prompt asking if user wants to create commitlint config.
         * @example "📋 Create the commitlint tome of rules?" (wizard)
         * @example "Create commitlint configuration?" (standard)
         */
        createCommitlint: string;

        /**
         * Spinner message during commitlint config creation.
         * @example "📋 Writing the commitlint scrolls..." (wizard)
         * @example "Creating commitlint config..." (standard)
         */
        creatingCommitlint: string;

        /**
         * Prompt asking if user wants to setup git merlin alias.
         * @example "🔗 Bind 'git merlin' to your spellbook?" (wizard)
         * @example "Setup 'git merlin' alias?" (standard)
         */
        setupAlias: string;

        /**
         * Prompt for selecting alias scope (global or local).
         * @example "🌍 Choose the scope of this binding:" (wizard)
         * @example "Select alias scope:" (standard)
         */
        aliasScope: string;

        /**
         * Spinner message during git alias creation.
         * @example "🔗 Binding the magical alias..." (wizard)
         * @example "Creating git alias..." (standard)
         */
        creatingAlias: string;

        /**
         * Message when skipping existing file that won't be overwritten.
         * @example "⏭️  Skipping existing artifact:" (wizard)
         * @example "Skipping existing file:" (standard)
         */
        skipExisting: string;

        /**
         * Prompt asking if user wants to overwrite existing file.
         * @example "⚠️  This artifact already exists. Overwrite it?" (wizard)
         * @example "File already exists. Overwrite?" (standard)
         */
        overwrite: string;

        /**
         * Label for global alias scope option.
         * @example "🌍 Global (all repositories)" (wizard)
         * @example "Global (all repositories)" (standard)
         */
        aliasScopeGlobal: string;

        /**
         * Label for local alias scope option.
         * @example "📁 Local (this repository only)" (wizard)
         * @example "Local (this repository only)" (standard)
         */
        aliasScopeLocal: string;

        /**
         * Prompt asking if user wants to create project-level .merlinrc.json.
         * @example "📜 Create a project config for team sharing?" (wizard)
         * @example "Create project config (.merlinrc.json) for team sharing?" (standard)
         */
        createProjectConfig: string;

        /**
         * Spinner message during project config creation.
         * @example "📜 Inscribing project enchantments..." (wizard)
         * @example "Creating project config..." (standard)
         */
        creatingProjectConfig: string;
    };
};

/**
 * Validator function signature matching Inquirer's expected interface.
 * Returns `true` if valid, or an error message string if invalid.
 */
export type Validator = (input: string) => true | string;

/**
 * Command-line options for the `merlin init` command.
 * Controls which parts of the setup process to execute.
 */
export type InitOptions = {
    /**
     * When true, only setup husky hooks without commitlint configuration.
     * Useful when commitlint is already configured or not desired.
     * @default false
     */
    huskyOnly?: boolean;

    /**
     * When true, only setup commitlint configuration without husky hooks.
     * Useful when husky is already configured or using different hook manager.
     * @default false
     */
    commitlintOnly?: boolean;

    /**
     * When true, skip npm install of dependencies (husky, commitlint).
     * Useful when dependencies are already installed or using different package manager.
     * @default false
     */
    noInstall?: boolean;
};
