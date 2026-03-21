import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

import type { StagedFile } from "./git.js";

/**
 * Checks whether the editor binary is available on PATH before launching.
 *
 * Uses `where` (Windows) or `which` (Unix) to search PATH for the binary
 * extracted from the editor command string.
 *
 * @param editorCommand - Editor command from config (e.g., "code --wait", "vim")
 * @returns true if the editor binary is found on PATH, false otherwise
 */
export function validateEditorAvailable(editorCommand: string): boolean {
    const { bin } = parseEditorCommand(editorCommand);
    const checkCommand = process.platform === "win32" ? "where" : "which";
    const result = spawnSync(checkCommand, [bin], { stdio: "pipe" });
    return result.status === 0;
}

/**
 * Context for the git commit message editor template.
 */
export type CommitEditorContext = {
    type: string;
    scope?: string;
    subject: string;
    stagedFiles: StagedFile[];
};

/**
 * Parses an editor command string into binary and arguments.
 *
 * Handles space-separated arguments and respects escaped spaces.
 *
 * @param editorCommand - The editor command (e.g., "code --wait --new-window")
 * @returns Object with bin (executable) and args (array of arguments)
 */
function parseEditorCommand(editorCommand: string): { bin: string; args: string[] } {
    const parts: string[] = [];
    let current = "";

    for (let i = 0; i < editorCommand.length; i++) {
        const char = editorCommand[i];
        if (char === " " && editorCommand[i - 1] !== "\\" && current.length > 0) {
            parts.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    if (current.length > 0) {
        parts.push(current);
    }

    const bin = parts[0] || "vim";
    const args = parts.slice(1).map((arg) => arg.replace(/\\ /g, " "));
    return { bin, args };
}

/**
 * Builds the template content for COMMIT_EDITMSG with helpful comments.
 *
 * @param context - Commit context including type, scope, subject, and staged files
 * @returns Template string with comments in git style
 */
function buildCommitMessageTemplate(context: CommitEditorContext): string {
    const lines: string[] = [];

    // Empty line at top for user to type
    lines.push("");
    lines.push("# Enter your commit body above this line.");
    lines.push("# ─────────────────────────────────────────────────────────────");

    // Show commit context
    const scopePart = context.scope ? ` | Scope: ${context.scope}` : "";
    lines.push(`# Type: ${context.type}${scopePart}`);
    lines.push(`# Subject: ${context.subject}`);
    lines.push("#");

    // Show staged files
    if (context.stagedFiles.length > 0) {
        lines.push("# Changes to be committed:");
        for (const file of context.stagedFiles) {
            lines.push(`#   ${file.status.padEnd(12)} ${file.path}`);
        }
        lines.push("#");
    }

    lines.push("# Lines starting with '#' will be ignored.");
    lines.push("# Save and close the file when done.");

    return lines.join("\n");
}

/**
 * Strips comment lines (starting with #) from the editor content.
 *
 * @param content - Raw content from the editor
 * @returns Content with comment lines removed
 */
function stripCommentLines(content: string): string {
    return content
        .split("\n")
        .filter((line) => !line.startsWith("#"))
        .join("\n")
        .trim();
}

/**
 * Builds a template with git-style comments for the breaking changes editor.
 *
 * Provides guidelines and examples for writing effective breaking change descriptions.
 * The "BREAKING CHANGE:" prefix is added automatically by buildCommitMessage(),
 * so the template instructs users to write only the description.
 *
 * @returns Template string with empty area for input and comment guidelines
 */
export function buildBreakingChangeTemplate(): string {
    const lines: string[] = [];

    lines.push("");
    lines.push("# Describe the breaking change above this line.");
    lines.push("# ─────────────────────────────────────────────────────────────");
    lines.push("#");
    lines.push("# Explain what changed and how users should update their code.");
    lines.push('# The "BREAKING CHANGE:" prefix will be added automatically.');
    lines.push("#");
    lines.push("# Examples:");
    lines.push("#   API endpoints now require authentication tokens in headers");
    lines.push("#   The `getUser()` function was renamed to `fetchUser()`");
    lines.push("#   Config file format changed from JSON to YAML");
    lines.push("#");
    lines.push("# Lines starting with '#' will be ignored.");
    lines.push("# Save and close the file when done. Leave empty to skip.");

    return lines.join("\n");
}

/**
 * Builds a template with git-style comments for the issue references editor.
 *
 * Provides keyword examples and formatting guidance for referencing issues.
 *
 * @returns Template string with empty area for input and comment guidelines
 */
export function buildIssueReferenceTemplate(): string {
    const lines: string[] = [];

    lines.push("");
    lines.push("# Reference related issues above this line.");
    lines.push("# ─────────────────────────────────────────────────────────────");
    lines.push("#");
    lines.push("# Keywords recognized by most issue trackers:");
    lines.push("#   Fixes #123        - Closes the issue when merged");
    lines.push("#   Closes #456       - Same as Fixes");
    lines.push("#   Resolves #789     - Same as Fixes");
    lines.push("#   Refs #101         - References without closing");
    lines.push("#   Related to #202   - Links as related");
    lines.push("#");
    lines.push("# Multiple references on one line:");
    lines.push("#   Fixes #123, Closes #456");
    lines.push("#");
    lines.push("# Lines starting with '#' will be ignored.");
    lines.push("# Save and close the file when done. Leave empty to skip.");

    return lines.join("\n");
}

/**
 * Opens the user's editor with .git/COMMIT_EDITMSG for any comment-template input.
 *
 * Writes the template to COMMIT_EDITMSG so editors apply git commit message
 * syntax highlighting (comment lines appear grey). After the editor closes,
 * reads the file back and strips comment lines.
 *
 * @param template - Template string with `#` comment lines for user guidance
 * @param editorCommand - Editor command from config (e.g., "code --wait", "vim")
 * @param gitDir - Path to the .git directory (from getGitDirectory())
 * @returns User content with comment lines stripped, or empty string
 *
 * @example
 * ```typescript
 * const description = editWithCommitEditMsg(
 *     buildBreakingChangeTemplate(),
 *     "code --wait",
 *     gitDir
 * );
 * ```
 */
export function editWithCommitEditMsg(
    template: string,
    editorCommand: string,
    gitDir: string
): string {
    const commitMsgPath = path.resolve(gitDir, "COMMIT_EDITMSG");

    writeFileSync(commitMsgPath, template, "utf8");

    const { bin, args } = parseEditorCommand(editorCommand);

    // On Windows, we need shell:true for .cmd files (e.g. VS Code's code.cmd)
    const isWindows = process.platform === "win32";
    const spawnOptions = {
        stdio: "inherit" as const,
        shell: isWindows,
    };

    // Use args array on all platforms to prevent shell injection.
    // With shell:true on Windows, spawnSync escapes each arg individually.
    const result = spawnSync(bin, [...args, commitMsgPath], spawnOptions);

    if (result.error) {
        throw new Error(`Failed to launch editor: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(
            `Editor ${bin} failed or was not found (exit code ${result.status})`
        );
    }

    const content = readFileSync(commitMsgPath, "utf8");
    return stripCommentLines(content);
}

/**
 * Opens the user's editor with .git/COMMIT_EDITMSG for writing commit body.
 *
 * Builds a context-aware template showing commit type, scope, subject, and
 * staged files, then delegates to editWithCommitEditMsg.
 *
 * @param context - Commit context for the template
 * @param editorCommand - Editor command from config (e.g., "code --wait")
 * @param gitDir - Path to the .git directory (from getGitDirectory())
 * @returns The text entered in the editor with comment lines stripped
 *
 * @example
 * ```typescript
 * const gitDir = await getGitDirectory();
 * const body = editWithGitCommitMessage(
 *     { type: "feat", scope: "auth", subject: "add login", stagedFiles },
 *     "code --wait",
 *     gitDir
 * );
 * ```
 */
export function editWithGitCommitMessage(
    context: CommitEditorContext,
    editorCommand: string,
    gitDir: string
): string {
    const template = buildCommitMessageTemplate(context);
    return editWithCommitEditMsg(template, editorCommand, gitDir);
}
