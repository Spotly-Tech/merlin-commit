import { confirm, input, select } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { promptUser, type PromptDependencies } from "../../src/lib/prompt.js";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "../../src/lib/transformers";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

vi.mock("@inquirer/prompts", () => ({
    confirm: vi.fn(),
    input: vi.fn(),
    select: vi.fn(),
}));

vi.mock("../../src/lib/transformers", () => ({
    createCharacterCounterTransformer: vi.fn().mockReturnValue(vi.fn()),
    createOptionalCharacterCounterTransformer: vi.fn().mockReturnValue(vi.fn()),
}));

/**
 * Creates a PromptDependencies object with default mocks.
 * Individual tests can override specific mock functions.
 */
function createMockDependencies(
    overrides?: Partial<PromptDependencies>
): PromptDependencies {
    return {
        config: { ...DEFAULT_CONFIG },
        messages: WIZARD_MESSAGES,
        getStagedFiles: vi.fn().mockResolvedValue([]),
        editBody: vi.fn().mockReturnValue(""),
        editBreaking: vi.fn().mockResolvedValue(""),
        editIssues: vi.fn().mockResolvedValue(""),
        ...overrides,
    };
}

/**
 * Sets up mocks for a minimal prompt flow (no body, no breaking, no issues).
 */
function setupMinimalFlow() {
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
            const dependencies = createMockDependencies();

            const answers = await promptUser(dependencies);

            expect(answers).toEqual({
                type: "feat",
                scope: "core",
                subject: "add new feature",
            });
        });

        it("uses config types as select choices", async () => {
            setupMinimalFlow();
            const dependencies = createMockDependencies();

            await promptUser(dependencies);

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
            const dependencies = createMockDependencies();

            await promptUser(dependencies);

            expect(createOptionalCharacterCounterTransformer).toHaveBeenCalledWith(
                DEFAULT_CONFIG.maxScopeLength
            );
        });

        it("applies character counter transformer to subject", async () => {
            setupMinimalFlow();
            const dependencies = createMockDependencies();

            await promptUser(dependencies);

            expect(createCharacterCounterTransformer).toHaveBeenCalledWith(
                DEFAULT_CONFIG.maxSubjectLength
            );
        });
    });

    describe("scope handling", () => {
        it("includes scope in answers when provided", async () => {
            setupMinimalFlow();
            const dependencies = createMockDependencies();

            const answers = await promptUser(dependencies);

            expect(answers.scope).toBe("core");
        });

        it("sets empty scope when user enters nothing", async () => {
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("") // empty scope
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false);
            const dependencies = createMockDependencies();

            const answers = await promptUser(dependencies);

            expect(answers.scope).toBe("");
        });
    });

    describe("body flow", () => {
        it("calls editBody when user confirms body", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("api")
                .mockResolvedValueOnce("add endpoint");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // wants body
                .mockResolvedValueOnce(false) // no breaking
                .mockResolvedValueOnce(false); // no issues

            const mockEditBody = vi.fn().mockReturnValue("detailed body text");
            const dependencies = createMockDependencies({
                editBody: mockEditBody,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditBody).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "feat",
                    scope: "api",
                    subject: "add endpoint",
                    stagedFiles: [],
                })
            );
            expect(answers.body).toBe("detailed body text");
        });

        it("does not set body when user declines", async () => {
            setupMinimalFlow();
            const mockEditBody = vi.fn();
            const dependencies = createMockDependencies({
                editBody: mockEditBody,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditBody).not.toHaveBeenCalled();
            expect(answers.body).toBeUndefined();
        });
    });

    describe("breaking changes flow", () => {
        it("calls editBreaking and sets breaking when user confirms", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false) // no body
                .mockResolvedValueOnce(true) // has breaking
                .mockResolvedValueOnce(false); // no issues

            const mockEditBreaking = vi.fn().mockResolvedValue("removed endpoint");
            const dependencies = createMockDependencies({
                editBreaking: mockEditBreaking,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditBreaking).toHaveBeenCalled();
            expect(answers.breaking).toBe("removed endpoint");
        });

        it("strips BREAKING CHANGE: prefix to prevent duplication", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const dependencies = createMockDependencies({
                editBreaking: vi
                    .fn()
                    .mockResolvedValue("BREAKING CHANGE: removed old endpoint"),
            });

            const answers = await promptUser(dependencies);

            expect(answers.breaking).toBe("removed old endpoint");
        });

        it("does not set breaking when editor returns empty", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const dependencies = createMockDependencies({
                editBreaking: vi.fn().mockResolvedValue(""),
            });

            const answers = await promptUser(dependencies);

            expect(answers.breaking).toBeUndefined();
        });

        it("does not open editor when user declines breaking", async () => {
            setupMinimalFlow();
            const mockEditBreaking = vi.fn();
            const dependencies = createMockDependencies({
                editBreaking: mockEditBreaking,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditBreaking).not.toHaveBeenCalled();
            expect(answers.breaking).toBeUndefined();
        });
    });

    describe("issues flow", () => {
        it("calls editIssues and sets issues when user confirms", async () => {
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false) // no body
                .mockResolvedValueOnce(false) // no breaking
                .mockResolvedValueOnce(true); // has issues

            const mockEditIssues = vi.fn().mockResolvedValue("fixes #123");
            const dependencies = createMockDependencies({
                editIssues: mockEditIssues,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditIssues).toHaveBeenCalled();
            expect(answers.issues).toBe("fixes #123");
        });

        it("does not set issues when editor returns empty", async () => {
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);

            const dependencies = createMockDependencies({
                editIssues: vi.fn().mockResolvedValue(""),
            });

            const answers = await promptUser(dependencies);

            expect(answers.issues).toBeUndefined();
        });

        it("does not open editor when user declines issues", async () => {
            setupMinimalFlow();
            const mockEditIssues = vi.fn();
            const dependencies = createMockDependencies({
                editIssues: mockEditIssues,
            });

            const answers = await promptUser(dependencies);

            expect(mockEditIssues).not.toHaveBeenCalled();
            expect(answers.issues).toBeUndefined();
        });
    });

    describe("full flow with all fields", () => {
        it("returns complete CommitAnswers with all optional fields", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("auth")
                .mockResolvedValueOnce("add login flow");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // body
                .mockResolvedValueOnce(true) // breaking
                .mockResolvedValueOnce(true); // issues

            const dependencies = createMockDependencies({
                editBody: vi.fn().mockReturnValue("Added OAuth2 login"),
                editBreaking: vi.fn().mockResolvedValue("old session API removed"),
                editIssues: vi.fn().mockResolvedValue("closes #42, #43"),
            });

            const answers = await promptUser(dependencies);

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
