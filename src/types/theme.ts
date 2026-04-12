/**
 * All user-facing messages for a themed commit interface.
 * Different message sets enable wizard or standard themes.
 *
 * Cross-cutting categories (errors, warnings, success, tips) are sub-grouped
 * by command domain (commit, config, init) with shared messages at the top level.
 * Properties that need dynamic parameters are template functions instead of strings.
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

        /**
         * Header shown above the commit preview block.
         * @example "📝 Commit Preview:" (wizard)
         * @example "Commit Preview:" (standard)
         */
        previewHeader: string;
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
         * Template function for the action prompt when a configured field is selected.
         * @param field - The config field name being acted on
         * @example (field) => `🔮 What fate shall befall ${field}:` (wizard)
         * @example (field) => `Action for ${field}:` (standard)
         */
        projectFieldAction: (field: string) => string;
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
     * Success messages for completed operations, sub-grouped by domain.
     */
    success: {
        commit: {
            /** After successful commit creation. */
            created: string;
            /** After successful commit amend. */
            amended: string;
            /** After dry-run completion (preview without committing). */
            dryRun: string;
        };
        config: {
            /** After saving configuration. */
            saved: string;
        };
        init: {
            /** After successful initialization. */
            completed: string;
        };
    };

    /**
     * Error messages for failed operations or validation, sub-grouped by domain.
     */
    errors: {
        /** Error when current directory is not a git repository (shared: commit + init). */
        notRepo: string;

        commit: {
            /** No staged changes exist to commit. */
            noStaged: string;
            /** Required field is empty. */
            required: string;
            /** Input exceeds maximum length. Template function includes the max value. */
            tooLong: (maxCharacters: number) => string;
            /** Input contains invalid format or characters. */
            malformed: string;
            /** Git commit command failed. */
            commitFailed: string;
            /** External editor failed to launch or save. */
            editorFailed: string;
        };

        init: {
            /** package.json is not found during init. */
            noPackageJson: string;
            /** npm install failed during init. */
            installFailed: string;
            /** Husky initialization failed. */
            huskyFailed: string;
            /** Commit-msg hook creation failed. */
            hookFailed: string;
            /** Commitlint config creation failed. */
            configFailed: string;
            /** Git alias setup failed. */
            aliasFailed: string;
        };
    };

    /**
     * Warning messages for non-critical issues, sub-grouped by domain.
     */
    warnings: {
        /** User cancels the operation (shared: commit + config + init). */
        cancel: string;

        commit: {
            /** Git hooks are bypassed with --no-verify. */
            noVerify: string;
        };

        config: {
            /** Before resetting configuration to defaults. */
            resetConfig: string;
            /** Project config is unavailable (no git repository). */
            noProjectConfig: string;
        };

        init: {
            /** Existing setup files are detected during init. */
            existingSetup: string;
            /** Git merlin alias already exists. */
            aliasExists: string;
        };
    };

    /**
     * Helpful tips displayed contextually, sub-grouped by domain.
     */
    tips: {
        commit: {
            /** How to stage files with git add. */
            gitAdd: string;
        };

        init: {
            /** Tip to run git init when not in a repository. */
            runGitInit: string;
            /** Tip to run npm init when package.json is missing. */
            runNpmInit: string;
            /** Tip for manual dependency installation. */
            manualInstall: string;
            /** Next steps guidance after successful init. */
            nextSteps: string;
        };
    };

    /**
     * Messages for the `merlin init` command.
     */
    init: {
        /** Welcome message when init command starts. */
        intro: string;
        /** Farewell message when init command completes. */
        exit: string;
        /** Message while checking for package.json existence. */
        checkingPackageJson: string;
        /** Prompt asking if user wants to install dependencies. */
        installDeps: string;
        /** Spinner message during npm install. */
        installingDeps: string;
        /** Spinner message during husky initialization. */
        initializingHusky: string;
        /** Spinner message during hook file creation. */
        creatingHook: string;
        /** Spinner message during commitlint config creation. */
        creatingCommitlint: string;
        /** Prompt asking if user wants to setup git merlin alias. */
        setupAlias: string;
        /** Prompt for selecting alias scope. */
        aliasScope: string;
        /** Spinner message during git alias creation. */
        creatingAlias: string;
        /** Message when skipping existing file that won't be overwritten. */
        skipExisting: string;
        /**
         * Prompt asking if user wants to overwrite existing file.
         * Template function - fileName is optional (omit for alias overwrite).
         * @param fileName - Optional file/directory name being overwritten
         */
        overwrite: (fileName?: string) => string;
        /** Label for global alias scope option. */
        aliasScopeGlobal: string;
        /** Label for local alias scope option. */
        aliasScopeLocal: string;
        /** Prompt asking if user wants to create project-level config. */
        createProjectConfig: string;
        /** Spinner message during project config creation. */
        creatingProjectConfig: string;
    };
};
