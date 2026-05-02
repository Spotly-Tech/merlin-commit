import { confirm, input, select } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { promptUser, type PromptDependencies } from "../../src/lib/prompt.js";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "../../src/lib/transformers.js";
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
        editBreaking: vi.fn().mockReturnValue(""),
        editIssues: vi.fn().mockReturnValue(""),
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

        it("does not apply character counter transformer to scope when showCharacterCounter is false", async () => {
            setupMinimalFlow();
            const dependencies = createMockDependencies({
                config: { ...DEFAULT_CONFIG, showCharacterCounter: false },
            });

            await promptUser(dependencies);

            expect(createOptionalCharacterCounterTransformer).not.toHaveBeenCalled();
        });

        it("does not apply character counter transformer to subject when showCharacterCounter is false", async () => {
            setupMinimalFlow();
            const dependencies = createMockDependencies({
                config: { ...DEFAULT_CONFIG, showCharacterCounter: false },
            });

            await promptUser(dependencies);

            expect(createCharacterCounterTransformer).not.toHaveBeenCalled();
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

            const mockEditBreaking = vi.fn().mockReturnValue("removed endpoint");
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
                    .mockReturnValue("BREAKING CHANGE: removed old endpoint"),
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
                editBreaking: vi.fn().mockReturnValue(""),
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

            const mockEditIssues = vi.fn().mockReturnValue("fixes #123");
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
                editIssues: vi.fn().mockReturnValue(""),
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

    describe("editor failure fallback", () => {
        it("continues without body when body editor throws", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("api")
                .mockResolvedValueOnce("add endpoint");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true) // wants body
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false);

            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const dependencies = createMockDependencies({
                editBody: vi.fn().mockImplementation(() => {
                    throw new Error("Editor 'vim' not found");
                }),
            });

            const answers = await promptUser(dependencies);

            expect(answers.body).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledOnce();
            warnSpy.mockRestore();
        });

        it("continues without breaking when breaking editor throws", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("change API");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true) // wants breaking
                .mockResolvedValueOnce(false);

            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const dependencies = createMockDependencies({
                editBreaking: vi.fn().mockImplementation(() => {
                    throw new Error("Editor not found");
                }),
            });

            const answers = await promptUser(dependencies);

            expect(answers.breaking).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledOnce();
            warnSpy.mockRestore();
        });

        it("continues without issues when issues editor throws", async () => {
            vi.mocked(select).mockResolvedValueOnce("fix");
            vi.mocked(input)
                .mockResolvedValueOnce("")
                .mockResolvedValueOnce("resolve bug");
            vi.mocked(confirm)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true); // wants issues

            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const dependencies = createMockDependencies({
                editIssues: vi.fn().mockImplementation(() => {
                    throw new Error("Editor not found");
                }),
            });

            const answers = await promptUser(dependencies);

            expect(answers.issues).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledOnce();
            warnSpy.mockRestore();
        });

        it("still returns valid commit answers when all editors fail", async () => {
            vi.mocked(select).mockResolvedValueOnce("feat");
            vi.mocked(input)
                .mockResolvedValueOnce("auth")
                .mockResolvedValueOnce("add login");
            vi.mocked(confirm)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true);

            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            const dependencies = createMockDependencies({
                editBody: vi.fn().mockImplementation(() => {
                    throw new Error("Editor not found");
                }),
                editBreaking: vi.fn().mockImplementation(() => {
                    throw new Error("Editor not found");
                }),
                editIssues: vi.fn().mockImplementation(() => {
                    throw new Error("Editor not found");
                }),
            });

            const answers = await promptUser(dependencies);

            expect(answers.type).toBe("feat");
            expect(answers.subject).toBe("add login");
            expect(answers.body).toBeUndefined();
            expect(answers.breaking).toBeUndefined();
            expect(answers.issues).toBeUndefined();
            expect(warnSpy).toHaveBeenCalledTimes(3);
            warnSpy.mockRestore();
        });
    });

    describe("scope validation", () => {
        /**
         * Extracts the validate callback from the first input() call (scope prompt).
         */
        async function captureScopeValidator(): Promise<
            (value: string) => true | string
        > {
            setupMinimalFlow();
            const dependencies = createMockDependencies();
            await promptUser(dependencies);

            const scopeCall = vi.mocked(input).mock.calls[0][0];
            return scopeCall.validate as (value: string) => true | string;
        }

        it("accepts empty scope (optional field)", async () => {
            const validate = await captureScopeValidator();

            expect(validate("")).toBe(true);
        });

        it("accepts valid alphanumeric scope", async () => {
            const validate = await captureScopeValidator();

            expect(validate("core")).toBe(true);
            expect(validate("api")).toBe(true);
            expect(validate("auth2")).toBe(true);
        });

        it("accepts scope with hyphens", async () => {
            const validate = await captureScopeValidator();

            expect(validate("config-loader")).toBe(true);
            expect(validate("commit-msg")).toBe(true);
        });

        it("rejects scope starting with a digit", async () => {
            const validate = await captureScopeValidator();

            expect(validate("2auth")).toBe(WIZARD_MESSAGES.errors.commit.malformed);
        });

        it("rejects scope starting with a hyphen", async () => {
            const validate = await captureScopeValidator();

            expect(validate("-core")).toBe(WIZARD_MESSAGES.errors.commit.malformed);
        });

        it("rejects scope with spaces", async () => {
            const validate = await captureScopeValidator();

            expect(validate("my scope")).toBe(WIZARD_MESSAGES.errors.commit.malformed);
        });

        it("rejects scope with special characters", async () => {
            const validate = await captureScopeValidator();

            expect(validate("scope!")).toBe(WIZARD_MESSAGES.errors.commit.malformed);
            expect(validate("scope/sub")).toBe(WIZARD_MESSAGES.errors.commit.malformed);
        });

        it("rejects scope exceeding max length", async () => {
            const validate = await captureScopeValidator();
            const longScope = "a".repeat(DEFAULT_CONFIG.maxScopeLength + 1);

            const result = validate(longScope);

            expect(result).toBe(
                WIZARD_MESSAGES.errors.commit.tooLong(DEFAULT_CONFIG.maxScopeLength)
            );
        });
    });

    describe("subject validation", () => {
        /**
         * Extracts the validate callback from the second input() call (subject prompt).
         */
        async function captureSubjectValidator(): Promise<
            (value: string) => true | string
        > {
            setupMinimalFlow();
            const dependencies = createMockDependencies();
            await promptUser(dependencies);

            const subjectCall = vi.mocked(input).mock.calls[1][0];
            return subjectCall.validate as (value: string) => true | string;
        }

        it("accepts valid subject", async () => {
            const validate = await captureSubjectValidator();

            expect(validate("add new feature")).toBe(true);
        });

        it("rejects empty subject", async () => {
            const validate = await captureSubjectValidator();

            expect(validate("")).toBe(WIZARD_MESSAGES.errors.commit.required);
        });

        it("rejects subject exceeding max length", async () => {
            const validate = await captureSubjectValidator();
            const longSubject = "a".repeat(DEFAULT_CONFIG.maxSubjectLength + 1);

            expect(validate(longSubject)).toBe(
                WIZARD_MESSAGES.errors.commit.tooLong(DEFAULT_CONFIG.maxSubjectLength)
            );
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
                editBreaking: vi.fn().mockReturnValue("old session API removed"),
                editIssues: vi.fn().mockReturnValue("closes #42, #43"),
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
