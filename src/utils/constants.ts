import chalk from "chalk";

import type { CommitType, MerlinConfig, ThemeMessages } from "../types/index.js";

/**
 * Regex that matches the "BREAKING CHANGE:" prefix (case-insensitive).
 * Used to strip user-typed prefixes before buildCommitMessage() adds its own.
 */
export const BREAKING_CHANGE_PREFIX_REGEX = /^BREAKING CHANGE:\s*/i;

export const colors = {
    primary: chalk.cyan,
    header: chalk.bold.cyan,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    muted: chalk.gray,
    content: chalk.white,
};

export const COMMIT_TYPES: CommitType[] = [
    {
        value: "feat",
        name: "A new feature",
        description: "New functionality visible to users",
        emoji: "✨",
    },
    {
        value: "fix",
        name: "A bug fix",
        description: "Resolves incorrect or broken behavior",
        emoji: "🐛",
    },
    {
        value: "docs",
        name: "Documentation",
        description: "README, JSDoc, comments - no code logic changes",
        emoji: "📚",
    },
    {
        value: "style",
        name: "Code style",
        description: "Formatting, whitespace, semicolons - no logic changes",
        emoji: "💄",
    },
    {
        value: "refactor",
        name: "Code refactoring",
        description: "Restructure code without changing external behavior",
        emoji: "🔧",
    },
    {
        value: "perf",
        name: "Performance",
        description: "Faster execution, reduced memory, optimized queries",
        emoji: "🚀",
    },
    {
        value: "test",
        name: "Tests",
        description: "Add, update, or fix test cases - no production code",
        emoji: "🚨",
    },
    {
        value: "build",
        name: "Build system",
        description: "tsconfig, bundler, package.json scripts, dependencies",
        emoji: "🔨",
    },
    {
        value: "ci",
        name: "CI/CD",
        description: "GitHub Actions, pipelines, deployment config",
        emoji: "⚙️",
    },
    {
        value: "chore",
        name: "Maintenance",
        description: "Tooling, linting config, .gitignore - no production code",
        emoji: "♻️",
    },
    {
        value: "revert",
        name: "Revert",
        description: "Undo a previous commit entirely",
        emoji: "⏪",
    },
];

// Target terminal column widths for aligning commit type selector labels
export const VALUE_COLUMN_WIDTH = 12;
export const EMOJI_COLUMN_WIDTH = 4;
// U+FE0F variation selector - VS16 emojis render at different widths across terminals
export const VARIATION_SELECTOR = "\uFE0F";

