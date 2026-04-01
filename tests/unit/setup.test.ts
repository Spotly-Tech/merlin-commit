import { existsSync } from "fs";
import { chmod, writeFile } from "fs/promises";
import { platform } from "node:os";
import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    return {
        ...actual,
        existsSync: vi.fn(),
    };
});

vi.mock("fs/promises", () => ({
    writeFile: vi.fn().mockResolvedValue(undefined),
    chmod: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("execa", () => ({
    execa: vi.fn(),
}));

vi.mock("node:os", () => ({
    platform: vi.fn(),
}));

describe("hasPackageJson", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns true if package.json exists", async () => {
        vi.mocked(existsSync).mockReturnValue(true);

        const result = await hasPackageJson();

        expect(result).toBe(true);
        expect(existsSync).toHaveBeenCalledWith("package.json");
    });

    it("returns false if package.json doesn't exist", async () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const result = await hasPackageJson();

        expect(result).toBe(false);
    });
});

describe("detectExistingSetup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns all false when nothing exists", async () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: false,
            commitMsgHook: false,
            commitlintConfig: false,
            merlinConfig: false,
        });
    });

    it("returns all true when everything exists", async () => {
        vi.mocked(existsSync).mockReturnValue(true);

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: true,
            commitMsgHook: true,
            commitlintConfig: true,
            merlinConfig: true,
        });
    });

    it("returns mixed result when partial setup exists", async () => {
        vi.mocked(existsSync).mockImplementation((path) => path === ".merlinrc.json");

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: false,
            commitMsgHook: false,
            commitlintConfig: false,
            merlinConfig: true,
        });
    });

    it("detects commitlint.config.js pattern", async () => {
        vi.mocked(existsSync).mockImplementation(
            (path) => path === "commitlint.config.js"
        );

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: false,
            commitMsgHook: false,
            commitlintConfig: true,
            merlinConfig: false,
        });
    });

    it("detects .commitlintrc pattern", async () => {
        vi.mocked(existsSync).mockImplementation((path) => path === ".commitlintrc");

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: false,
            commitMsgHook: false,
            commitlintConfig: true,
            merlinConfig: false,
        });
    });

    it("detects .commitlintrc.yml pattern", async () => {
        vi.mocked(existsSync).mockImplementation((path) => path === ".commitlintrc.yml");

        const result = await detectExistingSetup();

        expect(result).toEqual({
            husky: false,
            commitMsgHook: false,
            commitlintConfig: true,
            merlinConfig: false,
        });
    });
});

describe("installDependencies", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls execa with stdio: 'inherit' by default", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await installDependencies([
            "husky",
            "@commitlint/cli",
            "@commitlint/config-conventional",
        ]);

        expect(execa).toHaveBeenCalledWith(
            "npm",
            [
                "install",
                "--save-dev",
                "husky",
                "@commitlint/cli",
                "@commitlint/config-conventional",
            ],
            { stdio: "inherit" }
        );
    });

    it("calls execa with stdio: 'pipe' when silent", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await installDependencies(
            ["husky", "@commitlint/cli", "@commitlint/config-conventional"],
            { silent: true }
        );

        expect(execa).toHaveBeenCalledWith(
            "npm",
            [
                "install",
                "--save-dev",
                "husky",
                "@commitlint/cli",
                "@commitlint/config-conventional",
            ],
            { stdio: "pipe" }
        );
    });

    it("propagates error when npm install fails", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("npm installation failed"));

        await expect(
            installDependencies([
                "husky",
                "@commitlint/cli",
                "@commitlint/config-conventional",
            ])
        ).rejects.toThrow("npm installation failed");
    });
});

describe("initializeHusky", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("runs npx husky init", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await initializeHusky();

        expect(execa).toHaveBeenCalledWith("npx", ["husky", "init"], {
            stdio: "pipe",
        });
    });

    it("propagates error when husky init fails", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("husky init failed"));

        await expect(initializeHusky()).rejects.toThrow("husky init failed");
    });
});

describe("createCommitMsgHook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes hook file with correct content", async () => {
        vi.mocked(platform).mockReturnValue("win32");

        await createCommitMsgHook();

        expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining("commit-msg"),
            expect.stringContaining('npx --no-install commitlint --edit "$1"'),
            "utf-8"
        );
    });

    it("sets chmod 755 on Unix systems", async () => {
        vi.mocked(platform).mockReturnValue("linux");

        await createCommitMsgHook();

        expect(chmod).toHaveBeenCalledWith(expect.stringContaining("commit-msg"), 0o755);
    });

    it("skips chmod on Windows", async () => {
        vi.mocked(platform).mockReturnValue("win32");

        await createCommitMsgHook();

        expect(chmod).not.toHaveBeenCalled();
    });
});

describe("createCommitlintConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes ESM config file with conventional commits preset", async () => {
        await createCommitlintConfig();

        expect(writeFile).toHaveBeenCalledWith(
            "commitlint.config.js",
            "export default { extends: ['@commitlint/config-conventional'] };",
            "utf-8"
        );
    });
});

describe("checkGitAlias", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns alias value when it exists", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "!merlin" } as never);

        const result = await checkGitAlias();

        expect(result).toBe("!merlin");
        expect(execa).toHaveBeenCalledWith("git", ["config", "--get", "alias.merlin"]);
    });

    it("returns null when alias does not exist", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("not found"));

        const result = await checkGitAlias();

        expect(result).toBeNull();
    });

    it("returns null for empty stdout", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "   " } as never);

        const result = await checkGitAlias();

        expect(result).toBeNull();
    });
});

describe("setupGitAlias", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates global alias", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await setupGitAlias("global");

        expect(execa).toHaveBeenCalledWith("git", [
            "config",
            "--global",
            "alias.merlin",
            "!merlin",
        ]);
    });

    it("creates local alias", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await setupGitAlias("local");

        expect(execa).toHaveBeenCalledWith("git", [
            "config",
            "--local",
            "alias.merlin",
            "!merlin",
        ]);
    });
});

describe("createProjectConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes .merlinrc.json with default config values", async () => {
        await createProjectConfig();

        expect(writeFile).toHaveBeenCalledWith(
            ".merlinrc.json",
            expect.stringContaining('"theme"'),
            "utf-8"
        );
        expect(writeFile).toHaveBeenCalledWith(
            ".merlinrc.json",
            expect.stringContaining('"maxSubjectLength"'),
            "utf-8"
        );
        expect(writeFile).toHaveBeenCalledWith(
            ".merlinrc.json",
            expect.stringContaining('"maxScopeLength"'),
            "utf-8"
        );
    });

    it("formats JSON with 4-space indentation and trailing newline", async () => {
        await createProjectConfig();

        const writtenContent = vi.mocked(writeFile).mock.calls[0][1] as string;

        expect(writtenContent).toMatch(/^\{/);
        expect(writtenContent).toMatch(/\n$/);
        expect(writtenContent).toContain("    ");
    });
});

describe("isPackageInstalled", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns true when package exists in node_modules", async () => {
        vi.mocked(existsSync).mockReturnValue(true);

        const result = await isPackageInstalled("husky");

        expect(result).toBe(true);
        expect(existsSync).toHaveBeenCalledWith(expect.stringContaining("husky"));
    });

    it("returns false when package is missing from node_modules", async () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const result = await isPackageInstalled("nonexistent-package");

        expect(result).toBe(false);
    });
});
