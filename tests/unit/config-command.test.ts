import { beforeEach, describe, expect, it, vi } from "vitest";
import { configCommand } from "../../src/commands/config";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants";

// Mock @inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
    select: vi.fn(),
    input: vi.fn(),
    confirm: vi.fn(),
}));

// Mock config utilities
vi.mock("../../src/utils/config", () => ({
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    resetConfig: vi.fn(),
    getMessages: vi.fn(),
}));

// Import mocked modules
import { confirm, input, select } from "@inquirer/prompts";
import { getMessages, loadConfig, resetConfig, saveConfig } from "../../src/utils/config";

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
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
        vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG });
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
                expect.stringContaining(WIZARD_MESSAGES.success.config)
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
                expect.stringContaining(WIZARD_MESSAGES.warnings.resetConfig)
            );
        });
    });

    describe("interactive menu", () => {
        it("displays menu with all options", async () => {
            // First call: show menu, select exit
            vi.mocked(select).mockResolvedValueOnce("exit");

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
            vi.mocked(select).mockResolvedValueOnce("exit");

            await configCommand({});

            const selectCall = vi.mocked(select).mock.calls[0][0];
            const choices = selectCall.choices as Array<{ name: string; value: string }>;

            const themeChoice = choices.find((c) => c.value === "theme");
            expect(themeChoice?.name).toContain("standard");

            const subjectChoice = choices.find((c) => c.value === "maxSubjectLength");
            expect(subjectChoice?.name).toContain("100");
        });

        it("uses wizard theme message when theme is wizard", async () => {
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, theme: "wizard" });
            vi.mocked(select).mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "What would you like to configure?",
                })
            );
        });

        it("uses standard theme message when theme is standard", async () => {
            vi.mocked(loadConfig).mockReturnValue({
                ...DEFAULT_CONFIG,
                theme: "standard",
            });
            vi.mocked(select).mockResolvedValueOnce("exit");

            await configCommand({});

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Select option:",
                })
            );
        });
    });

    describe("theme configuration", () => {
        it("saves selected theme", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("theme")
                .mockResolvedValueOnce("standard")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ theme: "standard" });
        });

        it("offers wizard and standard theme choices", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("theme")
                .mockResolvedValueOnce("wizard")
                .mockResolvedValueOnce("exit");

            await configCommand({});

            // Second select call is for theme
            const themeSelectCall = vi.mocked(select).mock.calls[1][0];
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
                .mockResolvedValueOnce("maxSubjectLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("100");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ maxSubjectLength: 100 });
        });

        it("validates minimum value", async () => {
            vi.mocked(select)
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
                .mockResolvedValueOnce("maxScopeLength")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("30");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ maxScopeLength: 30 });
        });

        it("validates minimum value (5)", async () => {
            vi.mocked(select)
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
                .mockResolvedValueOnce("editor")
                .mockResolvedValueOnce("exit");
            vi.mocked(input).mockResolvedValueOnce("code --wait");

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ editor: "code --wait" });
        });

        it("rejects empty editor string", async () => {
            vi.mocked(select)
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
                .mockResolvedValueOnce("autoAdd")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(saveConfig).toHaveBeenCalledWith({ autoAdd: true });
        });

        it("uses current value as default", async () => {
            vi.mocked(loadConfig).mockReturnValue({ ...DEFAULT_CONFIG, autoAdd: true });
            vi.mocked(select)
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
            vi.mocked(select).mockResolvedValueOnce("show").mockResolvedValueOnce("exit");

            await configCommand({});

            expect(consoleSpy.log).toHaveBeenCalledWith(
                expect.stringContaining("Current Configuration")
            );
            expect(select).toHaveBeenCalledTimes(2); // Show then exit
        });
    });

    describe("reset from menu", () => {
        it("prompts for confirmation and resets if confirmed", async () => {
            vi.mocked(select)
                .mockResolvedValueOnce("reset")
                .mockResolvedValueOnce("exit");
            vi.mocked(confirm).mockResolvedValueOnce(true);

            await configCommand({});

            expect(resetConfig).toHaveBeenCalled();
        });
    });

    describe("exit", () => {
        it("exits menu loop when exit is selected", async () => {
            vi.mocked(select).mockResolvedValueOnce("exit");

            await configCommand({});

            // Should exit after one menu selection without prompting again
            expect(select).toHaveBeenCalledTimes(1);
            // Should not show commit-related exit message
            expect(consoleSpy.log).not.toHaveBeenCalledWith(
                expect.stringContaining(WIZARD_MESSAGES.exit)
            );
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
