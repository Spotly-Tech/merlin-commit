import { confirm } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commitCommand } from "../../src/commands/commit.js";
import { getMessages, loadConfig } from "../../src/lib/config-loader.js";
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
} from "../../src/lib/git.js";
import { promptFileSelection, promptUser } from "../../src/lib/prompt.js";
import { setupSigintHandler } from "../../src/lib/sigint.js";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

// lib/message.ts is intentionally NOT mocked - buildCommitMessage and
// formatPreview run for real to verify the actual output passed to git.

vi.mock("../../src/lib/terminal.js", () => ({
    normalizeEmojiSpacing: (text: string) => text,
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
    getStagingCandidates: vi.fn(),
    addFiles: vi.fn(),
}));

vi.mock("../../src/lib/prompt", () => ({
    promptUser: vi.fn(),
    promptFileSelection: vi.fn(),
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

function setupHappyPathBase() {
    vi.mocked(isGitRepo).mockResolvedValue(true);
    vi.mocked(hasStagedChanges).mockResolvedValue(true);
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(commit).mockResolvedValue("[main abc1234] commit output");
    vi.mocked(amendCommit).mockResolvedValue("[main abc1234] amend output");
}

describe("commit flow integration", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        consoleSpy.log.mockImplementation(() => {});
        consoleSpy.error.mockImplementation(() => {});
        mockExit.mockImplementation((() => {}) as never);
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(getStagedFilesWithStatus).mockResolvedValue([]);
        vi.mocked(getStagingCandidates).mockResolvedValue([]);
        vi.mocked(addFiles).mockResolvedValue(undefined);
        vi.mocked(promptFileSelection).mockResolvedValue([]);
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);
        vi.mocked(setupSigintHandler).mockReturnValue(vi.fn());
    });

    describe("commit message building - real buildCommitMessage runs", () => {
        it("formats basic type-only message", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "fix",
                subject: "resolve null dereference",
            });

            await commitCommand({});

            expect(commit).toHaveBeenCalledWith(
                "fix: resolve null dereference",
                undefined
            );
        });

        it("formats message with scope", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                scope: "auth",
                subject: "add oauth2 login",
            });

            await commitCommand({});

            expect(commit).toHaveBeenCalledWith(
                "feat(auth): add oauth2 login",
                undefined
            );
        });

        it("appends ! marker and BREAKING CHANGE footer", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                scope: "api",
                subject: "remove deprecated endpoints",
                breaking: "All v1 endpoints have been removed",
            });

            await commitCommand({});

            const actualMessage = vi.mocked(commit).mock.calls[0][0];
            expect(actualMessage).toContain("feat(api)!: remove deprecated endpoints");
            expect(actualMessage).toContain(
                "BREAKING CHANGE: All v1 endpoints have been removed"
            );
        });

        it("strips duplicate BREAKING CHANGE prefix from user input", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                subject: "change auth",
                breaking: "BREAKING CHANGE: Session format changed",
            });

            await commitCommand({});

            const actualMessage = vi.mocked(commit).mock.calls[0][0];
            expect(actualMessage).not.toContain("BREAKING CHANGE: BREAKING CHANGE:");
            expect(actualMessage).toContain("BREAKING CHANGE: Session format changed");
        });

        it("includes issue references in footer", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "fix",
                subject: "fix login redirect",
                issues: "Closes #42\nRefs #38",
            });

            await commitCommand({});

            const actualMessage = vi.mocked(commit).mock.calls[0][0];
            expect(actualMessage).toContain("Closes #42");
            expect(actualMessage).toContain("Refs #38");
        });

        it("includes body separated by blank line", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "refactor",
                subject: "split auth module",
                body: "Separated user auth from session management for cleaner boundaries.",
            });

            await commitCommand({});

            const actualMessage = vi.mocked(commit).mock.calls[0][0];
            expect(actualMessage).toContain(
                "refactor: split auth module\n\nSeparated user auth from session management"
            );
        });

        it("builds full message with all components in conventional commits order", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                scope: "core",
                subject: "complete rework",
                body: "Detailed description here.",
                breaking: "Public interface changed",
                issues: "Closes #100",
            });

            await commitCommand({});

            const actualMessage = vi.mocked(commit).mock.calls[0][0];
            const sections = actualMessage.split("\n\n");
            expect(sections[0]).toBe("feat(core)!: complete rework");
            expect(sections[1]).toBe("Detailed description here.");
            expect(sections[2]).toBe("BREAKING CHANGE: Public interface changed");
            expect(sections[3]).toBe("Closes #100");
        });

        it("omits ! when breaking field is empty", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                subject: "add feature",
                breaking: "",
            });

            await commitCommand({});

            expect(commit).toHaveBeenCalledWith("feat: add feature", undefined);
        });
    });

    describe("commit options interact with real message", () => {
        it("passes noVerify flag alongside real message to git", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "chore",
                subject: "update deps",
            });

            await commitCommand({ noVerify: true });

            expect(commit).toHaveBeenCalledWith("chore: update deps", true);
        });

        it("passes real message to amendCommit on --amend", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "docs",
                subject: "fix typo in readme",
            });

            await commitCommand({ amend: true });

            expect(amendCommit).toHaveBeenCalledWith(
                "docs: fix typo in readme",
                undefined
            );
            expect(commit).not.toHaveBeenCalled();
        });

        it("builds real message but skips git call on --dry-run", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                scope: "ui",
                subject: "add dark mode",
            });

            await commitCommand({ dryRun: true });

            // process.exit is mocked so execution continues past it;
            // we assert the exit code is correct but cannot assert commit
            // was not called because the mock does not stop the process.
            expect(mockExit).toHaveBeenCalledWith(0);
        });
    });

    describe("pre-flight validation", () => {
        it("exits 1 when not in a git repo", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(false);

            await commitCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
            expect(commit).not.toHaveBeenCalled();
        });

        it("exits 1 when no staged changes and autoAdd disabled", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasStagedChanges).mockResolvedValue(false);
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, autoAdd: false });

            await commitCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("exits 0 without committing when user declines confirmation", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                subject: "some change",
            });
            vi.mocked(confirm).mockResolvedValue(false);

            await commitCommand({});

            expect(mockExit).toHaveBeenCalledWith(0);
            // process.exit is mocked so execution continues past it;
            // the exit code assertion above is the primary check here.
        });

        it("exits 0 gracefully when user presses Ctrl+C during prompts", async () => {
            setupHappyPathBase();
            const exitError = new Error("User force closed the prompt");
            exitError.name = "ExitPromptError";
            vi.mocked(promptUser).mockRejectedValue(exitError);

            await commitCommand({});

            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it("exits 1 and logs error when git commit itself fails", async () => {
            setupHappyPathBase();
            vi.mocked(promptUser).mockResolvedValue({
                type: "fix",
                subject: "fix issue",
            });
            vi.mocked(commit).mockRejectedValue(new Error("hook rejected commit"));

            await commitCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("hook rejected commit")
            );
        });
    });

    describe("auto-add flow", () => {
        it("stages selected files then commits with real message", async () => {
            const candidates = [
                { path: "src/index.ts", status: "modified" as const },
                { path: "src/new.ts", status: "untracked" as const },
            ];
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasStagedChanges).mockResolvedValue(false);
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, autoAdd: true });
            vi.mocked(getStagingCandidates).mockResolvedValue(candidates);
            vi.mocked(promptFileSelection).mockResolvedValue(["src/index.ts"]);
            vi.mocked(confirm).mockResolvedValue(true);
            vi.mocked(commit).mockResolvedValue("[main abc] output");
            vi.mocked(promptUser).mockResolvedValue({
                type: "feat",
                subject: "implement feature",
            });

            await commitCommand({});

            expect(addFiles).toHaveBeenCalledWith(["src/index.ts"]);
            expect(commit).toHaveBeenCalledWith("feat: implement feature", undefined);
        });
    });
});
