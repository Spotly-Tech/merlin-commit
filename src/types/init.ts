/**
 * Command-line options for the `merlin init` command.
 * Controls which parts of the setup process to execute.
 */
export type InitOptions = {
    /**
     * When true, only setup husky hooks without commitlint configuration.
     * Useful when commitlint is already configured or not desired.
     * @default false
     */
    huskyOnly?: boolean;

    /**
     * When true, only setup commitlint configuration without husky hooks.
     * Useful when husky is already configured or using different hook manager.
     * @default false
     */
    commitlintOnly?: boolean;

    /**
     * When false, skip npm install of dependencies (husky, commitlint).
     * Commander.js sets this to false when --no-install is passed.
     * @default true
     */
    install?: boolean;
};
