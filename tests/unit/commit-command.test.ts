import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commitCommand } from "../../src/commands/commit.js";
import { getMessages, loadConfig } from "../../src/lib/config-loader";
import {
    amendCommit,
    commit,
    getGitDirectory,
    getRepoRoot,
    getStagedFilesWithStatus,
    hasStagedChanges,
    isGitRepo,
} from "../../src/lib/git";
import { buildCommitMessage, formatPreview } from "../../src/lib/message";
import { promptUser } from "../../src/lib/prompt";
import { setupSigintHandler } from "../../src/lib/sigint";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

vi.mock("../../src/lib/terminal.js", () => ({
    normalizeVS16Spacing: (text: string) => text,
    isWideEmojiTerminal: () => false,
}));

vi.mock("@inquirer/prompts", () => ({
    confirm: vi.fn(),
}));

vi.mock("../../src/lib/git", () => ({
    isGitRepo: vi.fn(),
    hasStagedChanges: vi.fn(),
    commit: vi.fn(),
    amendCommit: vi.fn(),
    getRepoRoot: vi.fn(),
    getGitDirectory: vi.fn(),
    getStagedFilesWithStatus: vi.fn(),
}));

vi.mock("../../src/lib/message", () => ({
    buildCommitMessage: vi.fn(),
    formatPreview: vi.fn(),
}));

vi.mock("../../src/lib/prompt", () => ({
    promptUser: vi.fn(),
}));

vi.mock("../../src/lib/config-loader", () => ({
    getMessages: vi.fn(),
    loadConfig: vi.fn(),
}));

vi.mock("../../src/lib/editor-wrapper", () => ({
    editWithGitCommitMessage: vi.fn(),
    editWithCommitEditMsg: vi.fn(),
    buildBreakingChangeTemplate: vi.fn(),
    buildIssueReferenceTemplate: vi.fn(),
}));

vi.mock("../../src/lib/sigint", () => ({
    setupSigintHandler: vi.fn(),
}));

vi.mock("ora", () => {
    const spinnerInstance = {
        start: vi.fn().mockReturnThis(),
        stop: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
    };
    return { default: vi.fn(() => spinnerInstance) };
});

