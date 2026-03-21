import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editWithCommitEditMsg,
    editWithGitCommitMessage,
    validateEditorAvailable,
} from "../../src/lib/editor-wrapper.js";

vi.mock("child_process", () => ({
    spawnSync: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    return {
        ...actual,
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    };
});

describe("buildBreakingChangeTemplate", () => {
    it("returns template with comment lines", () => {
        const template = buildBreakingChangeTemplate();

        expect(template).toContain("# Describe the breaking change above this line.");
        expect(template).toContain("# Examples:");
        expect(template).toContain("# Lines starting with '#' will be ignored.");
    });

    it("starts with empty line for user input", () => {
        const template = buildBreakingChangeTemplate();
        const firstLine = template.split("\n")[0];

        expect(firstLine).toBe("");
    });

    it("mentions that BREAKING CHANGE prefix is added automatically", () => {
        const template = buildBreakingChangeTemplate();

        expect(template).toContain("prefix will be added automatically");
    });

    it("contains example breaking changes", () => {
        const template = buildBreakingChangeTemplate();

        expect(template).toContain("authentication tokens");
        expect(template).toContain("renamed to");
        expect(template).toContain("Config file format changed");
    });
});

describe("buildIssueReferenceTemplate", () => {
    it("returns template with comment lines", () => {
        const template = buildIssueReferenceTemplate();

        expect(template).toContain("# Reference related issues above this line.");
        expect(template).toContain("# Lines starting with '#' will be ignored.");
    });

    it("starts with empty line for user input", () => {
        const template = buildIssueReferenceTemplate();
        const firstLine = template.split("\n")[0];

        expect(firstLine).toBe("");
    });

    it("contains issue tracker keyword examples", () => {
        const template = buildIssueReferenceTemplate();

        expect(template).toContain("Fixes #123");
        expect(template).toContain("Closes #456");
        expect(template).toContain("Resolves #789");
        expect(template).toContain("Refs #101");
        expect(template).toContain("Related to #202");
    });

    it("shows multiple references example", () => {
        const template = buildIssueReferenceTemplate();

        expect(template).toContain("Fixes #123, Closes #456");
    });
});

describe("validateEditorAvailable", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns true when editor binary is found on PATH", () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0 } as never);

        const result = validateEditorAvailable("code --wait");

        expect(result).toBe(true);
    });

    it("returns false when editor binary is not found on PATH", () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 1 } as never);

        const result = validateEditorAvailable("nonexistent-editor");

        expect(result).toBe(false);
    });

    it("extracts binary name from command with args", () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0 } as never);

        validateEditorAvailable("code --wait --new-window");

        const [, checkedArgs] = vi.mocked(spawnSync).mock.calls[0];
        expect(checkedArgs).toEqual(["code"]);
    });
});

describe("editWithCommitEditMsg", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes template to COMMIT_EDITMSG and returns stripped result", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue(
            "User typed this\n# This is a comment\n# Another comment"
        );

        const result = editWithCommitEditMsg("# template", "vim", ".git");

        expect(writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining("COMMIT_EDITMSG"),
            "# template",
            "utf8"
        );
        expect(result).toBe("User typed this");
    });

    it("returns empty string when only comments are saved", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue(
            "# Comment line 1\n# Comment line 2\n# Comment line 3"
        );

        const result = editWithCommitEditMsg("# template", "vim", ".git");

        expect(result).toBe("");
    });

    it("preserves multi-line user content", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue(
            "First line\nSecond line\n# comment\nThird line"
        );

        const result = editWithCommitEditMsg("# template", "vim", ".git");

        expect(result).toBe("First line\nSecond line\nThird line");
    });

    it("trims whitespace from result", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("\n  User content  \n\n# comment\n\n");

        const result = editWithCommitEditMsg("# template", "vim", ".git");

        expect(result).toBe("User content");
    });

    it("passes file path as args array element to prevent shell injection", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        editWithCommitEditMsg("# template", "vim", ".git");

        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("vim");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("passes editor args as array even for multi-word editor commands", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        editWithCommitEditMsg("# template", "code --wait", ".git");

        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("code");
        expect(args).toContain("--wait");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("throws when editor fails to launch", () => {
        vi.mocked(spawnSync).mockReturnValue({
            error: new Error("ENOENT"),
        } as never);

        expect(() =>
            editWithCommitEditMsg("# template", "nonexistent-editor", ".git")
        ).toThrow("Failed to launch editor");
    });

    it("throws when editor exits with non-zero status", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 1,
            error: undefined,
        } as never);

        expect(() => editWithCommitEditMsg("# template", "vim", ".git")).toThrow(
            "Editor vim failed or was not found (exit code 1)"
        );
    });
});

describe("editWithGitCommitMessage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes template and returns stripped result", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue(
            "User body text\n# Type: feat\n# Subject: add feature\n"
        );

        const result = editWithGitCommitMessage(
            {
                type: "feat",
                subject: "add feature",
                stagedFiles: [{ status: "modified", path: "src/index.ts" }],
            },
            "vim",
            ".git"
        );

        expect(writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining("COMMIT_EDITMSG"),
            expect.any(String),
            "utf8"
        );
        expect(result).toBe("User body text");
    });

    it("passes file path as args array element to prevent shell injection", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        editWithGitCommitMessage(
            { type: "feat", subject: "test", stagedFiles: [] },
            "vim",
            ".git"
        );

        // Verify args are passed as array, not concatenated into bin string
        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("vim");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("passes editor args as array even for multi-word editor commands", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        editWithGitCommitMessage(
            { type: "feat", subject: "test", stagedFiles: [] },
            "code --wait",
            ".git"
        );

        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("code");
        expect(args).toContain("--wait");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("throws when editor fails to launch", () => {
        vi.mocked(spawnSync).mockReturnValue({
            error: new Error("ENOENT"),
        } as never);

        expect(() =>
            editWithGitCommitMessage(
                {
                    type: "feat",
                    subject: "test",
                    stagedFiles: [],
                },
                "nonexistent-editor",
                ".git"
            )
        ).toThrow("Failed to launch editor");
    });

    it("throws when editor exits with non-zero status", () => {
        vi.mocked(spawnSync).mockReturnValue({
            status: 1,
            error: undefined,
        } as never);

        expect(() =>
            editWithGitCommitMessage(
                {
                    type: "feat",
                    subject: "test",
                    stagedFiles: [],
                },
                "vim",
                ".git"
            )
        ).toThrow("Editor vim failed or was not found (exit code 1)");
    });
});
