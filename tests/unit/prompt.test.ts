import { beforeEach, describe, expect, it, vi } from "vitest";
import { promptUser } from "../../src/lib/prompt.js";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

import { confirm, input, select } from "@inquirer/prompts";
import { loadConfig, getMessages } from "../../src/lib/config-loader";
import {
    editorWithCommentTemplate,
    editWithGitCommitMessage,
} from "../../src/lib/editor-wrapper";
import { getStagedFilesWithStatus } from "../../src/lib/git";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "../../src/lib/transformers";

vi.mock("@inquirer/prompts", () => ({
    confirm: vi.fn(),
    input: vi.fn(),
    select: vi.fn(),
}));

vi.mock("../../src/lib/config-loader", () => ({
    loadConfig: vi.fn(),
    getMessages: vi.fn(),
}));

vi.mock("../../src/lib/editor-wrapper", () => ({
    buildBreakingChangeTemplate: vi.fn().mockReturnValue("breaking template"),
    buildIssueReferenceTemplate: vi.fn().mockReturnValue("issue template"),
    editorWithCommentTemplate: vi.fn(),
    editWithGitCommitMessage: vi.fn(),
}));

vi.mock("../../src/lib/git", () => ({
    getStagedFilesWithStatus: vi.fn(),
}));

vi.mock("../../src/lib/transformers", () => ({
    createCharacterCounterTransformer: vi.fn().mockReturnValue(vi.fn()),
    createOptionalCharacterCounterTransformer: vi.fn().mockReturnValue(vi.fn()),
}));

/**
 * Sets up mocks for a minimal prompt flow (no body, no breaking, no issues).
 */
function setupMinimalFlow() {
    vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
    vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);

    // select: commit type
    vi.mocked(select).mockResolvedValueOnce("feat");

    // input: scope, then subject
    vi.mocked(input)
        .mockResolvedValueOnce("core") // scope
        .mockResolvedValueOnce("add new feature"); // subject

    // confirm: body? no, breaking? no, issues? no
    vi.mocked(confirm)
        .mockResolvedValueOnce(false) // body
        .mockResolvedValueOnce(false) // breaking
        .mockResolvedValueOnce(false); // issues
}

