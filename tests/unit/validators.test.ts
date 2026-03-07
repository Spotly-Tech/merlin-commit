import { describe, expect, it } from "vitest";

import {
    composeValidators,
    createMaxLengthValidator,
    createNonEmptyValidator,
    createPatternValidator,
    createRangeValidator,
} from "../../src/utils/validators.js";

describe("validators", () => {
    describe("createRangeValidator", () => {
        const validate = createRangeValidator(10, 100);

        it("returns true for values within range", () => {
            expect(validate("10")).toBe(true);
            expect(validate("50")).toBe(true);
            expect(validate("100")).toBe(true);
        });

        it("returns error for values below minimum", () => {
            expect(validate("9")).toBe("Value must be at least 10");
            expect(validate("0")).toBe("Value must be at least 10");
            expect(validate("-5")).toBe("Value must be at least 10");
        });

        it("returns error for values above maximum", () => {
            expect(validate("101")).toBe("Value must be at most 100");
            expect(validate("999")).toBe("Value must be at most 100");
        });

        it("returns error for non-numeric input", () => {
            expect(validate("abc")).toBe("Please enter a valid number");
            expect(validate("")).toBe("Please enter a valid number");
        });

        it("returns error for decimal inputs", () => {
            expect(validate("12.5")).toBe("Please enter a whole number");
            expect(validate("10.0")).toBe("Please enter a whole number");
            expect(validate("99.9")).toBe("Please enter a whole number");
        });
    });

    describe("createNonEmptyValidator", () => {
        it("returns true for non-empty strings", () => {
            const validate = createNonEmptyValidator();
            expect(validate("hello")).toBe(true);
            expect(validate("  hello  ")).toBe(true);
            expect(validate("a")).toBe(true);
        });

        it("returns error for empty strings", () => {
            const validate = createNonEmptyValidator();
            expect(validate("")).toBe("This field cannot be empty");
            expect(validate("   ")).toBe("This field cannot be empty");
            expect(validate("\t\n")).toBe("This field cannot be empty");
        });

        it("uses custom field name in error message", () => {
            const validate = createNonEmptyValidator("Editor command");
            expect(validate("")).toBe("Editor command cannot be empty");
        });
    });

    describe("createMaxLengthValidator", () => {
        const validate = createMaxLengthValidator(10, "Subject");

        it("returns true for strings within limit", () => {
            expect(validate("")).toBe(true);
            expect(validate("hello")).toBe(true);
            expect(validate("1234567890")).toBe(true);
        });

        it("returns error for strings exceeding limit", () => {
            expect(validate("12345678901")).toBe("Subject must be 10 characters or less");
            expect(validate("a".repeat(100))).toBe(
                "Subject must be 10 characters or less"
            );
        });
    });

    describe("createPatternValidator", () => {
        const validate = createPatternValidator(
            /^[a-z-]+$/,
            "Must be lowercase with hyphens only"
        );

        it("returns true for matching patterns", () => {
            expect(validate("hello")).toBe(true);
            expect(validate("hello-world")).toBe(true);
            expect(validate("a")).toBe(true);
        });

        it("returns error for non-matching patterns", () => {
            expect(validate("Hello")).toBe("Must be lowercase with hyphens only");
            expect(validate("hello_world")).toBe("Must be lowercase with hyphens only");
            expect(validate("hello123")).toBe("Must be lowercase with hyphens only");
        });
    });

    describe("composeValidators", () => {
        it("runs validators in order and returns first error", () => {
            const validate = composeValidators(
                createNonEmptyValidator("Field"),
                createMaxLengthValidator(5, "Field")
            );

            expect(validate("")).toBe("Field cannot be empty");
            expect(validate("hello")).toBe(true);
            expect(validate("toolong")).toBe("Field must be 5 characters or less");
        });

        it("returns true when all validators pass", () => {
            const validate = composeValidators(
                createNonEmptyValidator(),
                createMaxLengthValidator(20),
                createPatternValidator(/^[a-z]+$/, "Must be lowercase")
            );

            expect(validate("hello")).toBe(true);
        });

        it("handles single validator", () => {
            const validate = composeValidators(createNonEmptyValidator());
            expect(validate("")).toBe("This field cannot be empty");
            expect(validate("hello")).toBe(true);
        });

        it("handles empty validator array", () => {
            const validate = composeValidators();
            expect(validate("anything")).toBe(true);
        });
    });
});
