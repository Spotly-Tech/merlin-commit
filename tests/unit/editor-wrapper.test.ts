import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { editor } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editorWithCommentTemplate,
    editorWithConfig,
    editWithGitCommitMessage,
} from "../../src/lib/editor-wrapper.js";
import { getGitDirectory } from "../../src/lib/git.js";

// Mock @inquirer/prompts editor
vi.mock("@inquirer/prompts", () => ({
    editor: vi.fn(),
}));

// Mock git.js to avoid real git operations (needed by editWithGitCommitMessage)
vi.mock("../../src/lib/git.js", () => ({
    getGitDirectory: vi.fn(),
    getStagedFilesWithStatus: vi.fn(),
}));

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

describe("editorWithCommentTemplate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("strips comment lines from editor result", async () => {
        vi.mocked(editor).mockResolvedValue(
            "User typed this\n# This is a comment\n# Another comment"
        );

        const result = await editorWithCommentTemplate("# template");

        expect(result).toBe("User typed this");
    });

    it("returns empty string when only comments are saved", async () => {
        vi.mocked(editor).mockResolvedValue(
            "# Comment line 1\n# Comment line 2\n# Comment line 3"
        );

        const result = await editorWithCommentTemplate("# template");

        expect(result).toBe("");
    });

    it("returns empty string when editor returns empty content", async () => {
        vi.mocked(editor).mockResolvedValue("");

        const result = await editorWithCommentTemplate("# template");

        expect(result).toBe("");
    });

    it("preserves multi-line user content", async () => {
        vi.mocked(editor).mockResolvedValue(
            "First line\nSecond line\n# comment\nThird line"
        );

        const result = await editorWithCommentTemplate("# template");

        expect(result).toBe("First line\nSecond line\nThird line");
    });

    it("trims whitespace from result", async () => {
        vi.mocked(editor).mockResolvedValue("\n  User content  \n\n# comment\n\n");

        const result = await editorWithCommentTemplate("# template");

        expect(result).toBe("User content");
    });

    it("passes template as default option to editor", async () => {
        const template = "# My template content";
        vi.mocked(editor).mockResolvedValue("");

        await editorWithCommentTemplate(template);

        expect(editor).toHaveBeenCalledWith(
            expect.objectContaining({
                default: template,
                waitForUserInput: false,
            })
        );
    });
});

describe("editorWithConfig", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls editor with provided options when no custom editor", async () => {
        vi.mocked(editor).mockResolvedValue("user input");

        const result = await editorWithConfig({ message: "Enter text:" });

        expect(result).toBe("user input");
        expect(editor).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Enter text:" })
        );
    });

    it("skips cmd wrapping when editor already starts with cmd on Windows", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        let capturedVisual: string | undefined;
        vi.mocked(editor).mockImplementation(async () => {
            capturedVisual = process.env.VISUAL;
            return "result";
        });

        await editorWithConfig({ message: "test" }, "cmd /c notepad");

        // Should NOT double-wrap with cmd /c
        expect(capturedVisual).toBe("cmd /c notepad");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("wraps non-cmd editor with cmd /c on Windows", async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, "platform", { value: "win32" });

        let capturedVisual: string | undefined;
        vi.mocked(editor).mockImplementation(async () => {
            capturedVisual = process.env.VISUAL;
            return "result";
        });

        await editorWithConfig({ message: "test" }, "code --wait");

        expect(capturedVisual).toBe("cmd /c code --wait");

        Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("restores environment variables after using custom editor", async () => {
        const originalVisual = process.env.VISUAL;
        const originalEditor = process.env.EDITOR;

        vi.mocked(editor).mockResolvedValue("result");

        await editorWithConfig({ message: "test" }, "nano");

        expect(process.env.VISUAL).toBe(originalVisual);
        expect(process.env.EDITOR).toBe(originalEditor);
    });
});

describe("editWithGitCommitMessage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("writes template and returns stripped result", async () => {
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue(
            "User body text\n# Type: feat\n# Subject: add feature\n"
        );

        const result = await editWithGitCommitMessage(
            {
                type: "feat",
                subject: "add feature",
                stagedFiles: [{ status: "modified", path: "src/index.ts" }],
            },
            "vim"
        );

        expect(writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining("COMMIT_EDITMSG"),
            expect.any(String),
            "utf8"
        );
        expect(result).toBe("User body text");
    });

    it("passes file path as args array element to prevent shell injection", async () => {
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        await editWithGitCommitMessage(
            { type: "feat", subject: "test", stagedFiles: [] },
            "vim"
        );

        // Verify args are passed as array, not concatenated into bin string
        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("vim");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("passes editor args as array even for multi-word editor commands", async () => {
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(spawnSync).mockReturnValue({
            status: 0,
            error: undefined,
        } as never);
        vi.mocked(readFileSync).mockReturnValue("body\n");

        await editWithGitCommitMessage(
            { type: "feat", subject: "test", stagedFiles: [] },
            "code --wait"
        );

        const [bin, args] = vi.mocked(spawnSync).mock.calls[0];
        expect(bin).toBe("code");
        expect(args).toContain("--wait");
        expect(args).toEqual(
            expect.arrayContaining([expect.stringContaining("COMMIT_EDITMSG")])
        );
    });

    it("throws when editor fails to launch", async () => {
        vi.mocked(getGitDirectory).mockResolvedValue(".git");
        vi.mocked(spawnSync).mockReturnValue({
            error: new Error("ENOENT"),
        } as never);

        await expect(
            editWithGitCommitMessage(
                {
                    type: "feat",
                    subject: "test",
                    stagedFiles: [],
                },
                "nonexistent-editor"
            )
        ).rejects.toThrow("Failed to launch editor");
    });
});
