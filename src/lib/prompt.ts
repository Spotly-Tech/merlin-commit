import { confirm, editor, input, select } from "@inquirer/prompts";
import type { CommitAnswers } from "../types/index.js";
import { getMessages, loadConfig } from "../utils/config.js";
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
        })),
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
    // If user wants detailed body, open external editor to enter it
    if (wantsDetailedBody) {
        console.log(`\n${messages.tips.useEditor}`);
        answers.body = await editor({
            message: messages.prompts.body,
            waitForUserInput: false,
        });
    }

    // Prompt for optional breaking changes using external editor
    const hasBreakingChanges = await confirm({
        message: messages.prompts.breaking,
        default: false,
    });
    // If user indicates breaking changes, show tip and open editor to enter details
    if (hasBreakingChanges) {
        console.log(messages.tips.breakingChange);
        answers.breaking = await editor({
            message: messages.prompts.breaking,
            waitForUserInput: false,
            default: "BREAKING CHANGE: Describe what changed and why",
        });
    }

    // Prompt for optional issue references
    const hasIssues = await confirm({
        message: messages.prompts.issues,
        default: false,
    });
    // If user wants to reference issues, open editor to enter them
    if (hasIssues) {
        answers.issues = await editor({
            message: messages.prompts.issues + " (e.g., Fixes #123, Closes #456)",
            validate: (text: string) => text.length > 0 || messages.errors.required,
        });
    }

    return answers;
}
