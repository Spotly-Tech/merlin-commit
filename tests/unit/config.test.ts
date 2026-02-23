import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    loadUserConfig,
    resetConfig,
    saveConfig,
    validateConfig,
} from "../../src/utils/config.js";
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

describe("validateConfig", () => {
    it("returns empty object for null input", () => {
        const result = validateConfig(null);

        expect(result).toEqual({});
    });

    it("returns empty object for non-object input", () => {
        expect(validateConfig("string")).toEqual({});
        expect(validateConfig(42)).toEqual({});
        expect(validateConfig(true)).toEqual({});
        expect(validateConfig(undefined)).toEqual({});
    });

    it("returns empty object for empty object input", () => {
        const result = validateConfig({});

        expect(result).toEqual({});
    });

    it("validates and returns only recognized fields", () => {
        const result = validateConfig({
            theme: "standard",
            maxSubjectLength: 50,
            unknownField: "ignored",
        });

        expect(result).toEqual({ theme: "standard", maxSubjectLength: 50 });
        expect((result as Record<string, unknown>).unknownField).toBeUndefined();
    });

    it("rejects invalid theme values", () => {
        const result = validateConfig({ theme: "dark" });

        expect(result.theme).toBeUndefined();
    });

    it("rejects zero and negative maxSubjectLength", () => {
        expect(validateConfig({ maxSubjectLength: 0 })).toEqual({});
        expect(validateConfig({ maxSubjectLength: -5 })).toEqual({});
    });

    it("rejects zero and negative maxScopeLength", () => {
        expect(validateConfig({ maxScopeLength: 0 })).toEqual({});
        expect(validateConfig({ maxScopeLength: -1 })).toEqual({});
    });

    it("accepts valid positive maxScopeLength", () => {
        const result = validateConfig({ maxScopeLength: 30 });

        expect(result.maxScopeLength).toBe(30);
    });

    it("accepts valid autoAdd boolean", () => {
        const resultTrue = validateConfig({ autoAdd: true });
        const resultFalse = validateConfig({ autoAdd: false });

        expect(resultTrue.autoAdd).toBe(true);
        expect(resultFalse.autoAdd).toBe(false);
    });

    it("filters valid commit types and ignores invalid ones", () => {
        const result = validateConfig({
            types: [
                {
                    value: "feat",
                    name: "Feature",
                    description: "A new feature",
                    emoji: "✨",
                },
                { invalid: "missing fields" },
                {
                    value: "fix",
                    name: "Bug Fix",
                    description: "A bug fix",
                    emoji: "🐛",
                },
            ],
        });

        expect(result.types).toHaveLength(2);
        expect(result.types![0].value).toBe("feat");
        expect(result.types![1].value).toBe("fix");
    });

    it("omits types field when all entries are invalid", () => {
        const result = validateConfig({
            types: [{ invalid: "type" }, { also: "invalid" }],
        });

        expect(result.types).toBeUndefined();
    });

    it("omits types field for empty array", () => {
        const result = validateConfig({ types: [] });

        expect(result.types).toBeUndefined();
    });
});

describe("loadUserConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty object when config file does not exist", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const config = loadUserConfig();

        expect(config).toEqual({});
    });

    it("returns empty object when JSON is invalid", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue("not valid json");

        const config = loadUserConfig();

        expect(config).toEqual({});
    });

    it("returns validated partial config without defaults merge", () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ theme: "standard", maxSubjectLength: 50 })
        );

        const config = loadUserConfig();

        expect(config).toEqual({ theme: "standard", maxSubjectLength: 50 });
        expect(config.maxScopeLength).toBeUndefined();
        expect(config.editor).toBeUndefined();
    });

    it("reads from the correct path", () => {
        vi.mocked(existsSync).mockReturnValue(false);

        loadUserConfig();

        expect(existsSync).toHaveBeenCalledWith(EXPECTED_CONFIG_PATH);
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
