import { confirm, select } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initCommand } from "../../src/commands/init.js";
import { getMessages } from "../../src/lib/config-loader.js";
import { getRepoRoot, isGitRepo } from "../../src/lib/git.js";
import {
    checkGitAlias,
    createCommitlintConfig,
    createCommitMsgHook,
    createProjectConfig,
    detectExistingSetup,
    hasPackageJson,
    initializeHusky,
    installDependencies,
    isPackageInstalled,
    setupGitAlias,
} from "../../src/lib/setup.js";
import { setupSigintHandler } from "../../src/lib/sigint.js";
import { WIZARD_MESSAGES } from "../../src/utils/constants.js";

// utils/constants.ts (WIZARD_MESSAGES) runs for real - tests verify the init
// command uses the correct message keys without mocking them away.

vi.mock("@inquirer/prompts", () => ({
    confirm: vi.fn(),
    select: vi.fn(),
}));

vi.mock("../../src/lib/git", () => ({
    isGitRepo: vi.fn(),
    getRepoRoot: vi.fn(),
}));

vi.mock("../../src/lib/setup", () => ({
    hasPackageJson: vi.fn(),
    detectExistingSetup: vi.fn(),
    installDependencies: vi.fn(),
    initializeHusky: vi.fn(),
    createCommitlintConfig: vi.fn(),
    createCommitMsgHook: vi.fn(),
    checkGitAlias: vi.fn(),
    setupGitAlias: vi.fn(),
    createProjectConfig: vi.fn(),
    isPackageInstalled: vi.fn(),
    INIT_DEPENDENCIES: ["husky", "@commitlint/cli", "@commitlint/config-conventional"],
}));

vi.mock("../../src/lib/config-loader", () => ({
    getMessages: vi.fn(),
}));

vi.mock("../../src/lib/sigint", () => ({
    setupSigintHandler: vi.fn(),
}));

vi.mock("../../src/lib/terminal.js", () => ({
    normalizeEmojiSpacing: (text: string) => text,
    isWideEmojiTerminal: () => false,
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
};

const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

const NO_EXISTING_SETUP = {
    husky: false,
    commitMsgHook: false,
    commitlintConfig: false,
    merlinConfig: false,
};

function setupHappyPath() {
    vi.mocked(isGitRepo).mockResolvedValue(true);
    vi.mocked(hasPackageJson).mockResolvedValue(true);
    vi.mocked(detectExistingSetup).mockResolvedValue(NO_EXISTING_SETUP);
    // Packages are installed so runHuskySetup and runCommitlintSetup proceed
    vi.mocked(isPackageInstalled).mockResolvedValue(true);
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(select).mockResolvedValue("local");
    vi.mocked(installDependencies).mockResolvedValue(undefined);
    vi.mocked(initializeHusky).mockResolvedValue(undefined);
    vi.mocked(createCommitlintConfig).mockResolvedValue(undefined);
    vi.mocked(createCommitMsgHook).mockResolvedValue(undefined);
    vi.mocked(checkGitAlias).mockResolvedValue(null);
    vi.mocked(setupGitAlias).mockResolvedValue(undefined);
    vi.mocked(createProjectConfig).mockResolvedValue(undefined);
}

describe("init flow integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(setupSigintHandler).mockReturnValue(vi.fn());
    });

    describe("pre-flight validation", () => {
        it("exits 1 when not in a git repo", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(false);

            await initCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("exits 1 when package.json is missing", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(false);

            await initCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("full setup workflow", () => {
        it("runs all setup steps when user confirms everything", async () => {
            setupHappyPath();

            await initCommand({});

            expect(installDependencies).toHaveBeenCalled();
            expect(initializeHusky).toHaveBeenCalled();
            expect(createCommitlintConfig).toHaveBeenCalled();
            expect(createCommitMsgHook).toHaveBeenCalled();
        });

        it("skips install when user declines dependency installation", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockResolvedValueOnce(false);

            await initCommand({});

            expect(installDependencies).not.toHaveBeenCalled();
            expect(initializeHusky).toHaveBeenCalled();
        });

        it("sets up git alias when user confirms alias setup", async () => {
            setupHappyPath();

            await initCommand({});

            expect(setupGitAlias).toHaveBeenCalled();
        });

        it("skips git alias when alias already exists and user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(checkGitAlias).mockResolvedValue("!merlin");
            // Confirm call order: installDeps, wantsAlias, shouldOverwrite (false), wantsProjectConfig
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // installDeps
                .mockResolvedValueOnce(true) // wantsAlias
                .mockResolvedValueOnce(false) // shouldOverwrite existing alias -> decline
                .mockResolvedValue(true); // wantsProjectConfig

            await initCommand({});

            expect(setupGitAlias).not.toHaveBeenCalled();
        });

        it("shows success message on completion", async () => {
            setupHappyPath();

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.init.completed)
            );
        });
    });

    describe("--husky-only flag", () => {
        it("runs husky setup but skips commitlint config creation", async () => {
            setupHappyPath();

            await initCommand({ huskyOnly: true });

            expect(initializeHusky).toHaveBeenCalled();
            expect(createCommitlintConfig).not.toHaveBeenCalled();
        });
    });

    describe("--commitlint-only flag", () => {
        it("creates commitlint config but skips husky initialization", async () => {
            setupHappyPath();

            await initCommand({ commitlintOnly: true });

            expect(createCommitlintConfig).toHaveBeenCalled();
            expect(initializeHusky).not.toHaveBeenCalled();
        });
    });

    describe("--no-install flag", () => {
        it("skips dependency installation regardless of user confirmation", async () => {
            setupHappyPath();

            await initCommand({ install: false });

            expect(installDependencies).not.toHaveBeenCalled();
        });
    });

    describe("error handling", () => {
        it("exits 1 and shows error when husky initialization fails", async () => {
            setupHappyPath();
            vi.mocked(initializeHusky).mockRejectedValue(new Error("husky init failed"));

            await initCommand({});

            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("exits 0 gracefully when user presses Ctrl+C", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(true);
            vi.mocked(detectExistingSetup).mockResolvedValue(NO_EXISTING_SETUP);
            vi.mocked(isPackageInstalled).mockResolvedValue(false);
            const exitError = new Error("User force closed the prompt");
            exitError.name = "ExitPromptError";
            vi.mocked(confirm).mockRejectedValue(exitError);

            await initCommand({});

            expect(mockExit).toHaveBeenCalledWith(0);
        });
    });
});
