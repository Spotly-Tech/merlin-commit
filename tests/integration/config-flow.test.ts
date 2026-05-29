import { confirm, select } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { configCommand } from "../../src/commands/config.js";
import {
    getMessages,
    loadConfig,
    loadProjectConfig,
    loadUserConfig,
    removeProjectConfigField,
    resetConfig,
    resetProjectConfig,
    saveConfig,
    saveProjectConfig,
} from "../../src/lib/config-loader.js";
import { getRepoRoot } from "../../src/lib/git.js";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

// utils/config.ts (validateConfig) is intentionally NOT mocked - pure
// validation logic runs for real to verify the config merge pipeline.

vi.mock("@inquirer/prompts", () => {
    class MockSeparator {
        type = "separator";
        separator: string;
        constructor(text: string) {
            this.separator = text;
        }
    }
    return {
        select: vi.fn(),
        input: vi.fn(),
        confirm: vi.fn(),
        Separator: MockSeparator,
    };
});

vi.mock("../../src/lib/config-loader", () => ({
    loadConfig: vi.fn(),
    loadUserConfig: vi.fn(),
    getMessages: vi.fn(),
    saveConfig: vi.fn(),
    resetConfig: vi.fn(),
    loadProjectConfig: vi.fn(),
    saveProjectConfig: vi.fn(),
    removeProjectConfigField: vi.fn(),
    resetProjectConfig: vi.fn(),
}));

vi.mock("../../src/lib/git", () => ({
    getRepoRoot: vi.fn(),
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
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
};

const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

describe("config flow integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);
        vi.mocked(loadUserConfig).mockReturnValue({});
        vi.mocked(loadProjectConfig).mockReturnValue({});
        vi.mocked(saveConfig).mockImplementation(() => {});
        vi.mocked(resetConfig).mockImplementation(() => {});
        vi.mocked(saveProjectConfig).mockImplementation(() => {});
        vi.mocked(removeProjectConfigField).mockImplementation(() => {});
        vi.mocked(resetProjectConfig).mockImplementation(() => {});
    });

    describe("--show flag", () => {
        it("displays effective config when no scope provided", async () => {
            vi.mocked(loadConfig).mockReturnValue({
                ...DEFAULT_CONFIG,
                theme: "wizard",
                maxSubjectLength: 72,
            });

            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"theme": "wizard"')
            );
        });

        it("displays user config when scope is user", async () => {
            vi.mocked(loadUserConfig).mockReturnValue({
                theme: "standard",
                maxSubjectLength: 80,
            });

            await configCommand({ show: "user" });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"theme": "standard"')
            );
        });

        it("displays project config when scope is project and config exists", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "standard",
                maxScopeLength: 30,
            });

            await configCommand({ show: "project" });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"maxScopeLength": 30')
            );
        });

        it("notifies when project config is empty", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({});

            await configCommand({ show: "project" });

            // showProjectConfig prints DISPLAY.noProjectOverrides when the file has no fields
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("No project overrides set.")
            );
        });
    });

    describe("--reset flag", () => {
        it("calls resetConfig after user confirms", async () => {
            vi.mocked(confirm).mockResolvedValue(true);

            await configCommand({ reset: true });

            expect(resetConfig).toHaveBeenCalled();
        });

        it("skips resetConfig when user cancels", async () => {
            vi.mocked(confirm).mockResolvedValue(false);

            await configCommand({ reset: true });

            expect(resetConfig).not.toHaveBeenCalled();
        });

        it("completes without error after successful reset", async () => {
            vi.mocked(confirm).mockResolvedValue(true);

            await configCommand({ reset: true });

            // configCommand returns normally after reset - no process.exit is called
            expect(mockExit).not.toHaveBeenCalled();
            expect(resetConfig).toHaveBeenCalled();
        });
    });

    describe("interactive menu exits cleanly", () => {
        it("completes without error when user navigates to exit", async () => {
            // First select: scope selector returns "user" (valid scope choice)
            // Second select: user menu returns "exit" (exits the loop)
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValue("exit");

            await configCommand({});

            // configCommand returns normally on clean exit - no process.exit is called
            expect(mockExit).not.toHaveBeenCalled();
        });
    });

    describe("config state flows through display correctly", () => {
        it("shows all DEFAULT_CONFIG fields in effective config output", async () => {
            vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);

            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"maxSubjectLength": 72')
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"maxScopeLength": 20')
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"autoAdd": false')
            );
        });

        it("shows custom values when user config overrides defaults", async () => {
            vi.mocked(loadConfig).mockReturnValue({
                ...DEFAULT_CONFIG,
                maxSubjectLength: 100,
                theme: "standard",
                autoAdd: true,
            });

            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"maxSubjectLength": 100')
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"theme": "standard"')
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining('"autoAdd": true')
            );
        });
    });
});
