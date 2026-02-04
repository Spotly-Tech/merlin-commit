import type { CommitType, MerlinConfig, WizardMessages } from "../types/index.js";

export const COMMIT_TYPES: CommitType[] = [
    {
        value: "feat",
        name: "feat:        ✨  A new feature",
        description: "A new feature for users",
        emoji: "✨",
    },
    {
        value: "fix",
        name: "fix:         🐛  A bug fix",
        description: "A bug fix",
        emoji: "🐛",
    },
    {
        value: "docs",
        name: "docs:        📚  Documentation",
        description: "Documentation only changes",
        emoji: "📚",
    },
    {
        value: "style",
        name: "style:       💄  Code style",
        description: "Formatting, whitespace, etc (no code change)",
        emoji: "💄",
    },
    {
        value: "refactor",
        name: "refactor:    📦  Code refactoring",
        description: "Code change that neither fixes a bug nor adds a feature",
        emoji: "📦",
    },
    {
        value: "perf",
        name: "perf:        🚀  Performance",
        description: "Performance improvements",
        emoji: "🚀",
    },
    {
        value: "test",
        name: "test:        🚨  Tests",
        description: "Adding or updating tests",
        emoji: "🚨",
    },
    {
        value: "build",
        name: "build:       🔨  Build system",
        description: "Build system or external dependencies",
        emoji: "🔨",
    },
    {
        value: "ci",
        name: "ci:          ⚙️   CI/CD",
        description: "CI/CD configuration and scripts",
        emoji: "⚙️",
    },
    {
        value: "chore",
        name: "chore:       ♻️   Maintenance",
        description: "Maintenance tasks, tooling, or dependencies",
        emoji: "♻️",
    },
    {
        value: "revert",
        name: "revert:      ⏪  Revert",
        description: "Revert a previous commit",
        emoji: "⏪",
    },
];

export const WIZARD_MESSAGES: WizardMessages = {
    commit: {
        intro: "🧙 Merlin is ready to guide your commit",
        exit: "🔮 Your spell is woven into history.",
    },
    config: {
        intro: "🧙 Merlin opens the tome of settings",
        exit: "📜 Merlin's tome of secrets has been closed.",
    },
    checking: {
        repo: "🔮 Verifying the sacred repository",
        staged: "📜 Examining the staged scrolls",
        unstaged: "👀 Searching for unstaged scrolls",
    },
    prompts: {
        type: "✨ Choose the type of spell:",
        scope: "🎯 What realm does this affect? (optional)",
        subject: "📝 Describe your spell briefly:",
        body: "📖 Would you like to weave a detailed tale?",
        breaking: "⚠️  Does this spell shatter ancient contracts?",
        issues: "🔗 Does this resolve any quests?",
        confirm: "🔮 Shall Merlin cast this spell?",
    },
    success: {
        commit: "✨ Spell successfully cast!",
        amend: "🔄 Previous spell has been enhanced!",
        config: "⚙️  Merlin's preferences have been inscribed",
        init: "🎉 Your repository is now enchanted!",
        dryRun: "👁️  Merlin peers into possible futures...",
    },
    errors: {
        notRepo: "❌ This realm is not under Git's dominion",
        noStaged: "❌ No scrolls have been prepared for the ritual",
        required: "❌ The ancient texts demand this field",
        tooLong: "❌ This spell exceeds the maximum length",
        malformed: "❌ This spell contains forbidden runes",
        commitFailed: "❌ The spell failed to materialize",
        editorFailed: "❌ The magical tome has vanished",
    },
    warnings: {
        noVerify: "⚠️  Merlin bypasses the guardian wards",
        cancel: "🌙 The ritual has been cancelled",
        resetConfig: "⚠️  This will erase all of Merlin's learned wisdom",
    },
    tips: {
        gitAdd: '💡 Summon scrolls with "git add <file>"',
        useEditor: "📖 Press Enter to open the magical tome",
        breakingChange: "⚠️  Breaking changes shatter the old ways",
    },
};

export const STANDARD_MESSAGES: WizardMessages = {
    commit: {
        intro: "Ready to create a commit",
        exit: "Commit complete",
    },
    config: {
        intro: "Configuration settings",
        exit: "Configuration closed",
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
        commit: "Commit created successfully",
        amend: "Commit amended successfully",
        config: "Configuration updated",
        init: "Setup complete",
        dryRun: "Preview mode - no commit created",
    },
    errors: {
        notRepo: "Not a git repository",
        noStaged: "No staged changes found",
        required: "This field is required",
        tooLong: "Text exceeds maximum length",
        malformed: "Invalid format",
        commitFailed: "Failed to create commit",
        editorFailed: "Editor exited with error",
    },
    warnings: {
        noVerify: "Skipping git hooks (--no-verify)",
        cancel: "Commit cancelled",
        resetConfig: "This will reset all configuration to defaults",
    },
    tips: {
        gitAdd: 'Use "git add <file>" to stage changes',
        useEditor: "Press Enter to open your editor",
        breakingChange: "Breaking changes trigger major version bumps",
    },
};

export const DEFAULT_CONFIG: Required<MerlinConfig> = {
    types: COMMIT_TYPES,
    maxSubjectLength: 72,
    maxScopeLength: 20,
    editor: process.env.EDITOR || process.env.VISUAL || "vim",
    autoAdd: false,
    theme: "wizard",
};
