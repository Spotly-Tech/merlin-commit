import type { Validator } from "../types/index.js";

/**
 * Creates a validator that ensures input is a number within a specified range.
 *
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Validator function for use with Inquirer prompts
 *
 * @example
 * const validate = createRangeValidator(10, 200);
 * validate("50");  // returns true
 * validate("5");   // returns "Value must be at least 10"
 * validate("abc"); // returns "Please enter a valid number"
 */
export function createRangeValidator(min: number, max: number): Validator {
    return (input: string) => {
        const num = parseInt(input, 10);
        if (isNaN(num)) return "Please enter a valid number";
        if (num < min) return `Value must be at least ${min}`;
        if (num > max) return `Value must be at most ${max}`;
        return true;
    };
}

/**
 * Creates a validator that ensures input is not empty or whitespace-only.
 *
 * @param fieldName - Optional field name for the error message
 * @returns Validator function for use with Inquirer prompts
 *
 * @example
 * const validate = createNonEmptyValidator("Editor command");
 * validate("vim");  // returns true
 * validate("   ");  // returns "Editor command cannot be empty"
 */
export function createNonEmptyValidator(fieldName = "This field"): Validator {
    return (input: string) => {
        if (!input.trim()) return `${fieldName} cannot be empty`;
        return true;
    };
}

/**
 * Creates a validator that ensures input does not exceed a maximum length.
 *
 * @param maxLength - Maximum allowed string length
 * @param fieldName - Optional field name for the error message
 * @returns Validator function for use with Inquirer prompts
 *
 * @example
 * const validate = createMaxLengthValidator(72, "Subject");
 * validate("short");                    // returns true
 * validate("a".repeat(100));            // returns "Subject must be 72 characters or less"
 */
export function createMaxLengthValidator(
    maxLength: number,
    fieldName = "Input"
): Validator {
    return (input: string) => {
        if (input.length > maxLength) {
            return `${fieldName} must be ${maxLength} characters or less`;
        }
        return true;
    };
}

/**
 * Creates a validator that ensures input matches a regex pattern.
 *
 * @param pattern - Regular expression to match against
 * @param errorMessage - Error message if pattern doesn't match
 * @returns Validator function for use with Inquirer prompts
 *
 * @example
 * const validate = createPatternValidator(/^[a-z]+$/, "Must be lowercase letters only");
 * validate("hello");  // returns true
 * validate("Hello");  // returns "Must be lowercase letters only"
 */
export function createPatternValidator(pattern: RegExp, errorMessage: string): Validator {
    return (input: string) => {
        if (!pattern.test(input)) return errorMessage;
        return true;
    };
}

/**
 * Composes multiple validators into a single validator.
 * Validators run in order; first failure stops execution.
 *
 * @param validators - Array of validators to compose
 * @returns Combined validator function
 *
 * @example
 * const validate = composeValidators(
 *     createNonEmptyValidator("Scope"),
 *     createMaxLengthValidator(20, "Scope"),
 *     createPatternValidator(/^[a-z-]+$/, "Scope must be lowercase with hyphens")
 * );
 */
export function composeValidators(...validators: Validator[]): Validator {
    return (input: string) => {
        for (const validator of validators) {
            const result = validator(input);
            if (result !== true) return result;
        }
        return true;
    };
}
