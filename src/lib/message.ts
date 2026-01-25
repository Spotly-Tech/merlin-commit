import type { CommitAnswers } from "../types/index.js";

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

/**
 * Enhances commit message preview with visual indicators and emoji.
 *
 * Processes a commit message line-by-line to add contextual icons:
 * - ⚠️ prefix for breaking change declarations
 * - 🔗 prefix for issue references (Fixes, Closes, Resolves)
 *
 * This improves readability when displaying commit previews in the terminal
 * before final confirmation.
 *
 * @param message - Raw commit message text
 * @returns Formatted message with visual indicators
 *
 * @example
 * const message = "feat: new feature\n\nBREAKING CHANGE: API changed\n\nFixes #123";
 * formatPreview(message)
 * // Returns:
 * // "feat: new feature
 * //
 * // ⚠️ BREAKING CHANGE: API changed
 * //
 * // 🔗 Fixes #123"
 *
 * @example
 * const simpleMessage = "fix: correct typo";
 * formatPreview(simpleMessage)
 * // Returns: "fix: correct typo" (unchanged, no special indicators needed)
 */
export function formatPreview(message: string): string {
    const lines = message.split("\n");
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("BREAKING CHANGE:")) {
            formattedLines.push("⚠️ " + line);
        } else if (line.match(/(fixes|closes|resolves|refs|related to) #\d+/i)) {
            formattedLines.push("🔗 " + line);
        } else {
            formattedLines.push(line);
        }
    }

    return formattedLines.join("\n");
}
