import { describe, expect, it } from "vitest";
import {
    createCharacterCounterTransformer,
    createOptionalCharacterCounterTransformer,
} from "../../src/lib/transformers.js";
import { colors } from "../../src/utils/constants.js";

describe("transformers", () => {
    describe("createCharacterCounterTransformer", () => {
        const transform = createCharacterCounterTransformer(72);

        it("returns value without counter when isFinal is true", () => {
            expect(transform("hello world", { isFinal: true })).toBe("hello world");
            expect(transform("a".repeat(100), { isFinal: true })).toBe("a".repeat(100));
        });

        it("shows gray counter before input for normal text", () => {
            const result = transform("hello", { isFinal: false });
            expect(result).toBe(`${colors.muted("(5/72)")} hello`);
        });

        it("shows gray counter for empty input", () => {
            const result = transform("", { isFinal: false });
            expect(result).toBe(`${colors.muted("(0/72)")} `);
        });

        it("shows yellow counter when approaching limit (>90%)", () => {
            // 90% of 72 = 64.8, so 65+ should be yellow
            const input = "a".repeat(65);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.warning("(65/72)")} ${input}`);
        });

        it("shows yellow counter at exactly 90% threshold", () => {
            // 72 * 0.9 = 64.8, so 65 chars triggers warning
            const input = "a".repeat(65);
            const result = transform(input, { isFinal: false });
            expect(result).toContain(colors.warning("(65/72)"));
        });

        it("shows gray counter just below 90% threshold", () => {
            // 64 chars = 88.9%, should still be gray
            const input = "a".repeat(64);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.muted("(64/72)")} ${input}`);
        });

        it("shows red counter when exceeding limit", () => {
            const input = "a".repeat(80);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.error("(80/72)")} ${input}`);
        });

        it("shows red counter at exactly one over limit", () => {
            const input = "a".repeat(73);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.error("(73/72)")} ${input}`);
        });

        it("respects custom max length", () => {
            const customTransform = createCharacterCounterTransformer(20);
            const result = customTransform("hello", { isFinal: false });
            expect(result).toBe(`${colors.muted("(5/20)")} hello`);
        });

        it("respects custom warning threshold", () => {
            // Custom threshold at 80%
            const customTransform = createCharacterCounterTransformer(100, 0.8);

            // 80% of 100 = 80, so 81+ should be yellow
            const belowThreshold = customTransform("a".repeat(80), { isFinal: false });
            expect(belowThreshold).toBe(`${colors.muted("(80/100)")} ${"a".repeat(80)}`);

            const atThreshold = customTransform("a".repeat(81), { isFinal: false });
            expect(atThreshold).toBe(`${colors.warning("(81/100)")} ${"a".repeat(81)}`);
        });

        it("places counter before value for correct cursor position", () => {
            const result = transform("test", { isFinal: false });
            // Counter should come first, then space, then value
            expect(result.startsWith(colors.muted("(4/72)"))).toBe(true);
            expect(result.endsWith("test")).toBe(true);
        });
    });

    describe("createOptionalCharacterCounterTransformer", () => {
        const transform = createOptionalCharacterCounterTransformer(20);

        it("returns empty string without counter for empty input", () => {
            expect(transform("", { isFinal: false })).toBe("");
        });

        it("returns value without counter when isFinal is true", () => {
            expect(transform("hello", { isFinal: true })).toBe("hello");
            expect(transform("", { isFinal: true })).toBe("");
        });

        it("shows gray counter before input for normal text", () => {
            const result = transform("auth", { isFinal: false });
            expect(result).toBe(`${colors.muted("(4/20)")} auth`);
        });

        it("shows red counter when exceeding limit", () => {
            const input = "a".repeat(25);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.error("(25/20)")} ${input}`);
        });

        it("shows gray counter at exactly max length", () => {
            const input = "a".repeat(20);
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.muted("(20/20)")} ${input}`);
        });

        it("does not show yellow warning (no threshold)", () => {
            // Unlike the required field transformer, optional fields don't have yellow warning
            const input = "a".repeat(19); // 95% of 20
            const result = transform(input, { isFinal: false });
            expect(result).toBe(`${colors.muted("(19/20)")} ${input}`);
        });

        it("places counter before value for correct cursor position", () => {
            const result = transform("test", { isFinal: false });
            expect(result.startsWith(colors.muted("(4/20)"))).toBe(true);
            expect(result.endsWith("test")).toBe(true);
        });
    });
});
