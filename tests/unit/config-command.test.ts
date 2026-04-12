// Import mocked modules
import { confirm, input, select } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { configCommand } from "../../src/commands/config.js";
import {
    getMessages,
    loadConfig,
    loadProjectConfig,
    removeProjectConfigField,
    resetConfig,
    resetProjectConfig,
    saveConfig,
    saveProjectConfig,
} from "../../src/lib/config-loader";
import { getRepoRoot } from "../../src/lib/git";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

// Mock @inquirer/prompts
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

// Mock config-loader
vi.mock("../../src/lib/config-loader", () => ({
    loadConfig: vi.fn(),
    getMessages: vi.fn(),
    saveConfig: vi.fn(),
    resetConfig: vi.fn(),
    loadProjectConfig: vi.fn(),
    saveProjectConfig: vi.fn(),
    removeProjectConfigField: vi.fn(),
    resetProjectConfig: vi.fn(),
}));

// Mock git module (getRepoRoot)
vi.mock("../../src/lib/git", () => ({
    getRepoRoot: vi.fn(),
}));

// Mock terminal module
vi.mock("../../src/lib/terminal.js", () => ({
    normalizeVS16Spacing: (text: string) => text,
    isWideEmojiTerminal: () => false,
}));

// Mock console methods
const consoleSpy = {
    log: vi.spyOn(console, "log").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

describe("configCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getRepoRoot).mockResolvedValue("/mock/repo");
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG });
        vi.mocked(loadProjectConfig).mockReturnValue({});
    });

    describe("--show flag", () => {
        it("displays current configuration as formatted JSON", async () => {
            const mockConfig = {
                ...DEFAULT_CONFIG,
                theme: "standard" as const,
                maxSubjectLength: 50,
            };
            vi.mocked(loadConfig).mockReturnValue(mockConfig);

            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Current Configuration")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("standard")
            );
            expect(select).not.toHaveBeenCalled();
            expect(input).not.toHaveBeenCalled();
            expect(confirm).not.toHaveBeenCalled();
        });

        it("shows config file path", async () => {
            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("~/.merlinrc.json")
            );
        });

        it("displays number of commit types", async () => {
            await configCommand({ show: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(`${DEFAULT_CONFIG.types.length} commit types`)
            );
        });
    });

    describe("--reset flag", () => {
        it("prompts for confirmation before reset", async () => {
            vi.mocked(confirm).mockResolvedValue(false);

            await configCommand({ reset: true });

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Are you sure you want to reset all settings?",
                    default: false,
                })
            );
        });

        it("resets config when user confirms", async () => {
            vi.mocked(confirm).mockResolvedValue(true);

            await configCommand({ reset: true });

            expect(resetConfig).toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.success.config.saved)
            );
        });

        it("does not reset config when user cancels", async () => {
            vi.mocked(confirm).mockResolvedValue(false);

            await configCommand({ reset: true });

            expect(resetConfig).not.toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Reset cancelled")
            );
        });

        it("shows warning message before confirmation", async () => {
            vi.mocked(confirm).mockResolvedValue(false);

            await configCommand({ reset: true });

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.config.resetConfig)
            );
        });
    });

    describe("interactive menu", () => {
        it("displays menu with all options", async () => {
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.any(String),
                    choices: expect.arrayContaining([
                        expect.objectContaining({ value: "theme" }),
                        expect.objectContaining({ value: "maxSubjectLength" }),
                        expect.objectContaining({ value: "maxScopeLength" }),
                        expect.objectContaining({ value: "editor" }),
                        expect.objectContaining({ value: "autoAdd" }),
                        expect.objectContaining({ value: "show" }),
                        expect.objectContaining({ value: "reset" }),
                        expect.objectContaining({ value: "exit" }),
                    ]),
                })
            );
        });

        it("shows current values in menu choices", async () => {
            vi.mocked(loadConfig).mockReturnValue({
                ...DEFAULT_CONFIG,
                theme: "standard",
                maxSubjectLength: 100,
            });
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            // calls[0] = scope selector, calls[1] = user menu
            const selectCall = vi.mocked(select).mock.calls[1][0];
            const choices = selectCall.choices as Array<{ name: string; value: string }>;

            const themeChoice = choices.find((c) => c.value === "theme");
            expect(themeChoice?.name).toContain("standard");

            const subjectChoice = choices.find((c) => c.value === "maxSubjectLength");
            expect(subjectChoice?.name).toContain("100");
        });

        it("uses plain menu prompt regardless of theme", async () => {
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, theme: "wizard" });
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Select an option:",
                })
            );
        });
    });

    describe("theme configuration", () => {
        it("saves selected theme", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("theme")
                .mockResolvedValueOnce("standard")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ theme: "standard" });
        });

        it("offers wizard and standard theme choices", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("theme")
                .mockResolvedValueOnce("wizard")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            // calls[0] = scope, calls[1] = menu, calls[2] = theme
            const themeSelectCall = vi.mocked(select).mock.calls[2][0];
            const choices = themeSelectCall.choices as Array<{
                name: string;
                value: string;
            }>;

            expect(choices).toContainEqual(expect.objectContaining({ value: "wizard" }));
            expect(choices).toContainEqual(
                expect.objectContaining({ value: "standard" })
            );
        });
    });

    describe("maxSubjectLength configuration", () => {
        it("saves valid max subject length", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("100");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ maxSubjectLength: 100 });
        });

        it("validates minimum value", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("50");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("5")).toBe("Value must be at least 10");
            expect(validate("10")).toBe(true);
        });

        it("validates maximum value", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("100");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("201")).toBe("Value must be at most 200");
            expect(validate("200")).toBe(true);
        });

        it("rejects non-numeric input", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("50");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("abc")).toBe("Please enter a valid number");
        });
    });

    describe("maxScopeLength configuration", () => {
        it("saves valid max scope length", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxScopeLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("30");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ maxScopeLength: 30 });
        });

        it("validates minimum value (5)", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxScopeLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("20");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("4")).toBe("Value must be at least 5");
            expect(validate("5")).toBe(true);
        });

        it("validates maximum value (50)", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("maxScopeLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("20");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("51")).toBe("Value must be at most 50");
            expect(validate("50")).toBe(true);
        });
    });

    describe("editor configuration", () => {
        it("saves valid editor command", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("editor")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("code --wait");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ editor: "code --wait" });
        });

        it("rejects empty editor string", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("editor")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("vim");

            await configCommand({});

            const inputCall = vi.mocked(input).mock.calls[0][0];
            const validate = inputCall.validate as (input: string) => boolean | string;

            expect(validate("")).toBe("Editor command cannot be empty");
            expect(validate("   ")).toBe("Editor command cannot be empty");
        });

        it("trims editor input before saving", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("editor")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("  vim  ");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ editor: "vim" });
        });
    });

    describe("autoAdd configuration", () => {
        it("saves autoAdd toggle", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("autoAdd")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ autoAdd: true });
        });

        it("uses current value as default", async () => {
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, autoAdd: true });
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("autoAdd")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(false);

            await configCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    default: true,
                })
            );
        });
    });

    describe("show config from menu", () => {
        it("displays config and continues menu loop", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("show")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Current Configuration")
            );
            expect(select).toHaveBeenCalledTimes(3); // Scope, show, exit
        });
    });

    describe("reset from menu", () => {
        it("prompts for confirmation and resets if confirmed", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("user")
                .mockResolvedValueOnce("reset")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(resetConfig).toHaveBeenCalled();
        });
    });

    describe("exit from user menu", () => {
        it("exits menu loop when exit is selected", async () => {
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledTimes(2); // Scope + exit
            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.commit.exit)
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.config.exit)
            );
        });
    });

    describe("scope selector", () => {
        it("shows scope selector in git repo", async () => {
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: WIZARD_MESSAGES.config.scopeSelector,
                    choices: expect.arrayContaining([
                        expect.objectContaining({ value: "user" }),
                        expect.objectContaining({ value: "project" }),
                    ]),
                })
            );
        });

        it("skips scope selector and warns when not in a git repo", async () => {
            vi.mocked(getRepoRoot).mockResolvedValue(null);
            vi.mocked(select).mockResolvedValueOnce("exit");

            await configCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.warnings.config.noProjectConfig)
            );
        });
    });

    describe("project config menu", () => {
        it("prompts to create config when none exists", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({});
            vi.mocked(select).mockResolvedValueOnce("project");
            vi.mocked(confirm).mockResolvedValueOnce(false);

            await configCommand({});

            expect(confirm).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: WIZARD_MESSAGES.config.createProjectConfig,
                })
            );
        });

        it("creates project config and shows menu when confirmed", async () => {
            vi.mocked(loadProjectConfig)
                .mockReturnValueOnce({})
                .mockReturnValue({ theme: "wizard" });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(saveProjectConfig).toHaveBeenCalledWith(
                { theme: DEFAULT_CONFIG.theme },
                "/mock/repo"
            );
        });

        it("returns to caller when user declines config creation", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({});
            vi.mocked(select).mockResolvedValueOnce("project");
            vi.mocked(confirm).mockResolvedValueOnce(false);

            await configCommand({});

            expect(saveProjectConfig).not.toHaveBeenCalled();
        });

        it("shows configured fields in project overrides section", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            // The project menu select call (calls[1])
            const projectMenuCall = vi.mocked(select).mock.calls[1][0];
            const choices = projectMenuCall.choices as Array<{
                name?: string;
                value?: string;
            }>;

            const fieldChoices = choices.filter((c) => "value" in c && c.value);
            expect(fieldChoices).toContainEqual(
                expect.objectContaining({ value: "theme" })
            );
            expect(fieldChoices).toContainEqual(
                expect.objectContaining({ value: "maxSubjectLength" })
            );
        });

        it("removes field when user selects remove action", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("remove")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(removeProjectConfigField).toHaveBeenCalledWith(
                "maxSubjectLength",
                "/mock/repo"
            );
        });

        it("saves to project config when configuring a field", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({ theme: "wizard" });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("80");

            await configCommand({});

            expect(saveProjectConfig).toHaveBeenCalledWith(
                { maxSubjectLength: 80 },
                "/mock/repo"
            );
            expect(saveConfig).not.toHaveBeenCalled();
        });

        it("displays project overrides when show action is selected", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("show")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Project Overrides")
            );
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("maxSubjectLength")
            );
        });

        it("calls resetProjectConfig when reset is confirmed", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("reset")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(resetProjectConfig).toHaveBeenCalledWith("/mock/repo");
        });

        it("does not reset project config when reset is cancelled", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("reset")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(false);

            await configCommand({});

            expect(resetProjectConfig).not.toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Reset cancelled")
            );
        });

        it("skips reset confirmation when only theme baseline is present", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({ theme: "wizard" });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("reset")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(confirm).not.toHaveBeenCalled();
            expect(resetProjectConfig).not.toHaveBeenCalled();
            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("No project overrides to reset")
            );
        });

        it("includes show, reset, and exit actions in project menu choices", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({ theme: "wizard" });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            const projectMenuCall = vi.mocked(select).mock.calls[1][0];
            const choices = projectMenuCall.choices as Array<{
                value?: string;
            }>;
            const fieldChoices = choices.filter((c) => "value" in c && c.value);

            expect(fieldChoices).toContainEqual(
                expect.objectContaining({ value: "show" })
            );
            expect(fieldChoices).toContainEqual(
                expect.objectContaining({ value: "reset" })
            );
            expect(fieldChoices).toContainEqual(
                expect.objectContaining({ value: "exit" })
            );
        });
    });

    describe("menu visual structure", () => {
        it("includes Separator entries in user menu", async () => {
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            const userMenuCall = vi.mocked(select).mock.calls[1][0];
            const choices = userMenuCall.choices as Array<unknown>;
            const separators = choices.filter(
                (c) => typeof c === "object" && c !== null && "separator" in c
            );

            expect(separators.length).toBeGreaterThan(0);
        });

        it("sets short property on every actionable user menu choice", async () => {
            vi.mocked(select).mockResolvedValueOnce("user").mockResolvedValueOnce("exit");

            await configCommand({});

            const userMenuCall = vi.mocked(select).mock.calls[1][0];
            const choices = userMenuCall.choices as Array<{
                value?: string;
                short?: string;
            }>;
            const actionable = choices.filter((c) => "value" in c && c.value);

            for (const choice of actionable) {
                expect(choice.short).toBeTruthy();
            }
        });

        it("sets short property on every actionable project menu choice", async () => {
            vi.mocked(loadProjectConfig).mockReturnValue({
                theme: "wizard",
                maxSubjectLength: 80,
            });
            vi.mocked(select)
                .mockResolvedValueOnce("project")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            const projectMenuCall = vi.mocked(select).mock.calls[1][0];
            const choices = projectMenuCall.choices as Array<{
                value?: string;
                short?: string;
            }>;
            const actionable = choices.filter((c) => "value" in c && c.value);

            for (const choice of actionable) {
                expect(choice.short).toBeTruthy();
            }
        });
    });

    describe("error handling", () => {
        it("handles Ctrl+C (ExitPromptError) gracefully", async () => {
            const exitError = new Error("User force closed the prompt");
            exitError.name = "ExitPromptError";
            vi.mocked(select).mockRejectedValueOnce(exitError);

            await configCommand({});

            // ExitPromptError should result in clean exit (exit code 0)
            // The SIGINT handler at process level shows the cancel message
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it("shows error message for unexpected errors", async () => {
            const unexpectedError = new Error("Something went wrong");
            vi.mocked(select).mockRejectedValueOnce(unexpectedError);

            await configCommand({});

            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("An unexpected error occurred")
            );
            expect(consoleSpy.error).toHaveBeenCalledWith(
                expect.stringContaining("Something went wrong")
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });
});
