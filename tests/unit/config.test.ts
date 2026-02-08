import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages, loadConfig, resetConfig, saveConfig } from "../../src/utils/config.js";
import { DEFAULT_CONFIG } from "../../src/utils/constants.js";

// Mock fs module
vi.mock("fs", () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

// Mock os module to provide consistent home directory
vi.mock("os", () => ({
    homedir: () => "/mock/home",
}));

// Expected config path (platform-independent)
const EXPECTED_CONFIG_PATH = join("/mock/home", ".merlinrc.json");

describe("loadConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns default config when file does not exist", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const config = loadConfig();

        expect(config).toEqual(DEFAULT_CONFIG);
        expect(existsSync).toHaveBeenCalledWith(EXPECTED_CONFIG_PATH);
    });

    it("returns default config when JSON is invalid", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue("invalid json {{{");

        const config = loadConfig();

        expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("merges valid user config with defaults", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                theme: "standard",
                maxSubjectLength: 50,
            })
        );

        const config = loadConfig();

        expect(config.theme).toBe("standard");
        expect(config.maxSubjectLength).toBe(50);
        expect(config.maxScopeLength).toBe(DEFAULT_CONFIG.maxScopeLength);
    });

    it("ignores invalid theme value", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                theme: "invalid-theme",
            })
        );

        const config = loadConfig();

        expect(config.theme).toBe(DEFAULT_CONFIG.theme);
    });

    it("ignores negative maxSubjectLength", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                maxSubjectLength: -10,
            })
        );

        const config = loadConfig();

        expect(config.maxSubjectLength).toBe(DEFAULT_CONFIG.maxSubjectLength);
    });

    it("ignores non-number maxSubjectLength", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                maxSubjectLength: "fifty",
            })
        );

        const config = loadConfig();

        expect(config.maxSubjectLength).toBe(DEFAULT_CONFIG.maxSubjectLength);
    });

    it("ignores empty editor string", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                editor: "   ",
            })
        );

        const config = loadConfig();

        expect(config.editor).toBe(DEFAULT_CONFIG.editor);
    });

    it("accepts valid editor string", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                editor: "code --wait",
            })
        );

        const config = loadConfig();

        expect(config.editor).toBe("code --wait");
    });

    it("ignores non-boolean autoAdd", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                autoAdd: "yes",
            })
        );

        const config = loadConfig();

        expect(config.autoAdd).toBe(DEFAULT_CONFIG.autoAdd);
    });

    it("accepts valid autoAdd boolean", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                autoAdd: true,
            })
        );

        const config = loadConfig();

        expect(config.autoAdd).toBe(true);
    });

    it("validates commit types array", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                types: [
                    {
                        value: "custom",
                        name: "Custom",
                        description: "A custom type",
                        emoji: "🎨",
                    },
                    { invalid: "type" }, // Should be filtered out
                    {
                        value: "another",
                        name: "Another",
                        description: "Another type",
                        emoji: "✨",
                    },
                ],
            })
        );

        const config = loadConfig();

        expect(config.types).toHaveLength(2);
        expect(config.types[0].value).toBe("custom");
        expect(config.types[1].value).toBe("another");
    });

    it("uses default types when all provided types are invalid", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                types: [{ invalid: "type" }, { also: "invalid" }],
            })
        );

        const config = loadConfig();

        expect(config.types).toEqual(DEFAULT_CONFIG.types);
    });

    it("ignores extra unknown properties", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({
                theme: "standard",
                unknownProperty: "should be ignored",
                anotherUnknown: 123,
            })
        );

        const config = loadConfig();

        expect(config.theme).toBe("standard");
        expect((config as Record<string, unknown>).unknownProperty).toBeUndefined();
    });
});

describe("getMessages", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns wizard messages for wizard theme", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ theme: "wizard" }));

        const messages = getMessages();

        expect(messages.commit.intro).toContain("Merlin");
    });

    it("returns standard messages for standard theme", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ theme: "standard" }));

        const messages = getMessages();

        expect(messages.commit.intro).toBe("Ready to create a commit");
    });
});

describe("saveConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("saves merged config to file", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        saveConfig({ theme: "standard" });

        expect(writeFileSync).toHaveBeenCalledWith(
            EXPECTED_CONFIG_PATH,
            expect.stringContaining('"theme": "standard"')
        );
    });

    it("merges with existing config", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ maxSubjectLength: 50 }));

        saveConfig({ theme: "standard" });

        const writtenContent = vi.mocked(writeFileSync).mock.calls[0][1] as string;
        const parsed = JSON.parse(writtenContent);

        expect(parsed.theme).toBe("standard");
        expect(parsed.maxSubjectLength).toBe(50);
    });
});

describe("resetConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes default config when file exists", () => {
        vi.mocked(existsSync).mockReturnValue(true);

        resetConfig();

        expect(writeFileSync).toHaveBeenCalledWith(
            EXPECTED_CONFIG_PATH,
            JSON.stringify(DEFAULT_CONFIG, null, 4)
        );
    });

    it("does nothing when file does not exist", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        resetConfig();

        expect(writeFileSync).not.toHaveBeenCalled();
    });
});
