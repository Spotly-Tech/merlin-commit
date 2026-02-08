import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildBreakingChangeTemplate,
    buildIssueReferenceTemplate,
    editorWithCommentTemplate,
} from "../../src/lib/editor-wrapper.js";

// Mock @inquirer/prompts editor
vi.mock("@inquirer/prompts", () => ({
    editor: vi.fn(),
}));

// Mock git.js to avoid real git operations (needed by editWithGitCommitMessage)
vi.mock("../../src/lib/git.js", () => ({
    getGitDirectory: vi.fn(),
    getStagedFilesWithStatus: vi.fn(),
}));

import { editor } from "@inquirer/prompts";

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
        vi.mocked(editor).mockResolvedValue(
            "\n  User content  \n\n# comment\n\n"
        );

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