describe("promptUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("basic flow", () => {
        it("returns correct CommitAnswers shape from minimal input", async () => {
            setupMinimalFlow();

            const answers = await promptUser();

            expect(answers).toEqual({
                type: "feat",
                scope: "core",
                subject: "add new feature",
            });
        });

        it("loads config and messages", async () => {
            setupMinimalFlow();

            await promptUser();

            expect(loadConfig).toHaveBeenCalled();
            expect(getMessages).toHaveBeenCalled();
        });

        it("uses config types as select choices", async () => {
            setupMinimalFlow();

            await promptUser();

            expect(select).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: WIZARD_MESSAGES.prompts.type,
                    choices: expect.arrayContaining([
                        expect.objectContaining({ value: "feat" }),
                    ]),
                })
            );
        });

        it("applies character counter transformer to scope", async () => {
            setupMinimalFlow();

            await promptUser();

            expect(createOptionalCharacterCounterTransformer).toHaveBeenCalledWith(
                DEFAULT_CONFIG.maxScopeLength
            );
        });

        it("applies character counter transformer to subject", async () => {
            setupMinimalFlow();

            await promptUser();

            expect(createCharacterCounterTransformer).toHaveBeenCalledWith(
                DEFAULT_CONFIG.maxSubjectLength
            );
        });
    });

    describe("scope handling", () => {
        it("includes scope in answers when provided", async () => {
            setupMinimalFlow();

            const answers = await promptUser();

            expect(answers.scope).toBe("core");
        });

        it("sets empty scope when user enters nothing", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("") // empty scope
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false);

            const answers = await promptUser();

            expect(answers.scope).toBe("");
        });
    });

    describe("body flow", () => {
        it("opens editor when user confirms body", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("api")
                .mockResolvedValueOnce("add endpoint");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // wants body
                .mockResolvedValueOnce(false) // no breaking
                .mockResolvedValueOnce(false); // no issues
            vi.mocked(getStagedFilesWithStatus).mockResolvedValue([]);
            vi.mocked(editWithGitCommitMessage).mockResolvedValue("detailed body text");

            const answers = await promptUser();

            expect(editWithGitCommitMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "feat",
                    scope: "api",
                    subject: "add endpoint",
                    stagedFiles: [],
                }),
                DEFAULT_CONFIG.editor
            );
            expect(answers.body).toBe("detailed body text");
        });

        it("does not set body when user declines", async () => {
            setupMinimalFlow();

            const answers = await promptUser();

            expect(editWithGitCommitMessage).not.toHaveBeenCalled();
            expect(answers.body).toBeUndefined();
        });
    });

    describe("breaking changes flow", () => {
        it("opens editor and sets breaking when user confirms", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false) // no body
                .mockResolvedValueOnce(true) // has breaking
                .mockResolvedValueOnce(false); // no issues
            vi.mocked(editorWithCommentTemplate).mockResolvedValue("removed endpoint");

            const answers = await promptUser();

            expect(editorWithCommentTemplate).toHaveBeenCalled();
            expect(answers.breaking).toBe("removed endpoint");
        });

        it("strips BREAKING CHANGE: prefix to prevent duplication", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            vi.mocked(editorWithCommentTemplate).mockResolvedValue(
                "BREAKING CHANGE: removed old endpoint"
            );

            const answers = await promptUser();

            expect(answers.breaking).toBe("removed old endpoint");
        });

        it("does not set breaking when editor returns empty", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            vi.mocked(editorWithCommentTemplate).mockResolvedValue("");

            const answers = await promptUser();

            expect(answers.breaking).toBeUndefined();
        });

        it("does not open editor when user declines breaking", async () => {
            setupMinimalFlow();

            const answers = await promptUser();

            expect(answers.breaking).toBeUndefined();
        });
    });

    describe("issues flow", () => {
        it("opens editor and sets issues when user confirms", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false) // no body
                .mockResolvedValueOnce(false) // no breaking
                .mockResolvedValueOnce(true); // has issues
            vi.mocked(editorWithCommentTemplate).mockResolvedValue("fixes #123");

            const answers = await promptUser();

            expect(editorWithCommentTemplate).toHaveBeenCalled();
            expect(answers.issues).toBe("fixes #123");
        });

        it("does not set issues when editor returns empty", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);
            vi.mocked(editorWithCommentTemplate).mockResolvedValue("");

            const answers = await promptUser();

            expect(answers.issues).toBeUndefined();
        });

        it("does not open editor when user declines issues", async () => {
            setupMinimalFlow();

            const answers = await promptUser();

            expect(answers.issues).toBeUndefined();
        });
    });

    describe("full flow with all fields", () => {
        it("returns complete CommitAnswers with all optional fields", async () => {
            vi.mocked(loadConfig).mockResolvedValue({ ...DEFAULT_CONFIG });
            vi.mocked(getMessages).mockResolvedValue(WIZARD_MESSAGES);
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("auth")
                .mockResolvedValueOnce("add login flow");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // body
                .mockResolvedValueOnce(true) // breaking
                .mockResolvedValueOnce(true); // issues
            vi.mocked(getStagedFilesWithStatus).mockResolvedValue([]);
            vi.mocked(editWithGitCommitMessage).mockResolvedValue("Added OAuth2 login");
            vi.mocked(editorWithCommentTemplate)
                .mockResolvedValueOnce("old session API removed")
                .mockResolvedValueOnce("closes #42, #43");

            const answers = await promptUser();

            expect(answers).toEqual({
                type: "feat",
                scope: "auth",
                subject: "add login flow",
                body: "Added OAuth2 login",
                breaking: "old session API removed",
                issues: "closes #42, #43",
            });
        });
    });
});
