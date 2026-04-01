import { confirm, select } from "@inquirer/prompts";
import ora from "ora";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initCommand } from "../../src/commands/init.js";
import { getMessages } from "../../src/lib/config-loader";
import { getRepoRoot, isGitRepo } from "../../src/lib/git";
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
} from "../../src/lib/setup";
import { setupSigintHandler } from "../../src/lib/sigint";
import { WIZARD_MESSAGES } from "../../src/utils/constants.js";

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

const NO_EXISTING = {
    husky: false,
    commitMsgHook: false,
    commitlintConfig: false,
    merlinConfig: false,
};

/**
 * Sets up the "happy path" mocks so the full init workflow completes.
 * Individual tests can override specific mocks after calling this.
 */
function setupHappyPath() {
    vi.mocked(isGitRepo).mockResolvedValue(true);
    vi.mocked(hasPackageJson).mockResolvedValue(true);
    vi.mocked(detectExistingSetup).mockResolvedValue({ ...NO_EXISTING });
    vi.mocked(installDependencies).mockResolvedValue(undefined);
    vi.mocked(initializeHusky).mockResolvedValue(undefined);
    vi.mocked(createCommitlintConfig).mockResolvedValue(undefined);
    vi.mocked(createCommitMsgHook).mockResolvedValue(undefined);
    vi.mocked(checkGitAlias).mockResolvedValue(null);
    vi.mocked(setupGitAlias).mockResolvedValue(undefined);
    vi.mocked(createProjectConfig).mockResolvedValue(undefined);
    vi.mocked(isPackageInstalled).mockResolvedValue(true);

    // Default confirm responses in order:
    // 1. Install deps? → yes
    // 2. Setup git alias? → yes
    // 3. Create project config? → yes
    vi.mocked(confirm)
        .mockResolvedValueOnce(true) // install deps
        .mockResolvedValueOnce(true) // setup alias
        .mockResolvedValueOnce(true); // project config

    // select: alias scope → global
    vi.mocked(select).mockResolvedValueOnce("global");
}

