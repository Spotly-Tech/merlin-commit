import { describe, expect, it } from "vitest";

import { validateConfig } from "../../src/utils/config.js";

describe("validateConfig", () => {
    it("returns empty object for null input", () => {
        const result = validateConfig(null);

        expect(result).toEqual({});
    });

    it("returns empty object for non-object input", () => {
        expect(validateConfig("string")).toEqual({});
        expect(validateConfig(42)).toEqual({});
        expect(validateConfig(true)).toEqual({});
        expect(validateConfig(undefined)).toEqual({});
    });

    it("returns empty object for empty object input", () => {
        const result = validateConfig({});

        expect(result).toEqual({});
    });

    it("validates and returns only recognized fields", () => {
        const result = validateConfig({
            theme: "standard",
            maxSubjectLength: 50,
            unknownField: "ignored",
        });

        expect(result).toEqual({ theme: "standard", maxSubjectLength: 50 });
        expect((result as Record<string, unknown>).unknownField).toBeUndefined();
    });

    it("rejects invalid theme values", () => {
        const result = validateConfig({ theme: "dark" });

        expect(result.theme).toBeUndefined();
    });

    it("rejects zero and negative maxSubjectLength", () => {
        expect(validateConfig({ maxSubjectLength: 0 })).toEqual({});
        expect(validateConfig({ maxSubjectLength: -5 })).toEqual({});
    });

    it("rejects zero and negative maxScopeLength", () => {
        expect(validateConfig({ maxScopeLength: 0 })).toEqual({});
        expect(validateConfig({ maxScopeLength: -1 })).toEqual({});
    });

    it("accepts valid positive maxScopeLength", () => {
        const result = validateConfig({ maxScopeLength: 30 });

        expect(result.maxScopeLength).toBe(30);
    });

    it("accepts valid autoAdd boolean", () => {
        const resultTrue = validateConfig({ autoAdd: true });
        const resultFalse = validateConfig({ autoAdd: false });

        expect(resultTrue.autoAdd).toBe(true);
        expect(resultFalse.autoAdd).toBe(false);
    });

    it("filters valid commit types and ignores invalid ones", () => {
        const result = validateConfig({
            types: [
                {
                    value: "feat",
                    name: "Feature",
                    description: "A new feature",
                    emoji: "✨",
                },
                { invalid: "missing fields" },
                {
                    value: "fix",
                    name: "Bug Fix",
                    description: "A bug fix",
                    emoji: "🐛",
                },
            ],
        });

        expect(result.types).toHaveLength(2);
        expect(result.types![0].value).toBe("feat");
        expect(result.types![1].value).toBe("fix");
    });

    it("omits types field when all entries are invalid", () => {
        const result = validateConfig({
            types: [{ invalid: "type" }, { also: "invalid" }],
        });

        expect(result.types).toBeUndefined();
    });

    it("omits types field for empty array", () => {
        const result = validateConfig({ types: [] });

        expect(result.types).toBeUndefined();
    });
});
