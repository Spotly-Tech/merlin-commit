import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMessages, loadConfig } from "../../src/lib/config-loader.js";
import { getRepoRoot } from "../../src/lib/git.js";
import { DEFAULT_CONFIG, STANDARD_MESSAGES, WIZARD_MESSAGES } from "../../src/utils/constants.js";

vi.mock("../../src/lib/git.js", () => ({
    getRepoRoot: vi.fn(),
}));

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
    describe("loadConfig", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("returns DEFAULT_CONFIG when no user config and no repo", async () => {
            vi.mocked(existsSync).mockReturnValue(false);
            vi.mocked(getRepoRoot).mockResolvedValue(null);

            const config = await loadConfig();

            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it("merges user config with defaults when not in a repo", async () => {
            vi.mocked(getRepoRoot).mockResolvedValue(null);
            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath === USER_CONFIG_PATH
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard", maxSubjectLength: 50 })
            );

            const config = await loadConfig();

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(50);
            expect(config.maxScopeLength).toBe(DEFAULT_CONFIG.maxScopeLength);
        });

        it("merges project config with defaults when user config is missing", async () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(getRepoRoot).mockResolvedValue(repoRoot);
            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath === projectConfigPath
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard", maxSubjectLength: 60 })
            );

            const config = await loadConfig();

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(60);
            expect(config.maxScopeLength).toBe(DEFAULT_CONFIG.maxScopeLength);
        });

        it("project config overrides user config for the same field", async () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(getRepoRoot).mockResolvedValue(repoRoot);
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

            const config = await loadConfig();

            expect(config.theme).toBe("wizard");
        });

        it("merges non-overlapping fields from both configs", async () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(getRepoRoot).mockResolvedValue(repoRoot);
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

            const config = await loadConfig();

            expect(config.maxSubjectLength).toBe(50);
            expect(config.editor).toBe("nano");
            expect(config.theme).toBe(DEFAULT_CONFIG.theme);
        });

        it("falls back to user config and defaults when project config has invalid JSON", async () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(getRepoRoot).mockResolvedValue(repoRoot);
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

            const config = await loadConfig();

            expect(config.theme).toBe("standard");
            expect(config.maxSubjectLength).toBe(DEFAULT_CONFIG.maxSubjectLength);
        });

        it("uses user config and defaults when project config file is missing", async () => {
            const repoRoot = "/mock/repo";
            const projectConfigPath = join(repoRoot, ".merlinrc.json");

            vi.mocked(getRepoRoot).mockResolvedValue(repoRoot);
            vi.mocked(existsSync).mockImplementation(
                (filePath) => filePath !== projectConfigPath
            );
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard" })
            );

            const config = await loadConfig();

            expect(config.theme).toBe("standard");
        });
    });

    describe("getMessages", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("returns wizard messages when merged theme is wizard", async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(getRepoRoot).mockResolvedValue(null);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "wizard" })
            );

            const messages = await getMessages();

            expect(messages).toBe(WIZARD_MESSAGES);
        });

        it("returns standard messages when merged theme is standard", async () => {
            vi.mocked(existsSync).mockReturnValue(true);
            vi.mocked(getRepoRoot).mockResolvedValue(null);
            vi.mocked(readFileSync).mockReturnValue(
                JSON.stringify({ theme: "standard" })
            );

            const messages = await getMessages();

            expect(messages).toBe(STANDARD_MESSAGES);
        });
    });
});
