import chalk from "chalk";

/**
 * Transformer function signature matching Inquirer's expected interface.
 * Transforms the displayed value on every keystroke.
 */
export type Transformer = (value: string, options: { isFinal: boolean }) => string;

/**
 * Creates a transformer that displays a character counter with color feedback.
 *
 * Color thresholds:
 * - Gray: Normal input (below warning threshold)
 * - Yellow: Approaching limit (above 90% of max)
 * - Red: Exceeds limit
 *
 * @param maxLength - Maximum allowed string length
 * @param warningThreshold - Percentage (0-1) at which to show yellow warning (default: 0.9)
 * @returns Transformer function for use with Inquirer prompts
 *
 * @example
 * const transform = createCharacterCounterTransformer(72);
 * transform("hello", { isFinal: false });  // "(5/72) hello" in gray
 * transform("a".repeat(70), { isFinal: false });  // "(70/72) aaa..." in yellow
 * transform("a".repeat(80), { isFinal: false });  // "(80/72) aaa..." in red
 * transform("hello", { isFinal: true });  // "hello" (no counter)
 */
export function createCharacterCounterTransformer(
    maxLength: number,
    warningThreshold = 0.9
): Transformer {
    return (value: string, { isFinal }: { isFinal: boolean }) => {
        if (isFinal) return value;

        const count = value.length;
        const counter = `(${count}/${maxLength})`;

        // Counter placed BEFORE value so cursor naturally stays after user input
        // This is a workaround for Inquirer's cursor positioning limitation
        // See: https://github.com/SBoudrias/Inquirer.js/issues/669
        if (count > maxLength) {
            return `${chalk.red(counter)} ${value}`;
        }
        if (count > maxLength * warningThreshold) {
            return `${chalk.yellow(counter)} ${value}`;
        }
        return `${chalk.gray(counter)} ${value}`;
    };
}

/**
 * Creates a transformer that displays a character counter only when there is input.
 * Useful for optional fields where an empty counter is distracting.
 *
 * @param maxLength - Maximum allowed string length
 * @returns Transformer function for use with Inquirer prompts
 *
 * @example
 * const transform = createOptionalCharacterCounterTransformer(20);
 * transform("", { isFinal: false });  // "" (no counter for empty input)
 * transform("auth", { isFinal: false });  // "(4/20) auth" in gray
 */
export function createOptionalCharacterCounterTransformer(
    maxLength: number
): Transformer {
    return (value: string, { isFinal }: { isFinal: boolean }) => {
        if (isFinal || !value) return value;

        const count = value.length;
        const counter = `(${count}/${maxLength})`;

        // Counter placed BEFORE value so cursor naturally stays after user input
        // See: https://github.com/SBoudrias/Inquirer.js/issues/669
        if (count > maxLength) {
            return `${chalk.red(counter)} ${value}`;
        }
        return `${chalk.gray(counter)} ${value}`;
    };
}
