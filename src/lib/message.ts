import type { CommitAnswers } from "../types";

/**
 * Constructs a conventional commit message from user answers.
 *
 * Builds a properly formatted commit message following the Conventional Commits specification:
 * `<type>(<scope>): <subject>` followed by optional body, breaking changes, and issue references.
 * Each section is separated by blank lines as per the convention.
 *
 * @param answers - Structured commit data collected from user prompts
 * @returns Formatted commit message string ready for git commit
 *
 * @example
 * // Basic commit with type and subject
 * buildCommitMessage({ type: 'feat', subject: 'add user login' })
 * // Returns: "feat: add user login"
 *
 * @example
 * // Full commit with all fields
 * buildCommitMessage({
 *   type: 'feat',
 *   scope: 'auth',
 *   subject: 'add OAuth support',
 *   body: 'Implements OAuth 2.0 flow with Google and GitHub providers',
 *   breaking: 'Password-based auth now requires migration',
 *   issues: 'closes #123, refs #456'
 * })
 * // Returns:
 * // "feat(auth): add OAuth support
 * //
 * // Implements OAuth 2.0 flow with Google and GitHub providers
 * //
 * // BREAKING CHANGE: Password-based auth now requires migration
 * //
 * // closes #123, refs #456"
 *
 * @see CommitAnswers
 */
export function buildCommitMessage(answers: CommitAnswers): string {
    let message = answers.type;

    if (answers.scope) {
        message += `(${answers.scope})`;
    }
    if (answers.subject) {
        message += `: ${answers.subject}`;
    }
    if (answers.body) {
        message += `\n\n${answers.body}`;
    }
    if (answers.breaking) {
        message += `\n\nBREAKING CHANGE: ${answers.breaking}`;
    }
    if (answers.issues) {
        message += `\n\n${answers.issues}`;
    }

    return message;
}
