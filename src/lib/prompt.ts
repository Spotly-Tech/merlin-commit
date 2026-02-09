import { confirm, input, select } from "@inquirer/prompts";
import type { CommitAnswers } from "../types/index.js";
import { getMessages, loadConfig } from "../utils/config.js";
import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editorWithCommentTemplate,
    editWithGitCommitMessage,
} from "./editor-wrapper.js";
import { getStagedFilesWithStatus } from "./git.js";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "./transformers.js";

export async function promptUser(): Promise<CommitAnswers> {
    const config = loadConfig();
    const messages = getMessages();
    const answers: CommitAnswers = {
        type: "",
        subject: "",
    };

    // Prompt for commit type
    answers.type = await select({
        message: messages.prompts.type,
        choices: config.types.map((type) => ({
            value: type.value,
            name: type.name,
            short: type.value,
        })),
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
        const stagedFiles = await getStagedFilesWithStatus();
        answers.body = await editWithGitCommitMessage(
            {
                type: answers.type,
                scope: answers.scope,
                subject: answers.subject,
                stagedFiles,
            },
            config.editor
        );
    }

    // Prompt for optional breaking changes using external editor
    const hasBreakingChanges = await confirm({
        message: messages.prompts.breaking,
        default: false,
    });
    // If user indicates breaking changes, open editor with comment template
    if (hasBreakingChanges) {
        const breakingDescription = await editorWithCommentTemplate(
            buildBreakingChangeTemplate(),
            config.editor
        );
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
        const issueReferences = await editorWithCommentTemplate(
            buildIssueReferenceTemplate(),
            config.editor
        );
        if (issueReferences) {
            answers.issues = issueReferences;
        }
    }

    return answers;
}
