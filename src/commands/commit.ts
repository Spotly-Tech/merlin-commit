import { confirm } from "@inquirer/prompts";
import ora from "ora";

import { getMessages, loadConfig } from "../lib/config-loader.js";
import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editorWithCommentTemplate,
    editWithGitCommitMessage,
} from "../lib/editor-wrapper.js";
import {
    amendCommit,
    commit,
    getGitDirectory,
    getRepoRoot,
    getStagedFilesWithStatus,
    hasStagedChanges,
    isGitRepo,
} from "../lib/git.js";
import { buildCommitMessage, formatPreview } from "../lib/message.js";
import { promptUser } from "../lib/prompt.js";
import { setupSigintHandler } from "../lib/sigint.js";
import { colors } from "../utils/constants.js";

type CommitOptions = {
    dryRun?: boolean;
    amend?: boolean;
    noVerify?: boolean;
};

export async function commitCommand(options: CommitOptions): Promise<void> {
    const repoRoot = await getRepoRoot();
    const messages = getMessages(repoRoot);
    const spinner = ora();
    const removeSigintHandler = setupSigintHandler(messages, () => spinner.stop());

    try {
        // Show intro message
        console.log(colors.header(`\n${messages.commit.intro}`));

        // Check if inside a git repository
        spinner.start(messages.checking.repo);
        if (!(await isGitRepo())) {
            spinner.fail(colors.error(messages.errors.notRepo));
            process.exit(1);
        }
        spinner.succeed();

        // Check for staged changes
        spinner.start(messages.checking.staged);
        if (!(await hasStagedChanges())) {
            spinner.fail(colors.error(messages.errors.noStaged));
            console.log(colors.warning(`\n${messages.tips.gitAdd}`));
            process.exit(1);
        }
        spinner.succeed();

        // Load config and resolve git directory for editor integration
        const config = loadConfig(repoRoot);
        const gitDir = await getGitDirectory();

        // Prompt user for commit details with injected dependencies
        const userAnswers = await promptUser({
            config,
            messages,
            getStagedFiles: getStagedFilesWithStatus,
            editBody: (context) =>
                editWithGitCommitMessage(context, config.editor, gitDir),
            editBreaking: () =>
                editorWithCommentTemplate(buildBreakingChangeTemplate(), config.editor),
            editIssues: () =>
                editorWithCommentTemplate(buildIssueReferenceTemplate(), config.editor),
        });
        const message = buildCommitMessage(userAnswers);

        // Show commit preview
        console.log();
        console.log(colors.header("📝 Commit Preview:"));
        console.log(colors.muted("-".repeat(60)));
        console.log(formatPreview(message));
        console.log(colors.muted("-".repeat(60)));
        console.log();

        // Dry run mode
        if (options.dryRun) {
            console.log(colors.info(`\n${messages.success.dryRun}`));
            console.log(colors.muted(`${messages.commit.exit}\n`));
            process.exit(0);
        }

        // Show warning for --no-verify
        if (options.noVerify) {
            console.log(colors.warning(`⚠️  ${messages.warnings.noVerify}\n`));
        }

        // Confirm commit
        const confirmed = await confirm({
            message: messages.prompts.confirm,
            default: true,
        });
        if (!confirmed) {
            console.log(colors.warning(`\n${messages.warnings.cancel}`));
            console.log(colors.muted(`${messages.commit.exit}\n`));
            process.exit(0);
        }

        // Create or amend commit
        // Spinner runs during commit since git output is now captured
        let gitOutput: string;
        if (options.amend) {
            spinner.start(messages.checking.unstaged);
            gitOutput = await amendCommit(message, options.noVerify);
            spinner.succeed(colors.success(messages.success.amend));
        } else {
            spinner.start(messages.checking.staged);
            gitOutput = await commit(message, options.noVerify);
            spinner.succeed(colors.success(messages.success.commit));
        }
        console.log(colors.muted(gitOutput));
        console.log(colors.muted(`\n${messages.commit.exit}\n`));
    } catch (error) {
        // Handle ExitPromptError (thrown by Inquirer on Ctrl+C)
        if ((error as Error).name === "ExitPromptError") {
            spinner.stop();
            console.log(colors.warning(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }

        spinner.fail(colors.error(messages.errors.commitFailed));
        console.error(colors.error(`\n${(error as Error).message}\n`));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
