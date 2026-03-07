import { describe, expect, it } from "vitest";

import {
    BREAKING_CHANGE_PREFIX_REGEX,
    colors,
    COMMIT_TYPES,
    DEFAULT_CONFIG,
    STANDARD_MESSAGES,
    WIZARD_MESSAGES,
} from "../../src/utils/constants.js";

describe("BREAKING_CHANGE_PREFIX_REGEX", () => {
    it("matches the exact prefix with trailing space", () => {
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("BREAKING CHANGE: some text")).toBe(
            true
        );
    });

    it("matches the prefix case-insensitively", () => {
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("breaking change: some text")).toBe(
            true
        );
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("Breaking Change: some text")).toBe(
            true
        );
    });

    it("matches the prefix with no trailing space", () => {
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("BREAKING CHANGE:text")).toBe(true);
    });

    it("does not match text that does not start with the prefix", () => {
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("some breaking change")).toBe(false);
        expect(BREAKING_CHANGE_PREFIX_REGEX.test("not a breaking change:")).toBe(false);
    });

    it("strips the prefix when used with replace, leaving the description", () => {
        const result = "BREAKING CHANGE: API changed".replace(
            BREAKING_CHANGE_PREFIX_REGEX,
            ""
        );
        expect(result).toBe("API changed");
    });
});

describe("colors", () => {
    const expectedColorKeys = [
        "primary",
        "header",
        "success",
        "error",
        "warning",
        "info",
        "muted",
        "content",
    ] as const;

    it("exports all 8 semantic color functions", () => {
        for (const key of expectedColorKeys) {
            expect(colors).toHaveProperty(key);
            expect(typeof colors[key]).toBe("function");
        }
    });

    it("each color function returns a string when called", () => {
        for (const key of expectedColorKeys) {
            const result = colors[key]("test");
            expect(typeof result).toBe("string");
        }
    });
});

describe("COMMIT_TYPES", () => {
    it("contains exactly 11 commit types", () => {
        expect(COMMIT_TYPES).toHaveLength(11);
    });

    it("each type has required non-empty string properties", () => {
        for (const commitType of COMMIT_TYPES) {
            expect(typeof commitType.value).toBe("string");
            expect(commitType.value.length).toBeGreaterThan(0);

            expect(typeof commitType.name).toBe("string");
            expect(commitType.name.length).toBeGreaterThan(0);

            expect(typeof commitType.description).toBe("string");
            expect(commitType.description.length).toBeGreaterThan(0);

            expect(typeof commitType.emoji).toBe("string");
            expect(commitType.emoji.length).toBeGreaterThan(0);
        }
    });

    it("includes all conventional commit type values", () => {
        const typeValues = COMMIT_TYPES.map((commitType) => commitType.value);
        const expectedTypes = [
            "feat",
            "fix",
            "docs",
            "style",
            "refactor",
            "perf",
            "test",
            "build",
            "ci",
            "chore",
            "revert",
        ];

        for (const expected of expectedTypes) {
            expect(typeValues).toContain(expected);
        }
    });
});

describe("WIZARD_MESSAGES", () => {
    const expectedCategories = [
        "commit",
        "config",
        "checking",
        "prompts",
        "success",
        "errors",
        "warnings",
        "tips",
        "init",
    ] as const;

    it("has all required message categories", () => {
        for (const category of expectedCategories) {
            expect(WIZARD_MESSAGES).toHaveProperty(category);
            expect(typeof WIZARD_MESSAGES[category]).toBe("object");
        }
    });
});

describe("STANDARD_MESSAGES", () => {
    it("has the same top-level categories as WIZARD_MESSAGES", () => {
        const wizardKeys = Object.keys(WIZARD_MESSAGES).sort();
        const standardKeys = Object.keys(STANDARD_MESSAGES).sort();

        expect(standardKeys).toEqual(wizardKeys);
    });

    it("has the same sub-keys per category as WIZARD_MESSAGES", () => {
        for (const category of Object.keys(WIZARD_MESSAGES) as Array<
            keyof typeof WIZARD_MESSAGES
        >) {
            const wizardSubKeys = Object.keys(WIZARD_MESSAGES[category]).sort();
            const standardSubKeys = Object.keys(STANDARD_MESSAGES[category]).sort();

            expect(standardSubKeys).toEqual(wizardSubKeys);
        }
    });
});

describe("DEFAULT_CONFIG", () => {
    it("has correct default values", () => {
        expect(DEFAULT_CONFIG.maxSubjectLength).toBe(72);
        expect(DEFAULT_CONFIG.maxScopeLength).toBe(20);
        expect(DEFAULT_CONFIG.autoAdd).toBe(false);
        expect(DEFAULT_CONFIG.theme).toBe("wizard");
        expect(DEFAULT_CONFIG.types).toBe(COMMIT_TYPES);
    });
});