export const WIZARD_MESSAGES: ThemeMessages = {
    commit: {
        intro: "🧙 Merlin is ready to guide your commit",
        exit: "🔮 Your spell is woven into history.",
        dryRunExit: "🔮 The vision fades - no spell was cast.",
        previewHeader: "📝 Commit Preview:",
    },
    config: {
        intro: "🧙 Merlin opens the tome of settings",
        exit: "📜 Merlin's tome of secrets has been closed.",
        scopeSelector: "🔮 Choose which tome to inscribe:",
        scopeUser: "📜 Personal tome (all realms - ~/.merlinrc.json)",
        scopeProject: "📁 Realm tome (this realm - .merlinrc.json)",
        noProjectConfig: "📜 No realm enchantments found.",
        createProjectConfig: "📜 Inscribe a .merlinrc.json for this realm?",
        projectConfigCreated: "📜 Realm enchantments inscribed",
        projectFieldAction: (field: string) => `🔮 What fate shall befall ${field}:`,
        back: "⬅️ Returning to the tome selection...",
    },
    checking: {
        repo: "🔮 Verifying the sacred realm",
        staged: "📜 Examining the staged scrolls",
        unstaged: "👀 Searching for unstaged scrolls",
    },
    prompts: {
        type: "🪄  Choose the type of spell:",
        scope: "🎯 What domain does this affect? (optional)",
        subject: "📝 Describe your spell briefly:",
        body: "📖 Would you like to weave a detailed tale?",
        breaking: "⚠️ Does this spell shatter ancient contracts?",
        issues: "🔗 Does this resolve any quests?",
        confirm: "🔮 Shall Merlin cast this spell?",
    },
    success: {
        commit: {
            created: "✨ Spell successfully cast!",
            amended: "🔄 Previous spell has been enhanced!",
            dryRun: "👁️ Merlin peers into possible futures...",
        },
        config: {
            saved: "⚙️ Merlin's preferences have been inscribed",
        },
        init: {
            completed: "✨ Your realm is now blessed!",
        },
    },
    errors: {
        notRepo: "❌ This realm is not under Git's dominion",
        commit: {
            noStaged: "❌ No scrolls have been prepared for the ritual",
            required: "❌ The ancient texts demand this field",
            tooLong: (maxCharacters: number) =>
                `❌ This spell exceeds the maximum length (max ${maxCharacters} characters)`,
            malformed: "❌ This spell contains forbidden runes",
            commitFailed: "❌ The spell failed to materialize",
            editorFailed: "❌ The enchanted quill has vanished",
        },
        init: {
            noPackageJson: "❌ No package.json ledger found in this realm",
            installFailed: "❌ Failed to summon dependencies from the npm realm",
            huskyFailed: "❌ The husky guardian refused to awaken",
            hookFailed: "❌ Failed to inscribe the commit-msg guardian",
            configFailed: "❌ Failed to create the commitlint tome",
            aliasFailed: "❌ Failed to bind the magical alias",
        },
    },
    warnings: {
        cancel: "🌙 The ritual has been cancelled",
        commit: {
            noVerify: "⚠️ Merlin bypasses the guardian wards",
        },
        config: {
            resetConfig: "⚠️ This will erase all of Merlin's learned wisdom",
            noProjectConfig:
                "⚠️ No sacred realm detected - realm enchantments are not available",
        },
        init: {
            existingSetup: "⚠️ Existing blessings detected:",
            aliasExists: "⚠️ A binding for 'git merlin' already exists",
        },
    },
    tips: {
        commit: {
            gitAdd: '💡 Summon scrolls with "git add <file>"',
        },
        init: {
            runGitInit: '💡 Invoke "git init" to create a sacred realm',
            runNpmInit: '💡 Invoke "npm init" to create a package.json ledger',
            manualInstall: "💡 Try summoning manually: npm install -D",
            nextSteps: "🌟 Your realm is blessed! Next steps:",
        },
    },
    init: {
        intro: "🧙 Merlin will bless your realm with commit guardians",
        checkingPackageJson: "📦 Searching for package.json in the realm",
        installDeps: "📦 Summon husky and commitlint from the ether?",
        installingDeps: "🔮 Summoning dependencies from the npm realm...",
        initializingHusky: "🎣 Awakening the husky guardian...",
        creatingHook: "📜 Inscribing the commit-msg guardian...",
        creatingCommitlint: "📋 Inscribing the commitlint tome...",
        setupAlias: "🔗 Bind 'git merlin' to your spellbook?",
        aliasScope: "🔮 Choose the scope of this binding:",
        creatingAlias: "🔗 Binding the magical alias...",
        skipExisting: "⏭️ Skipping existing artifact:",
        overwrite: (fileName?: string) =>
            fileName
                ? `⚠️ This artifact already exists. Overwrite it? (${fileName})`
                : "⚠️ This artifact already exists. Overwrite it?",
        aliasScopeGlobal: "🌍 Global (all realms)",
        aliasScopeLocal: "📁 Local (this realm only)",
        createProjectConfig: "📜 Create a realm tome for team sharing?",
        creatingProjectConfig: "📜 Inscribing project enchantments...",
        exit: "🔮 Your realm blessings are complete.",
    },
};

