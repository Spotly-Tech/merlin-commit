import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { amendCommit, commit, hasStagedChanges, isGitRepo } from "../lib/git.js";
import { buildCommitMessage, formatPreview } from "../lib/message.js";
import { promptUser } from "../lib/prompt.js";
import { setupSigintHandler } from "../lib/sigint.js";
import { getMessages } from "../utils/config.js";

type CommitOptions = {
    dryRun?: boolean;
    amend?: boolean;
    noVerify?: boolean;
};

export async function commitCommand(options: CommitOptions): Promise<void> {
    const messages = getMessages();
    const spinner = ora();
    const removeSigintHandler = setupSigintHandler(messages, () => spinner.stop());

    try {
        // Show intro message
        console.log(chalk.bold.cyan(`\n${messages.commit.intro}`));

        // Check if inside a git repository
        spinner.start(messages.checking.repo);
        if (!(await isGitRepo())) {
            spinner.fail(chalk.red(messages.errors.notRepo));
            process.exit(1);
        }
        spinner.succeed();

        // Check for staged changes
        spinner.start(messages.checking.staged);
        if (!(await hasStagedChanges())) {
            spinner.fail(chalk.red(messages.errors.noStaged));
            console.log(chalk.yellow(`\n${messages.tips.gitAdd}`));
            process.exit(1);
        }
        spinner.succeed();

        // Prompt user for commit details
        const userAnswers = await promptUser();
        const message = buildCommitMessage(userAnswers);

        // Show commit preview
        console.log();
        console.log(chalk.bold("📝 Commit Preview:"));
        console.log(chalk.gray("-".repeat(60)));
        console.log(formatPreview(message));
        console.log(chalk.gray("-".repeat(60)));
        console.log();

        // Dry run mode
        if (options.dryRun) {
            console.log(chalk.blue(`\n${messages.success.dryRun}`));
            console.log(chalk.gray(messages.commit.exit + "\n"));
            process.exit(0);
        }

        // Show warning for --no-verify
        if (options.noVerify) {
            console.log(chalk.yellow(`⚠️  ${messages.warnings.noVerify}\n`));
        }

        // Confirm commit
        const confirmed = await confirm({
            message: messages.prompts.confirm,
            default: true,
        });
        if (!confirmed) {
            console.log(chalk.yellow(`\n${messages.warnings.cancel}`));
            console.log(chalk.gray(messages.commit.exit + "\n"));
            process.exit(0);
        }

        // Create or amend commit
        // Spinner runs during commit since git output is now captured
        let gitOutput: string;
        if (options.amend) {
            spinner.start(messages.checking.unstaged);
            gitOutput = await amendCommit(message, options.noVerify);
            spinner.succeed(chalk.green(messages.success.amend));
        } else {
            spinner.start(messages.checking.staged);
            gitOutput = await commit(message, options.noVerify);
            spinner.succeed(chalk.green(messages.success.commit));
        }
        console.log(chalk.gray(gitOutput));
        console.log(chalk.gray(`\n${messages.commit.exit}\n`));
    } catch (error) {
        // Handle ExitPromptError (thrown by Inquirer on Ctrl+C)
        if ((error as Error).name === "ExitPromptError") {
            spinner.stop();
            console.log(chalk.yellow(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }

        spinner.fail(chalk.red(messages.errors.commitFailed));
        console.error(chalk.red("\n" + (error as Error).message + "\n"));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
