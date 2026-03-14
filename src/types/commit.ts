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
 * Command-line options for the `merlin commit` command.
 * Controls commit behavior such as preview mode and hook bypassing.
 */
export type CommitOptions = {
    /**
     * When true, preview the commit message without creating a commit.
     * @default false
     */
    dryRun?: boolean;

    /**
     * When true, amend the most recent commit instead of creating a new one.
     * @default false
     */
    amend?: boolean;

    /**
     * When true, skip pre-commit and commit-msg git hooks.
     * @default false
     */
    noVerify?: boolean;
};
