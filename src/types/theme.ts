/**
 * All user-facing messages for a themed commit interface.
 * Different message sets enable wizard or standard themes.
 */
export type ThemeMessages = {
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

        /**
         * Farewell message after dry-run preview (no commit created).
         * @example "🔮 The vision fades - no spell was cast." (wizard)
         * @example "Dry run complete - no commit was created." (standard)
         */
        dryRunExit: string;
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

        /**
         * Prompt for choosing user vs project config scope.
         * @example "🔮 Choose which tome to inscribe:" (wizard)
         * @example "Edit configuration scope:" (standard)
         */
        scopeSelector: string;

        /**
         * Label for user config scope choice.
         * @example "📜 Personal tome (all realms - ~/.merlinrc.json)" (wizard)
         * @example "User config (applies to all repos - ~/.merlinrc.json)" (standard)
         */
        scopeUser: string;

        /**
         * Label for project config scope choice.
         * @example "📁 Realm tome (this repository - .merlinrc.json)" (wizard)
         * @example "Project config (applies to this repo - .merlinrc.json)" (standard)
         */
        scopeProject: string;

        /**
         * Message when no project config file exists yet.
         * @example "📜 No realm enchantments found." (wizard)
         * @example "No project config found." (standard)
         */
        noProjectConfig: string;

        /**
         * Prompt asking to create a project config file.
         * @example "📜 Inscribe a .merlinrc.json for this realm?" (wizard)
         * @example "Create .merlinrc.json for this repo?" (standard)
         */
        createProjectConfig: string;

        /**
         * Success message after creating project config.
         * @example "📜 Realm enchantments inscribed" (wizard)
         * @example "Created .merlinrc.json" (standard)
         */
        projectConfigCreated: string;

        /**
         * Prompt message for the project config menu.
         * @example "🔮 Which realm enchantment to modify?" (wizard)
         * @example "Project configuration:" (standard)
         */
        projectMenu: string;

        /**
         * Prefix for the action prompt when a configured field is selected.
         * The field name is appended after this prefix.
         * @example "🔮 What fate shall befall" (wizard) → "🔮 What fate shall befall theme:"
         * @example "Action for" (standard) → "Action for theme:"
         */
        projectFieldAction: string;
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
         * @example "👀 Searching for unstaged scrolls"
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
         * @example "🎯 What domain does this affect? (optional):"
         */
        scope: string;

        /**
         * Prompt for writing commit subject.
         * @example "📝 Describe your spell briefly:"
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
         * Editor label shown when writing breaking change description.
         * @example "⚠️  Describe the breaking change:"
         */
        editorBreaking: string;

        /**
         * Prompt for referencing optional issues.
         * @example "🔗 Does this resolve any quests?"
         */
        issues: string;

        /**
         * Editor label shown when writing issue references.
         * @example "🔗 Enter issue references:"
         */
        editorIssues: string;

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
         * @example "✨ Spell successfully cast!"
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
         * @example "🎉 Your repository is now blessed!"
         */
        init: string;

        /**
         * Message after dry-run completion (preview without committing).
         * @example "👁️  Merlin peers into possible futures..."
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
         * @example "❌ No scrolls have been prepared for the ritual"
         */
        noStaged: string;

        /**
         * Error when required field is empty.
         * @example "❌ The ancient texts demand this field"
         */
        required: string;

        /**
         * Error when input exceeds maximum length.
         * @example "❌ This spell exceeds the maximum length"
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
         * @example "❌ The enchanted quill has vanished"
         */
        editorFailed: string;

        /**
         * Error when package.json is not found during init.
         * @example "❌ No package.json ledger found in this realm"
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
         * @example "⚠️  Existing blessings detected:"
         */
        existingSetup: string;

        /**
         * Warning when git merlin alias already exists.
         * @example "⚠️  A binding for 'git merlin' already exists"
         */
        aliasExists: string;

        /**
         * Warning when project config is unavailable (no git repository).
         * @example "⚠️  No sacred realm detected - realm enchantments are not available" (wizard)
         * @example "No git repository detected - project config is not available" (standard)
         */
        noProjectConfig: string;
    };

    /**
     * Helpful tips displayed contextually during the process.
     */
    tips: {
        /**
         * Tip explaining how to stage files with git add.
         * @example "💡 Summon scrolls with \"git add <file>\""
         */
        gitAdd: string;

        /**
         * Tip about using external editor for longer messages.
         * @example "📖 Press Enter to summon the enchanted quill"
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
         * @example '💡 Invoke "npm init" to create a package.json ledger'
         */
        runNpmInit: string;

        /**
         * Tip for manual dependency installation when npm install fails.
         * @example "💡 Try summoning manually: npm install -D"
         */
        manualInstall: string;

        /**
         * Next steps guidance after successful init.
         * @example "🌟 Your repository is blessed! Next steps:"
         */
        nextSteps: string;
    };

    /**
     * Messages for the `merlin init` command that sets up husky and commitlint.
     */
    init: {
        /**
         * Welcome message when init command starts.
         * @example "🧙 Merlin will bless your repository with commit guardians" (wizard)
         * @example "Setting up conventional commits for your repository" (standard)
         */
        intro: string;

        /**
         * Farewell message displayed when init command completes.
         * @example "🔮 Your repository blessings are complete." (wizard)
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
         * Spinner message during husky initialization.
         * @example "🎣 Awakening the husky guardian..." (wizard)
         * @example "Initializing husky..." (standard)
         */
        initializingHusky: string;

        /**
         * Spinner message during hook file creation.
         * @example "📜 Inscribing the commit-msg guardian..." (wizard)
         * @example "Creating commit-msg hook..." (standard)
         */
        creatingHook: string;

        /**
         * Spinner message during commitlint config creation.
         * @example "📋 Inscribing the commitlint tome..." (wizard)
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
