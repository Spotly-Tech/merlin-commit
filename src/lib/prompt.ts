import { checkbox, confirm, input, select } from "@inquirer/prompts";

import type { CommitAnswers, MerlinConfig, ThemeMessages } from "../types/index.js";
import {
    BREAKING_CHANGE_PREFIX_REGEX,
    colors,
    EMOJI_COLUMN_WIDTH,
    VALUE_COLUMN_WIDTH,
    VARIATION_SELECTOR,
} from "../utils/constants.js";
import type { CommitEditorContext } from "./editor-wrapper.js";
import type { StagedFile, StagingCandidate } from "./git.js";
import { isWideEmojiTerminal } from "./terminal.js";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "./transformers.js";

/**
 * Regex for valid scope format: starts with a letter, followed by letters, digits, or hyphens.
 * Permissive pattern to avoid breaking existing users.
 */
const SCOPE_FORMAT_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Dependencies injected by the command layer, avoiding direct lib-to-lib imports.
 */
export type PromptDependencies = {
    /** Resolved user config with all defaults applied. */
    config: Required<MerlinConfig>;
    /** Theme-specific prompt messages and labels. */
    messages: ThemeMessages;
    /** Returns the list of currently staged files for the editor context. */
    getStagedFiles: () => Promise<StagedFile[]>;
    /** Opens the commit body editor synchronously and returns the entered text. */
    editBody: (context: CommitEditorContext) => string;
    /** Opens the breaking changes editor and returns the entered text. */
    editBreaking: () => string;
    /** Opens the issue references editor and returns the entered text. */
    editIssues: () => string;
};

/**
 * Runs the interactive commit prompt sequence, collecting all commit fields.
 *
 * Prompts for type, scope, subject, optional body (via editor), optional breaking
 * changes (via editor), and optional issue references (via editor). Editor failures
 * are caught and warned about without aborting the flow.
 *
 * @param dependencies - Injected dependencies (config, messages, editor launchers)
 * @returns Populated CommitAnswers with all user-provided values
 */
export async function promptUser(
    dependencies: PromptDependencies
): Promise<CommitAnswers> {
    const { config, messages, getStagedFiles, editBody, editBreaking, editIssues } =
        dependencies;
    const answers: CommitAnswers = {
        type: "",
        subject: "",
    };

    // Prompt for commit type
    const isWizardTheme = config.theme === "wizard";
    answers.type = await select({
        message: messages.prompts.type,
        choices: config.types.map((type) => {
            const valuePadding = " ".repeat(
                Math.max(1, VALUE_COLUMN_WIDTH - type.value.length)
            );
            const hasVariationSelector = type.emoji.includes(VARIATION_SELECTOR);
            const isWideTerminal = isWideEmojiTerminal();
            const emojiPadding = " ".repeat(
                hasVariationSelector && !isWideTerminal
                    ? EMOJI_COLUMN_WIDTH - 1
                    : EMOJI_COLUMN_WIDTH - 2
            );
            const label = isWizardTheme
                ? `${type.emoji}${emojiPadding}${type.value}${valuePadding}${type.name}`
                : `${type.value}:${valuePadding}${type.name}`;
            return {
                value: type.value,
                name: label,
                description: type.description,
                short: type.value,
            };
        }),
        pageSize: config.types.length,
        loop: true,
    });

    // Prompt for optional scope
    // Validate scope format and length
    answers.scope = await input({
        message: messages.prompts.scope,
        transformer: config.showCharacterCounter
            ? createOptionalCharacterCounterTransformer(config.maxScopeLength)
            : undefined,
        validate: (value: string) => {
            if (!value) {
                return true;
            }
            if (value.length > config.maxScopeLength) {
                return messages.errors.commit.tooLong(config.maxScopeLength);
            }
            if (!SCOPE_FORMAT_PATTERN.test(value)) {
                return messages.errors.commit.malformed;
            }
            return true;
        },
    });

    // Prompt for commit subject
    // Validate subject is not empty and does not exceed max length
    // Transformer provides real-time character counter feedback
    answers.subject = await input({
        message: messages.prompts.subject,
        transformer: config.showCharacterCounter
            ? createCharacterCounterTransformer(config.maxSubjectLength)
            : undefined,
        validate: (value: string) => {
            if (!value) {
                return messages.errors.commit.required;
            }
            if (value.length > config.maxSubjectLength) {
                return messages.errors.commit.tooLong(config.maxSubjectLength);
            }
            return true;
        },
    });

    // Prompt for optional detailed body
    const wantsDetailedBody = await confirm({
        message: messages.prompts.body,
        default: false,
    });
    // If user wants detailed body, open editor with git commit context
    if (wantsDetailedBody) {
        try {
            const stagedFiles = await getStagedFiles();
            answers.body = editBody({
                type: answers.type,
                scope: answers.scope,
                subject: answers.subject,
                stagedFiles,
            });
        } catch {
            console.warn(colors.warning(`\n${messages.errors.commit.editorFailed}\n`));
        }
    }

    // Prompt for optional breaking changes using external editor
    const hasBreakingChanges = await confirm({
        message: messages.prompts.breaking,
        default: false,
    });
    // If user indicates breaking changes, open editor with comment template
    if (hasBreakingChanges) {
        try {
            const breakingDescription = editBreaking();
            // Strip "BREAKING CHANGE:" prefix if user typed it (prevents duplication
            // since buildCommitMessage() adds the prefix automatically)
            const cleanDescription = breakingDescription.replace(
                BREAKING_CHANGE_PREFIX_REGEX,
                ""
            );
            if (cleanDescription) {
                answers.breaking = cleanDescription;
            }
        } catch {
            console.warn(colors.warning(`\n${messages.errors.commit.editorFailed}\n`));
        }
    }

    // Prompt for optional issue references
    const hasIssues = await confirm({
        message: messages.prompts.issues,
        default: false,
    });
    // If user wants to reference issues, open editor with comment template
    if (hasIssues) {
        try {
            const issueReferences = editIssues();
            if (issueReferences) {
                answers.issues = issueReferences;
            }
        } catch {
            console.warn(colors.warning(`\n${messages.errors.commit.editorFailed}\n`));
        }
    }

    return answers;
}

/**
 * Presents a checkbox prompt listing all stageable files.
 *
 * All candidates are pre-checked so the user deselects rather than selects -
 * the common case is staging everything. Returns the paths of checked files,
 * which may be an empty array if the user deselects all items.
 *
 * @param candidates - Files available for staging with their status labels
 * @param promptMessage - Checkbox prompt label (from theme messages)
 * @returns Array of selected file paths
 * @example
 * ```typescript
 * const paths = await promptFileSelection(candidates, messages.prompts.selectFiles);
 * // => ["src/index.ts", "src/new-file.ts"]
 * ```
 */
export async function promptFileSelection(
    candidates: StagingCandidate[],
    promptMessage: string
): Promise<string[]> {
    return checkbox({
        message: promptMessage,
        choices: candidates.map((candidate) => ({
            value: candidate.path,
            name: `${candidate.path}  (${candidate.status})`,
            checked: true,
        })),
    });
}
