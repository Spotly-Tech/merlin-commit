/**
 * Validator function signature matching Inquirer's expected interface.
 * Returns `true` if valid, or an error message string if invalid.
 */
export type Validator = (input: string) => true | string;
