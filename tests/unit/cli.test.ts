import type { Command, Option } from "commander";
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
    type MockInstance,
} from "vitest";

import { commitCommand } from "../../src/commands/commit.js";
import { configCommand } from "../../src/commands/config.js";
import { initCommand } from "../../src/commands/init.js";

vi.mock("../../src/commands/commit.js", () => ({
    commitCommand: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/commands/config.js", () => ({
    configCommand: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/commands/init.js", () => ({
    initCommand: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Capture the Commander program instance that cli.ts builds.
 *
 * cli.ts calls program.parse() synchronously at module load time, which would
 * immediately fire against process.argv in a test environment. We override
 * parse() to be a no-op that saves the instance instead, giving us the
 * fully-configured program to inspect and drive in each test.
 *
 * The instance is stored via a setter function to satisfy the no-this-alias
 * lint rule: passing `this` as an argument is allowed, aliasing it to a
 * variable directly is not.
 */
let capturedProgram: Command | undefined = undefined;

function storeProgramInstance(instance: Command): void {
    capturedProgram = instance;
}

vi.mock("commander", async () => {
    const { Command: OriginalCommand } =
        await vi.importActual<typeof import("commander")>("commander");

    return {
        Command: class extends OriginalCommand {
            parse(_argv?: readonly string[]) {
                storeProgramInstance(this);
                return this;
            }
        },
    };
});

const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

beforeAll(async () => {
    await import("../../src/cli.js");
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("cli", () => {
    describe("program version", () => {
        it("should report a semver version string", () => {
            expect(capturedProgram!.version()).toMatch(/^\d+\.\d+\.\d+/);
        });

        it("should register -v as the short version flag", () => {
            const versionOption = capturedProgram!.options.find((option: Option) =>
                option.flags.includes("-v")
            );
            expect(versionOption).toBeDefined();
        });
    });

    describe("commit command", () => {
        let commitSubcommand: Command | undefined = undefined;

        beforeAll(() => {
            commitSubcommand = capturedProgram!.commands.find(
                (command: Command) => command.name() === "commit"
            );
        });

        it("should register the commit command", () => {
            expect(commitSubcommand).toBeDefined();
        });

        it("should register alias c", () => {
            expect(commitSubcommand!.alias()).toBe("c");
        });

        it("should invoke commitCommand when commit subcommand is run", async () => {
            await capturedProgram!.parseAsync(["node", "merlin", "commit"]);
            expect(vi.mocked(commitCommand)).toHaveBeenCalled();
        });

        it("should register --dry-run option", () => {
            const optionFlags = commitSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(optionFlags.some((flags: string) => flags.includes("--dry-run"))).toBe(
                true
            );
        });

        it("should register --no-verify option", () => {
            const optionFlags = commitSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(
                optionFlags.some((flags: string) => flags.includes("--no-verify"))
            ).toBe(true);
        });

        it("should register --amend option", () => {
            const optionFlags = commitSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(optionFlags.some((flags: string) => flags.includes("--amend"))).toBe(
                true
            );
        });
    });

    describe("config command", () => {
        let configSubcommand: Command | undefined = undefined;

        beforeAll(() => {
            configSubcommand = capturedProgram!.commands.find(
                (command: Command) => command.name() === "config"
            );
        });

        it("should register the config command", () => {
            expect(configSubcommand).toBeDefined();
        });

        it("should invoke configCommand when config subcommand is run", async () => {
            await capturedProgram!.parseAsync(["node", "merlin", "config"]);
            expect(vi.mocked(configCommand)).toHaveBeenCalled();
        });

        it("should register --show option", () => {
            const optionFlags = configSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(optionFlags.some((flags: string) => flags.includes("--show"))).toBe(
                true
            );
        });

        it("should register --reset option", () => {
            const optionFlags = configSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(optionFlags.some((flags: string) => flags.includes("--reset"))).toBe(
                true
            );
        });
    });

    describe("init command", () => {
        let initSubcommand: Command | undefined = undefined;

        beforeAll(() => {
            initSubcommand = capturedProgram!.commands.find(
                (command: Command) => command.name() === "init"
            );
        });

        it("should register the init command", () => {
            expect(initSubcommand).toBeDefined();
        });

        it("should invoke initCommand when init subcommand is run", async () => {
            await capturedProgram!.parseAsync(["node", "merlin", "init"]);
            expect(vi.mocked(initCommand)).toHaveBeenCalled();
        });

        it("should register --husky-only option", () => {
            const optionFlags = initSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(
                optionFlags.some((flags: string) => flags.includes("--husky-only"))
            ).toBe(true);
        });

        it("should register --commitlint-only option", () => {
            const optionFlags = initSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(
                optionFlags.some((flags: string) => flags.includes("--commitlint-only"))
            ).toBe(true);
        });

        it("should register --no-install option", () => {
            const optionFlags = initSubcommand!.options.map(
                (option: Option) => option.flags
            );
            expect(
                optionFlags.some((flags: string) => flags.includes("--no-install"))
            ).toBe(true);
        });
    });

    describe("unknown command handling", () => {
        let helpSpy: MockInstance = undefined as unknown as MockInstance;

        beforeEach(() => {
            helpSpy = vi.spyOn(capturedProgram!, "help").mockImplementation(() => {});
            capturedProgram!.args = ["bogus-command"];
            capturedProgram!.emit("command:*");
        });

        afterEach(() => {
            helpSpy.mockRestore();
        });

        it("should log an error for unknown commands", () => {
            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][0]).toMatch(/Invalid command/i);
        });

        it("should display help for unknown commands", () => {
            expect(helpSpy).toHaveBeenCalled();
        });
    });
});