const consoleSpy = {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

/**
 * Sets up the "happy path" mocks so the full commit workflow completes.
 * Individual tests can override specific mocks after calling this.
 */
function setupHappyPath() {
    vi.mocked(isGitRepo).mockResolvedValue(true);
    vi.mocked(hasStagedChanges).mockResolvedValue(true);
    vi.mocked(promptUser).mockResolvedValue({
        type: "feat",
        subject: "add new feature",
        scope: "core",
    });
    vi.mocked(buildCommitMessage).mockReturnValue("feat(core): add new feature");
    vi.mocked(formatPreview).mockReturnValue("feat(core): add new feature");
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(commit).mockResolvedValue("[main abc1234] feat(core): add new feature");
    vi.mocked(amendCommit).mockResolvedValue(
        "[main abc1234] feat(core): add new feature"
    );
}

describe("commitCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(getStagedFilesWithStatus).mockResolvedValue([]);
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);
        vi.mocked(setupSigintHandler).mockReturnValue(vi.fn());
    });

    describe("pre-flight validation", () => {
        it("exits with error when not a git repo", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(false);

            await commitCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.start).toHaveBeenCalledWith(WIZARD_MESSAGES.checking.repo);
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.notRepo)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("exits with error when no staged changes", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasStagedChanges).mockResolvedValue(false);

            await commitCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.commit.noStaged)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.tips.commit.gitAdd)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("calls process.exit(1) when not a git repo", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(false);

            await commitCommand({});

            // Verify exit is called with error code
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("sets up and cleans up SIGINT handler", async () => {
            setupHappyPath();
            const removeFn = vi.fn();
            vi.mocked(setupSigintHandler).mockReturnValue(removeFn);

            await commitCommand({});

            expect(setupSigintHandler).toHaveBeenCalledWith(
                WIZARD_MESSAGES,
                expect.any(Function)
            );
            expect(removeFn).toHaveBeenCalled();
        });
    });

    describe("happy path", () => {
        it("completes full commit workflow", async () => {
            setupHappyPath();

            await commitCommand({});

            expect(isGitRepo).toHaveBeenCalled();
            expect(hasStagedChanges).toHaveBeenCalled();
            expect(promptUser).toHaveBeenCalled();
            expect(buildCommitMessage).toHaveBeenCalledWith({
                type: "feat",
                subject: "add new feature",
                scope: "core",
            });
            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: WIZARD_MESSAGES.prompts.confirm,
                })
            );
            expect(commit).toHaveBeenCalledWith("feat(core): add new feature", undefined);
        });

        it("displays commit preview before confirmation", async () => {
            setupHappyPath();
            vi.mocked(formatPreview).mockReturnValue("formatted preview output");

            await commitCommand({});

            expect(formatPreview).toHaveBeenCalledWith("feat(core): add new feature");
            expect(consoleSpy.log).toHaveBeenCalledWith("formatted preview output");
        });

        it("shows success message after commit", async () => {
            setupHappyPath();

            await commitCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.succeed).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.commit.created)
            );
        });

        it("displays intro message on start", async () => {
            setupHappyPath();

            await commitCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.commit.intro)
            );
        });
    });

    describe("--dry-run flag", () => {
        it("shows dry-run message and exits with code 0", async () => {
            setupHappyPath();

            await commitCommand({ dryRun: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.commit.dryRun)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.commit.dryRunExit)
            );
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it("still prompts user and builds message in dry-run", async () => {
            setupHappyPath();

            await commitCommand({ dryRun: true });

            expect(promptUser).toHaveBeenCalled();
            expect(buildCommitMessage).toHaveBeenCalled();
            expect(formatPreview).toHaveBeenCalled();
        });
    });

    describe("--amend flag", () => {
        it("calls amendCommit instead of commit", async () => {
            setupHappyPath();

            await commitCommand({ amend: true });

            expect(amendCommit).toHaveBeenCalledWith(
                "feat(core): add new feature",
                undefined
            );
            expect(commit).not.toHaveBeenCalled();
        });

        it("shows amend success message", async () => {
            setupHappyPath();

            await commitCommand({ amend: true });

            const spinner = vi.mocked(ora)();
            expect(spinner.succeed).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.commit.amended)
            );
        });
    });

    describe("--no-verify flag", () => {
        it("displays warning message when noVerify is true", async () => {
            setupHappyPath();

            await commitCommand({ noVerify: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.commit.noVerify)
            );
        });

        it("passes noVerify option through to commit", async () => {
            setupHappyPath();

            await commitCommand({ noVerify: true });

            expect(commit).toHaveBeenCalledWith("feat(core): add new feature", true);
        });

        it("passes noVerify option through to amendCommit", async () => {
            setupHappyPath();

            await commitCommand({ noVerify: true, amend: true });

            expect(amendCommit).toHaveBeenCalledWith("feat(core): add new feature", true);
        });
    });

    describe("user cancels confirmation", () => {
        it("exits gracefully when user declines commit", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockResolvedValue(false);

            await commitCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.cancel)
            );
            expect(mockExit).toHaveBeenCalledWith(0);
        });
    });

    describe("error handling", () => {
        it("handles Ctrl+C (ExitPromptError) gracefully", async () => {
            setupHappyPath();
            const exitError = new Error("User force closed the prompt");
            exitError.name = "ExitPromptError";
            vi.mocked(promptUser).mockRejectedValue(exitError);

            await commitCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.stop).toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.cancel)
            );
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it("handles commit failure with error message", async () => {
            setupHappyPath();
            vi.mocked(commit).mockRejectedValue(
                new Error("git commit failed: hook rejected")
            );

            await commitCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.commit.commitFailed)
            );
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("git commit failed: hook rejected")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("cleans up SIGINT handler even when error occurs", async () => {
            const removeFn = vi.fn();
            vi.mocked(setupSigintHandler).mockReturnValue(removeFn);
            setupHappyPath();
            vi.mocked(commit).mockRejectedValue(new Error("fail"));

            await commitCommand({});

            expect(removeFn).toHaveBeenCalled();
        });
    });
});