export const STANDARD_MESSAGES: ThemeMessages = {
    commit: {
        intro: "Ready to create a commit",
        exit: "Commit complete",
        dryRunExit: "Dry run complete - no commit was created.",
        previewHeader: "Commit Preview:",
    },
    config: {
        intro: "Configuration settings",
        exit: "Configuration closed",
        scopeSelector: "Edit configuration scope:",
        scopeUser: "User config (applies to all repos - ~/.merlinrc.json)",
        scopeProject: "Project config (applies to this repo - .merlinrc.json)",
        noProjectConfig: "No project config found.",
        createProjectConfig: "Create .merlinrc.json for this repo?",
        projectConfigCreated: "Created .merlinrc.json",
        projectFieldAction: (field: string) => `Action for ${field}:`,
        back: "Returning to scope selection...",
    },
    checking: {
        repo: "Checking git repository",
        staged: "Checking staged changes",
        unstaged: "Checking unstaged files",
    },
    prompts: {
        type: "Select the type of change:",
        scope: "Scope (optional):",
        subject: "Short description:",
        body: "Add a detailed description?",
        breaking: "Are there any breaking changes?",
        issues: "Reference any issues? (e.g., fixes #123)",
        confirm: "Create this commit?",
    },
    success: {
        commit: {
            created: "Commit created successfully",
            amended: "Commit amended successfully",
            dryRun: "Preview mode - no commit created",
        },
        config: {
            saved: "Configuration updated",
        },
        init: {
            completed: "Setup complete",
        },
    },
    errors: {
        notRepo: "Not a git repository",
        commit: {
            noStaged: "No staged changes found",
            required: "This field is required",
            tooLong: (maxCharacters: number) =>
                `Text exceeds maximum length (max ${maxCharacters} characters)`,
            malformed: "Invalid format",
            commitFailed: "Failed to create commit",
            editorFailed: "Editor exited with error",
        },
        init: {
            noPackageJson: "No package.json found",
            installFailed: "Failed to install dependencies",
            huskyFailed: "Failed to initialize husky",
            hookFailed: "Failed to create commit-msg hook",
            configFailed: "Failed to create commitlint config",
            aliasFailed: "Failed to create git alias",
        },
    },
    warnings: {
        cancel: "Commit cancelled",
        commit: {
            noVerify: "Skipping git hooks (--no-verify)",
        },
        config: {
            resetConfig: "This will reset all configuration to defaults",
            noProjectConfig:
                "No git repository detected - project config is not available",
        },
        init: {
            existingSetup: "Existing setup detected:",
            aliasExists: "Git alias 'merlin' already exists",
        },
    },
    tips: {
        commit: {
            gitAdd: 'Use "git add <file>" to stage changes',
        },
        init: {
            runGitInit: 'Run "git init" to initialize a repository',
            runNpmInit: 'Run "npm init" to create a package.json',
            manualInstall: "Install manually: npm install -D",
            nextSteps: "Setup complete! Next steps:",
        },
    },
    init: {
        intro: "Setting up conventional commits for your repository",
        checkingPackageJson: "Checking for package.json",
        installDeps: "Install husky and commitlint dependencies?",
        installingDeps: "Installing dependencies...",
        initializingHusky: "Initializing husky...",
        creatingHook: "Creating commit-msg hook...",
        creatingCommitlint: "Creating commitlint config...",
        setupAlias: "Setup 'git merlin' alias?",
        aliasScope: "Select alias scope:",
        creatingAlias: "Creating git alias...",
        skipExisting: "Skipping existing file:",
        overwrite: (fileName?: string) =>
            fileName
                ? `File already exists. Overwrite? (${fileName})`
                : "File already exists. Overwrite?",
        aliasScopeGlobal: "Global (all repositories)",
        aliasScopeLocal: "Local (this repository only)",
        createProjectConfig: "Create project config (.merlinrc.json) for team sharing?",
        creatingProjectConfig: "Creating project config...",
        exit: "Repository setup complete.",
    },
};

export const DEFAULT_CONFIG: Required<MerlinConfig> = {
    types: COMMIT_TYPES,
    maxSubjectLength: 72,
    maxScopeLength: 20,

    editor: process.platform === "win32" ? "notepad" : "vim",
    autoAdd: false,
    theme: "wizard",
};
