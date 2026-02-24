import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    addFiles,
    amendCommit,
    commit,
    getGitDirectory,
    getRepoRoot,
    getStagedFilesWithStatus,
    getUnstagedFiles,
    hasStagedChanges,
    isGitRepo,
} from "../../src/lib/git.js";

import { execa } from "execa";

// Mock execa
vi.mock("execa", () => ({
    execa: vi.fn(),
}));

describe("isGitRepo", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns true when in a git repository", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: ".git" } as never);

        const result = await isGitRepo();

        expect(result).toBe(true);
        expect(execa).toHaveBeenCalledWith("git", ["rev-parse", "--git-dir"]);
    });

    it("returns false when not in a git repository", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("not a git repo"));

        const result = await isGitRepo();

        expect(result).toBe(false);
    });
});

describe("hasStagedChanges", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns true when there are staged changes", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "src/file.ts\npackage.json",
        } as never);

        const result = await hasStagedChanges();

        expect(result).toBe(true);
        expect(execa).toHaveBeenCalledWith("git", ["diff", "--cached", "--name-only"]);
    });

    it("returns false when there are no staged changes", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "" } as never);

        const result = await hasStagedChanges();

        expect(result).toBe(false);
    });

    it("returns false when there are only whitespace", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "   \n  " } as never);

        const result = await hasStagedChanges();

        expect(result).toBe(false);
    });

    it("returns false on git error", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("git error"));

        const result = await hasStagedChanges();

        expect(result).toBe(false);
    });
});

describe("getUnstagedFiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns list of unstaged files", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "file1.ts\nfile2.ts\nfile3.ts",
        } as never);

        const result = await getUnstagedFiles();

        expect(result).toEqual(["file1.ts", "file2.ts", "file3.ts"]);
        expect(execa).toHaveBeenCalledWith("git", ["diff", "--name-only"]);
    });

    it("returns empty array when no unstaged files", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "" } as never);

        const result = await getUnstagedFiles();

        expect(result).toEqual([]);
    });

    it("filters out empty lines", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "file1.ts\n\nfile2.ts\n" } as never);

        const result = await getUnstagedFiles();

        expect(result).toEqual(["file1.ts", "file2.ts"]);
    });

    it("returns empty array on git error", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("git error"));

        const result = await getUnstagedFiles();

        expect(result).toEqual([]);
    });
});

describe("addFiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("stages specified files", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await addFiles(["src/file.ts", "package.json"]);

        expect(execa).toHaveBeenCalledWith("git", ["add", "src/file.ts", "package.json"]);
    });

    it("stages all files with dot", async () => {
        vi.mocked(execa).mockResolvedValue({} as never);

        await addFiles(["."]);

        expect(execa).toHaveBeenCalledWith("git", ["add", "."]);
    });

    it("throws error when git add fails", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("permission denied"));

        await expect(addFiles(["file.ts"])).rejects.toThrow("permission denied");
    });
});

describe("commit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates commit with message and returns git output", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "[main abc1234] feat: add new feature",
        } as never);

        const result = await commit("feat: add new feature");

        expect(result).toBe("[main abc1234] feat: add new feature");
        expect(execa).toHaveBeenCalledWith("git", ["commit", "-m", "feat: add new feature"]);
    });

    it("creates commit with --no-verify flag", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "[main def5678] fix: urgent fix",
        } as never);

        const result = await commit("fix: urgent fix", true);

        expect(result).toBe("[main def5678] fix: urgent fix");
        expect(execa).toHaveBeenCalledWith("git", [
            "commit",
            "-m",
            "fix: urgent fix",
            "--no-verify",
        ]);
    });

    it("throws error when commit fails", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("commit failed"));

        await expect(commit("feat: feature")).rejects.toThrow("commit failed");
    });
});

describe("amendCommit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("amends commit with new message and returns git output", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "[main abc1234] feat: improved feature",
        } as never);

        const result = await amendCommit("feat: improved feature");

        expect(result).toBe("[main abc1234] feat: improved feature");
        expect(execa).toHaveBeenCalledWith("git", [
            "commit",
            "--amend",
            "-m",
            "feat: improved feature",
        ]);
    });

    it("amends commit with --no-verify flag", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "[main def5678] fix: corrected fix",
        } as never);

        const result = await amendCommit("fix: corrected fix", true);

        expect(result).toBe("[main def5678] fix: corrected fix");
        expect(execa).toHaveBeenCalledWith("git", [
            "commit",
            "--amend",
            "-m",
            "fix: corrected fix",
            "--no-verify",
        ]);
    });

    it("throws error when amend fails", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("nothing to amend"));

        await expect(amendCommit("feat: feature")).rejects.toThrow("nothing to amend");
    });
});

describe("getRepoRoot", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns trimmed repository root path on success", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "/home/user/project\n",
        } as never);

        const result = await getRepoRoot();

        expect(result).toBe("/home/user/project");
        expect(execa).toHaveBeenCalledWith("git", ["rev-parse", "--show-toplevel"]);
    });

    it("returns null when not in a git repository", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("not a git repo"));

        const result = await getRepoRoot();

        expect(result).toBeNull();
    });
});

describe("getGitDirectory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns trimmed git directory path", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: ".git\n" } as never);

        const result = await getGitDirectory();

        expect(result).toBe(".git");
        expect(execa).toHaveBeenCalledWith("git", ["rev-parse", "--git-dir"]);
    });

    it("throws when not in a git repository", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("not a git repo"));

        await expect(getGitDirectory()).rejects.toThrow("not a git repo");
    });
});

describe("getStagedFilesWithStatus", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("parses multiple file statuses correctly", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "M\tsrc/index.ts\nA\tsrc/new-file.ts\nD\told-file.ts",
        } as never);

        const result = await getStagedFilesWithStatus();

        expect(result).toEqual([
            { status: "modified", path: "src/index.ts" },
            { status: "new file", path: "src/new-file.ts" },
            { status: "deleted", path: "old-file.ts" },
        ]);
        expect(execa).toHaveBeenCalledWith("git", ["diff", "--cached", "--name-status"]);
    });

    it("returns empty array when no staged files", async () => {
        vi.mocked(execa).mockResolvedValue({ stdout: "" } as never);

        const result = await getStagedFilesWithStatus();

        expect(result).toEqual([]);
    });

    it("returns empty array on git error", async () => {
        vi.mocked(execa).mockRejectedValue(new Error("git error"));

        const result = await getStagedFilesWithStatus();

        expect(result).toEqual([]);
    });

    it("defaults unknown status codes to modified", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "X\tunknown-status.ts",
        } as never);

        const result = await getStagedFilesWithStatus();

        expect(result).toEqual([{ status: "modified", path: "unknown-status.ts" }]);
    });
});
