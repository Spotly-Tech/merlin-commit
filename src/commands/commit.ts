import { confirm } from "@inquirer/prompts";
import ora from "ora";

import { getMessages, loadConfig } from "../lib/config-loader.js";
import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editWithCommitEditMsg,
    editWithGitCommitMessage,
} from "../lib/editor-wrapper.js";
import {
    addFiles,
    amendCommit,
    commit,
    getGitDirectory,
    getRepoRoot,
    getStagedFilesWithStatus,
    getStagingCandidates,
    hasStagedChanges,
    isGitRepo,
} from "../lib/git.js";
import { buildCommitMessage, formatPreview } from "../lib/message.js";
import { promptFileSelection, promptUser } from "../lib/prompt.js";
import { setupSigintHandler } from "../lib/sigint.js";
import { normalizeEmojiSpacing } from "../lib/terminal.js";
import type { CommitOptions } from "../types/index.js";
import { colors } from "../utils/constants.js";

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

        // Load config early - needed for autoAdd check inside staged-files block
        const config = loadConfig(repoRoot);

        // Check for staged changes, with optional interactive auto-add fallback
        spinner.start(messages.checking.staged);
        if (!(await hasStagedChanges())) {
            if (!config.autoAdd) {
                spinner.fail(colors.error(messages.errors.commit.noStaged));
                console.log(colors.warning(`\n${messages.tips.commit.gitAdd}`));
                process.exit(1);
            }

            spinner.start(messages.checking.unstaged);
            const candidates = await getStagingCandidates();

            if (candidates.length === 0) {
                spinner.fail(colors.error(messages.errors.commit.noStaged));
                console.log(colors.warning(`\n${messages.tips.commit.gitAdd}`));
                process.exit(1);
            }

            spinner.stop();
            const selectedFiles = await promptFileSelection(
                candidates,
                messages.prompts.selectFiles
            );

            if (selectedFiles.length === 0) {
                console.log(colors.warning(`\n${messages.warnings.cancel}`));
                process.exit(0);
            }

            spinner.start(messages.checking.autoAdd);
            await addFiles(selectedFiles);
            spinner.succeed();
        } else {
            spinner.succeed();
        }
        const gitDir = await getGitDirectory();

        // Prompt user for commit details with injected dependencies
        console.log();
        const userAnswers = await promptUser({
            config,
            messages,
            getStagedFiles: getStagedFilesWithStatus,
            editBody: (context) =>
                editWithGitCommitMessage(context, config.editor, gitDir),
            editBreaking: () =>
                editWithCommitEditMsg(
                    buildBreakingChangeTemplate(),
                    config.editor,
                    gitDir
                ),
            editIssues: () =>
                editWithCommitEditMsg(
                    buildIssueReferenceTemplate(),
                    config.editor,
                    gitDir
                ),
        });
        const message = buildCommitMessage(userAnswers);

        // Show commit preview
        console.log();
        console.log(colors.header(messages.commit.previewHeader));
        console.log(colors.muted("-".repeat(60)));
        console.log(formatPreview(message));
        console.log(colors.muted("-".repeat(60)));
        console.log(
            colors.muted(
                normalizeEmojiSpacing(
                    "(⚠️ and 🔗 indicators are visual only - not included in commit)"
                )
            )
        );
        console.log();

        // Dry run mode
        if (options.dryRun) {
            console.log(colors.info(`\n${messages.success.commit.dryRun}`));
            console.log(colors.muted(`${messages.commit.dryRunExit}\n`));
            process.exit(0);
        }

        // Show warning for --no-verify
        if (options.noVerify) {
            console.log(colors.warning(`${messages.warnings.commit.noVerify}\n`));
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
            spinner.succeed(colors.success(messages.success.commit.amended));
        } else {
            spinner.start(messages.checking.staged);
            gitOutput = await commit(message, options.noVerify);
            spinner.succeed(colors.success(messages.success.commit.created));
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

        spinner.fail(colors.error(messages.errors.commit.commitFailed));
        console.error(colors.error(`\n${(error as Error).message}\n`));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
