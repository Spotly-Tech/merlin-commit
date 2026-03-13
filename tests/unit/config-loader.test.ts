import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    clearConfig,
    getMessages,
    loadConfig,
    loadUserConfig,
    persistConfig,
    resetConfig,
    saveConfig,
} from "../../src/lib/config-loader.js";
import {
    DEFAULT_CONFIG,
    STANDARD_MESSAGES,
    WIZARD_MESSAGES,
} from "../../src/utils/constants.js";

vi.mock("fs", () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

vi.mock("os", () => ({
    homedir: () => "/mock/home",
}));

const USER_CONFIG_PATH = join("/mock/home", ".merlinrc.json");

describe("config-loader", () => {
    describe("loadUserConfig", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("returns empty object when config file does not exist", () => {
            vi.mocked(existsSync).mockReturnValue(false);

            const config = loadUserConfig();

            expect(config).toEqual({});
        });

        it("returns validated partial config from existing file", () => {
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

            expect(existsSync).toHaveBeenCalledWith(USER_CONFIG_PATH);
        });

        it("emits console.warn and returns empty object when JSON is invalid", () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue("not valid json");
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            const config = loadUserConfig();

            expect(config).toEqual({});
            expect(warnSpy).toHaveBeenCalledWith(
                "merlin: ~/.merlinrc.json could not be parsed - using defaults"
            );
            warnSpy.mockRestore();
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
                USER_CONFIG_PATH,
                expect.stringContaining('"theme": "standard"')
            );
        });

        it("merges with existing config", () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ maxSubjectLength: 50 })
            );

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
                USER_CONFIG_PATH,
                JSON.stringify(DEFAULT_CONFIG, null, 4)
            );
        });

        it("does nothing when file does not exist", () => {
            vi.mocked(existsSync).mockReturnValue(false);

            resetConfig();

            expect(writeFileSync).not.toHaveBeenCalled();
        });
    });

    describe("loadConfig", () => {
        let savedEditor: string | undefined;
        let savedVisual: string | undefined;

        beforeEach(() => {
            vi.clearAllMocks();
            savedEditor = process.env.EDITOR;
            savedVisual = process.env.VISUAL;
            delete process.env.EDITOR;
            delete process.env.VISUAL;
        });

        afterEach(() => {
            if (savedEditor !== undefined) {
                process.env.EDITOR = savedEditor;
            } else {
                delete process.env.EDITOR;
            }
            if (savedVisual !== undefined) {
                process.env.VISUAL = savedVisual;
            } else {
                delete process.env.VISUAL;
            }
        });

        it("returns DEFAULT_CONFIG when no user config and no repo", () => {
            vi.mocked(existsSync).mockReturnValue(false);

            const config = loadConfig();

            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it("merges user config with defaults when not in a repo", () => {
            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath === USER_CONFIG_PATH
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard", maxSubjectLength: 50 })
            );

            const config = loadConfig();

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(50);
            expect(config.maxScopeLength).toBe(DEFAULT_CONFIG.maxScopeLength);
        });

        it("merges project config with defaults when user config is missing", () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath === projectConfigPath
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard", maxSubjectLength: 60 })
            );

            const config = loadConfig(repoRoot);

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(60);
            expect(config.maxScopeLength).toBe(DEFAULT_CONFIG.maxScopeLength);
        });

        it("project config overrides user config for the same field", () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation((filePath) => {
                if (filePath === USER_CONFIG_PATH) {
                    return JSON.stringify({ theme: "standard" });
                }
                if (filePath === projectConfigPath) {
                    return JSON.stringify({ theme: "wizard" });
                }
                return "{}";
            });

            const config = loadConfig(repoRoot);

            expect(config.theme).toBe("wizard");
        });

        it("merges non-overlapping fields from both configs", () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation((filePath) => {
                if (filePath === USER_CONFIG_PATH) {
                    return JSON.stringify({ maxSubjectLength: 50 });
                }
                if (filePath === projectConfigPath) {
                    return JSON.stringify({ editor: "nano" });
                }
                return "{}";
            });

            const config = loadConfig(repoRoot);

            expect(config.maxSubjectLength).toBe(50);
            expect(config.editor).toBe("nano");
            expect(config.theme).toBe(DEFAULT_CONFIG.theme);
        });

        it("falls back to user config and defaults when project config has invalid JSON", () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockImplementation((filePath) => {
                if (filePath === USER_CONFIG_PATH) {
                    return JSON.stringify({ theme: "standard" });
                }
                if (filePath === projectConfigPath) {
                    return "invalid json {{{";
                }
                return "{}";
            });

            const config = loadConfig(repoRoot);

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(DEFAULT_CONFIG.maxSubjectLength);
        });

        it("uses user config and defaults when project config file is missing", () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath !== projectConfigPath
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard" })
            );

            const config = loadConfig(repoRoot);

            expect(config.theme).toBe("standard");
        });

        describe("editor resolution", () => {
            it("uses EDITOR env var when set and no editor in user or project config", () => {
                process.env.EDITOR = "code";
                vi.mocked(existsSync).mockReturnValue(false);

                const config = loadConfig();

                expect(config.editor).toBe("code");
            });

            it("uses VISUAL env var when EDITOR is not set", () => {
                process.env.VISUAL = "nano";
                vi.mocked(existsSync).mockReturnValue(false);

                const config = loadConfig();

                expect(config.editor).toBe("nano");
            });

            it("falls back to platform default when no env vars are set", () => {
                vi.mocked(existsSync).mockReturnValue(false);
                const expectedEditor = process.platform === "win32" ? "notepad" : "vim";

                const config = loadConfig();

                expect(config.editor).toBe(expectedEditor);
            });

            it("user config editor takes precedence over env vars", () => {
                process.env.EDITOR = "code";
                vi.mocked(existsSync).mockReturnValue(true);
                vi.mocked(readFileSync).mockReturnValue(
                    JSON.stringify({ editor: "emacs" })
                );

                const config = loadConfig();

                expect(config.editor).toBe("emacs");
            });
        });
    });

    describe("persistConfig", () => {
        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));
        });

        it("writes the merged config to the user config file", () => {
            persistConfig({ theme: "standard" });

            expect(writeFileSync).toHaveBeenCalledWith(
                USER_CONFIG_PATH,
                expect.stringContaining('"theme": "standard"')
            );
        });

        it("merges the provided fields with DEFAULT_CONFIG", () => {
            persistConfig({ maxSubjectLength: 50 });

            const writtenJson = vi.mocked(writeFileSync).mock.calls[0][1] as string;
            const written = JSON.parse(writtenJson);

            expect(written.maxSubjectLength).toBe(50);
            expect(written.theme).toBeDefined();
        });

        it("writes multiple fields in a single call", () => {
            persistConfig({ theme: "standard", autoAdd: true });

            const writtenJson = vi.mocked(writeFileSync).mock.calls[0][1] as string;
            const written = JSON.parse(writtenJson);

            expect(written.theme).toBe("standard");
            expect(written.autoAdd).toBe(true);
        });
    });

    describe("clearConfig", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("writes DEFAULT_CONFIG to the user config file when it exists", () => {
            vi.mocked(existsSync).mockReturnValue(true);

            clearConfig();

            expect(writeFileSync).toHaveBeenCalledWith(
                USER_CONFIG_PATH,
                expect.any(String)
            );
        });

        it("does not write when user config file does not exist", () => {
            vi.mocked(existsSync).mockReturnValue(false);

            clearConfig();

            expect(writeFileSync).not.toHaveBeenCalled();
        });
    });

    describe("getMessages", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("returns wizard messages when merged theme is wizard", () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ theme: "wizard" }));

            const messages = getMessages();

            expect(messages).toBe(WIZARD_MESSAGES);
        });

        it("returns standard messages when merged theme is standard", () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard" })
            );

            const messages = getMessages();

            expect(messages).toBe(STANDARD_MESSAGES);
        });
    });
});