describe("initCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(setupSigintHandler).mockReturnValue(vi.fn());
    });

    describe("pre-flight validation", () => {
        it("exits with error when not a git repo", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(false);

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.start).toHaveBeenCalledWith(WIZARD_MESSAGES.checking.repo);
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.notRepo)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.tips.runGitInit)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("exits with error when no package.json", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(false);

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.noPackageJson)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.tips.runNpmInit)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("sets up and cleans up SIGINT handler", async () => {
            setupHappyPath();
            const removeFn = vi.fn();
            vi.mocked(setupSigintHandler).mockReturnValue(removeFn);

            await initCommand({});

            expect(setupSigintHandler).toHaveBeenCalledWith(
                WIZARD_MESSAGES,
                expect.any(Function)
            );
            expect(removeFn).toHaveBeenCalled();
        });
    });

    describe("existing setup detection", () => {
        it("shows warning when existing files are detected", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                husky: true,
                commitMsgHook: true,
                commitlintConfig: false,
                merlinConfig: false,
            });
            // Reset confirms: install deps, overwrite husky, overwrite hook, alias, project config
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // overwrite .husky/
                .mockResolvedValueOnce(true) // overwrite commit-msg hook
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.existingSetup)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(".husky/ directory")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(".husky/commit-msg hook")
            );
        });

        it("does not show warning when no existing files", async () => {
            setupHappyPath();

            await initCommand({});

            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.existingSetup)
            );
        });
    });

    describe("dependency installation", () => {
        it("installs all dependencies when user confirms", async () => {
            setupHappyPath();

            await initCommand({});

            expect(installDependencies).toHaveBeenCalledWith(
                ["husky", "@commitlint/cli", "@commitlint/config-conventional"],
                { silent: true }
            );
        });

        it("skips installation entirely with --no-install flag", async () => {
            setupHappyPath();
            // Reset confirms: no install prompt needed, alias, project config
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ install: false });

            expect(installDependencies).not.toHaveBeenCalled();
        });

        it("skips installation when user declines", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(false) // decline install
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(installDependencies).not.toHaveBeenCalled();
        });

        it("filters deps to only husky with --husky-only", async () => {
            setupHappyPath();

            await initCommand({ huskyOnly: true });

            expect(installDependencies).toHaveBeenCalledWith(["husky"], { silent: true });
        });

        it("filters deps to exclude husky with --commitlint-only", async () => {
            setupHappyPath();
            // commitlint-only: no husky init step, but hook step runs if husky exists
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ commitlintOnly: true });

            expect(installDependencies).toHaveBeenCalledWith(
                ["@commitlint/cli", "@commitlint/config-conventional"],
                { silent: true }
            );
        });

        it("exits with error when install fails", async () => {
            setupHappyPath();
            vi.mocked(installDependencies).mockRejectedValue(
                new Error("npm ERR! install failed")
            );

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.installFailed)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.tips.manualInstall)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("husky initialization", () => {
        it("initializes husky in default flow", async () => {
            setupHappyPath();

            await initCommand({});

            expect(initializeHusky).toHaveBeenCalled();
        });

        it("skips husky init with --commitlint-only", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ commitlintOnly: true });

            expect(initializeHusky).not.toHaveBeenCalled();
        });

        it("prompts to overwrite when husky already exists", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                husky: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // overwrite .husky/
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining(".husky/"),
                })
            );
            expect(initializeHusky).toHaveBeenCalled();
        });

        it("skips husky init when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                husky: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline overwrite .husky/
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(initializeHusky).not.toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.init.skipExisting)
            );
        });

        it("shows warning and skips husky when husky is not installed", async () => {
            setupHappyPath();
            vi.mocked(isPackageInstalled).mockImplementation(async (pkg) => {
                if (pkg === "husky") return false;
                return true;
            });

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Skipping Husky initialization")
            );
            expect(initializeHusky).not.toHaveBeenCalled();
        });

        it("exits with error when husky init fails", async () => {
            setupHappyPath();
            vi.mocked(initializeHusky).mockRejectedValue(new Error("husky init failed"));

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.huskyFailed)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("commitlint config creation", () => {
        it("creates commitlint config in default flow", async () => {
            setupHappyPath();

            await initCommand({});

            expect(createCommitlintConfig).toHaveBeenCalled();
        });

        it("skips commitlint config with --husky-only", async () => {
            setupHappyPath();

            await initCommand({ huskyOnly: true });

            expect(createCommitlintConfig).not.toHaveBeenCalled();
        });

        it("prompts to overwrite when commitlint config exists", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitlintConfig: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // overwrite commitlint config
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining("commitlint.config.js"),
                })
            );
            expect(createCommitlintConfig).toHaveBeenCalled();
        });

        it("skips commitlint config when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitlintConfig: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline overwrite commitlint
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(createCommitlintConfig).not.toHaveBeenCalled();
        });

        it("shows warning and skips commitlint when @commitlint/cli is not installed", async () => {
            setupHappyPath();
            vi.mocked(isPackageInstalled).mockImplementation(async (pkg) => {
                if (pkg === "@commitlint/cli") return false;
                return true;
            });

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Skipping commitlint config")
            );
            expect(createCommitlintConfig).not.toHaveBeenCalled();
        });

        it("exits with error when commitlint config creation fails", async () => {
            setupHappyPath();
            vi.mocked(createCommitlintConfig).mockRejectedValue(
                new Error("write failed")
            );

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.configFailed)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("commit-msg hook creation", () => {
        it("creates commit-msg hook in default flow", async () => {
            setupHappyPath();

            await initCommand({});

            expect(createCommitMsgHook).toHaveBeenCalled();
        });

        it("prompts to overwrite when hook exists", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitMsgHook: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // overwrite commit-msg hook
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining(".husky/commit-msg"),
                })
            );
            expect(createCommitMsgHook).toHaveBeenCalled();
        });

        it("skips hook when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitMsgHook: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline overwrite hook
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(createCommitMsgHook).not.toHaveBeenCalled();
        });

        it("creates hook with --commitlint-only when husky already exists", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                husky: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ commitlintOnly: true });

            expect(createCommitMsgHook).toHaveBeenCalled();
        });

        it("skips hook with --commitlint-only when husky does not exist", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ commitlintOnly: true });

            expect(createCommitMsgHook).not.toHaveBeenCalled();
        });

        it("exits with error when hook creation fails", async () => {
            setupHappyPath();
            vi.mocked(createCommitMsgHook).mockRejectedValue(
                new Error("permission denied")
            );

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.hookFailed)
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe("git alias setup", () => {
        it("creates global alias when user confirms", async () => {
            setupHappyPath();

            await initCommand({});

            expect(setupGitAlias).toHaveBeenCalledWith("global");
        });

        it("creates local alias when user selects local scope", async () => {
            setupHappyPath();
            vi.mocked(select).mockReset();
            vi.mocked(select).mockResolvedValueOnce("local");

            await initCommand({});

            expect(setupGitAlias).toHaveBeenCalledWith("local");
        });

        it("skips alias when user declines", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline alias
                .mockResolvedValueOnce(true); // project config

            await initCommand({});

            expect(setupGitAlias).not.toHaveBeenCalled();
            expect(select).not.toHaveBeenCalled();
        });

        it("shows warning when alias already exists", async () => {
            setupHappyPath();
            vi.mocked(checkGitAlias).mockResolvedValue("!merlin");
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // wants alias
                .mockResolvedValueOnce(true) // overwrite alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.aliasExists)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("!merlin")
            );
        });

        it("skips alias when user declines overwrite of existing alias", async () => {
            setupHappyPath();
            vi.mocked(checkGitAlias).mockResolvedValue("!merlin");
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // wants alias
                .mockResolvedValueOnce(false) // decline overwrite
                .mockResolvedValueOnce(true); // project config

            await initCommand({});

            expect(setupGitAlias).not.toHaveBeenCalled();
        });

        it("continues to success summary when alias setup fails (non-fatal)", async () => {
            setupHappyPath();
            vi.mocked(setupGitAlias).mockRejectedValue(new Error("git config failed"));

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.errors.aliasFailed)
            );
            // Should NOT exit — continues to project config and summary
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.init)
            );
        });
    });

    describe("project config creation", () => {
        it("creates project config when user confirms", async () => {
            setupHappyPath();

            await initCommand({});

            expect(createProjectConfig).toHaveBeenCalled();
        });

        it("skips project config when user declines", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(false); // decline project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(createProjectConfig).not.toHaveBeenCalled();
        });

        it("prompts to overwrite when .merlinrc.json exists", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                merlinConfig: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true) // wants project config
                .mockResolvedValueOnce(true); // overwrite .merlinrc.json
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining(".merlinrc.json"),
                })
            );
            expect(createProjectConfig).toHaveBeenCalled();
        });

        it("skips project config when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                merlinConfig: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true) // wants project config
                .mockResolvedValueOnce(false); // decline overwrite
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            expect(createProjectConfig).not.toHaveBeenCalled();
        });

        it("continues to success summary when project config fails (non-fatal)", async () => {
            setupHappyPath();
            vi.mocked(createProjectConfig).mockRejectedValue(new Error("write failed"));

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.init)
            );
        });
    });

    describe("success", () => {
        it("returns naturally after full workflow", async () => {
            setupHappyPath();

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.init)
            );
        });

        it("displays init-specific exit message, not commit exit", async () => {
            setupHappyPath();

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.init.exit)
            );
            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.commit.exit)
            );
        });
    });

    describe("error handling", () => {
        it("handles Ctrl+C (ExitPromptError) gracefully", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(true);
            vi.mocked(detectExistingSetup).mockResolvedValue({ ...NO_EXISTING });

            const exitError = new Error("User force closed the prompt");
            exitError.name = "ExitPromptError";
            vi.mocked(confirm).mockRejectedValueOnce(exitError);

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.stop).toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.cancel)
            );
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it("handles unexpected errors with exit code 1", async () => {
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(true);
            vi.mocked(detectExistingSetup).mockResolvedValue({ ...NO_EXISTING });

            const unexpectedError = new Error("Something broke");
            vi.mocked(confirm).mockRejectedValueOnce(unexpectedError);

            await initCommand({});

            const spinner = vi.mocked(ora)();
            expect(spinner.fail).toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("Something broke")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it("cleans up SIGINT handler even when error occurs", async () => {
            const removeFn = vi.fn();
            vi.mocked(setupSigintHandler).mockReturnValue(removeFn);
            vi.mocked(isGitRepo).mockResolvedValue(true);
            vi.mocked(hasPackageJson).mockResolvedValue(true);
            vi.mocked(detectExistingSetup).mockResolvedValue({ ...NO_EXISTING });

            const error = new Error("fail");
            error.name = "ExitPromptError";
            vi.mocked(confirm).mockRejectedValueOnce(error);

            await initCommand({});

            expect(removeFn).toHaveBeenCalled();
        });
    });

    describe("success summary", () => {
        /**
         * Extracts summary item strings from console.log calls
         * that appear after the "Created/updated:" header line.
         * This isolates summary output from the existing-file detection output.
         */
        function extractSummaryItems(): string[] {
            const { calls } = consoleSpy.log.mock;
            const createdIndex = calls.findIndex((call) =>
                String(call[0]).includes("Created/updated:")
            );
            if (createdIndex === -1) return [];

            const summaryItems: string[] = [];
            for (let i = createdIndex + 1; i < calls.length; i++) {
                const text = String(calls[i][0]);
                if (text.includes("•")) {
                    summaryItems.push(text);
                } else {
                    break;
                }
            }
            return summaryItems;
        }

        it("shows all items in summary on full happy path", async () => {
            setupHappyPath();

            await initCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(".husky/ directory")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("commitlint.config.js")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(".husky/commit-msg hook")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("git merlin alias")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(".merlinrc.json (project config)")
            );
        });

        it("omits husky from summary when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                husky: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline husky overwrite
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            const summaryItems = extractSummaryItems();
            expect(summaryItems.some((item) => item.includes(".husky/ directory"))).toBe(
                false
            );
        });

        it("omits commitlint from summary when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitlintConfig: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline commitlint overwrite
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            const summaryItems = extractSummaryItems();
            expect(
                summaryItems.some((item) => item.includes("commitlint.config.js"))
            ).toBe(false);
        });

        it("omits commit-msg hook from summary when user declines overwrite", async () => {
            setupHappyPath();
            vi.mocked(detectExistingSetup).mockResolvedValue({
                ...NO_EXISTING,
                commitMsgHook: true,
            });
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(false) // decline hook overwrite
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({});

            const summaryItems = extractSummaryItems();
            expect(
                summaryItems.some((item) => item.includes(".husky/commit-msg hook"))
            ).toBe(false);
        });

        it("omits husky items when --commitlint-only is used", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ commitlintOnly: true });

            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining(".husky/ directory")
            );
            expect(initializeHusky).not.toHaveBeenCalled();
        });

        it("omits commitlint items when --husky-only is used", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // install deps
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ huskyOnly: true });

            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining("commitlint.config.js")
            );
            expect(createCommitlintConfig).not.toHaveBeenCalled();
        });
    });

    describe("combined flags", () => {
        it("--husky-only --no-install skips install and commitlint", async () => {
            setupHappyPath();
            // With --no-install --husky-only: no install prompt, no commitlint
            // Confirms: alias, project config
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("global");

            await initCommand({ huskyOnly: true, install: false });

            expect(installDependencies).not.toHaveBeenCalled();
            expect(createCommitlintConfig).not.toHaveBeenCalled();
            expect(initializeHusky).toHaveBeenCalled();
            // Hook should NOT be created in husky-only mode (no commitlint to run)
            expect(createCommitMsgHook).not.toHaveBeenCalled();
        });

        it("--commitlint-only --no-install skips install and husky", async () => {
            setupHappyPath();
            vi.mocked(confirm).mockReset();
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // alias
                .mockResolvedValueOnce(true); // project config
            vi.mocked(select).mockResolvedValueOnce("local");

            await initCommand({ commitlintOnly: true, install: false });

            expect(installDependencies).not.toHaveBeenCalled();
            expect(initializeHusky).not.toHaveBeenCalled();
            expect(createCommitlintConfig).toHaveBeenCalled();
            // Hook should NOT be created because commitlintOnly=true and husky doesn't exist
            expect(createCommitMsgHook).not.toHaveBeenCalled();
        });
    });
});
