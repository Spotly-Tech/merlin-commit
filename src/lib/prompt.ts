import { confirm, input, select } from "@inquirer/prompts";

import type { CommitAnswers, MerlinConfig, WizardMessages } from "../types/index.js";
import {
    EMOJI_COLUMN_WIDTH,
    VALUE_COLUMN_WIDTH,
    VARIATION_SELECTOR,
} from "../utils/constants.js";
import type { CommitEditorContext } from "./editor-wrapper.js";
import type { StagedFile } from "./git.js";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "./transformers.js";

/**
 * Dependencies injected by the command layer, avoiding direct lib-to-lib imports.
 */
export type PromptDependencies = {
    config: Required<MerlinConfig>;
    messages: WizardMessages;
    getStagedFiles: () => Promise<StagedFile[]>;
    editBody: (context: CommitEditorContext) => string;
    editBreaking: () => Promise<string>;
    editIssues: () => Promise<string>;
};

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
            const emojiPadding = " ".repeat(
                hasVariationSelector ? EMOJI_COLUMN_WIDTH - 1 : EMOJI_COLUMN_WIDTH - 2
            );
            const label = isWizardTheme
                ? `${type.value}:${valuePadding}${type.emoji}${emojiPadding}${type.name}`
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
    // Validate scope does not exceed max length
    answers.scope = await input({
        message: messages.prompts.scope,
        transformer: createOptionalCharacterCounterTransformer(config.maxScopeLength),
        validate: (value: string) =>
            value.length <= config.maxScopeLength ||
            `${messages.errors.tooLong} (max ${config.maxScopeLength} characters)`,
    });

    // Prompt for commit subject
    // Validate subject is not empty and does not exceed max length
    // Transformer provides real-time character counter feedback
    answers.subject = await input({
        message: messages.prompts.subject,
        transformer: createCharacterCounterTransformer(config.maxSubjectLength),
        validate: (value: string) => {
            if (!value) {
                return messages.errors.required;
            }
            if (value.length > config.maxSubjectLength) {
                return `${messages.errors.tooLong} (max ${config.maxSubjectLength} characters)`;
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
        const stagedFiles = await getStagedFiles();
        answers.body = editBody({
            type: answers.type,
            scope: answers.scope,
            subject: answers.subject,
            stagedFiles,
        });
    }

    // Prompt for optional breaking changes using external editor
    const hasBreakingChanges = await confirm({
        message: messages.prompts.breaking,
        default: false,
    });
    // If user indicates breaking changes, open editor with comment template
    if (hasBreakingChanges) {
        const breakingDescription = await editBreaking();
        // Strip "BREAKING CHANGE:" prefix if user typed it (prevents duplication
        // since buildCommitMessage() adds the prefix automatically)
        const cleanDescription = breakingDescription.replace(/^BREAKING CHANGE:\s*/i, "");
        if (cleanDescription) {
            answers.breaking = cleanDescription;
        }
    }

    // Prompt for optional issue references
    const hasIssues = await confirm({
        message: messages.prompts.issues,
        default: false,
    });
    // If user wants to reference issues, open editor with comment template
    if (hasIssues) {
        const issueReferences = await editIssues();
        if (issueReferences) {
            answers.issues = issueReferences;
        }
    }

    return answers;
}
