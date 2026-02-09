import { confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import ora from "ora";
import { isGitRepo } from "../lib/git.js";
import {
    checkGitAlias,
    createCommitlintConfig,
    createCommitMsgHook,
    createProjectConfig,
    detectExistingSetup,
    hasPackageJson,
    INIT_DEPENDENCIES,
    initializeHusky,
    installDependencies,
    setupGitAlias,
} from "../lib/setup.js";
import { setupSigintHandler } from "../lib/sigint.js";
import type { InitOptions } from "../types/index.js";
import { getMessages } from "../utils/config.js";

/**
 * Init command handler that sets up husky and commitlint for conventional commits.
 *
 * Performs the following setup steps:
 * 1. Validates git repository and package.json exist
 * 2. Detects existing setup files
 * 3. Installs dependencies (husky, \@commitlint/cli, \@commitlint/config-conventional)
 * 4. Initializes husky
 * 5. Creates commitlint configuration
 * 6. Creates commit-msg hook
 * 7. Optionally sets up git merlin alias
 * 8. Optionally creates project-level .merlinrc.json for team sharing
 *
 * @param options - Command line options
 * @param options.huskyOnly - Only setup husky hooks, skip commitlint config
 * @param options.commitlintOnly - Only setup commitlint, skip husky init
 * @param options.noInstall - Skip npm install of dependencies
 *
 * @example
 * // Full setup
 * merlin init
 *
 * @example
 * // Only setup husky
 * merlin init --husky-only
 *
 * @example
 * // Skip npm install (dependencies already installed)
 * merlin init --no-install
 */
export async function initCommand(options: InitOptions): Promise<void> {
    const messages = getMessages();
    const spinner = ora();
    const removeSigintHandler = setupSigintHandler(messages, () => spinner.stop());

    try {
        // Track which setup steps actually completed
        let huskyInitialized = false;
        let commitlintCreated = false;
        let hookCreated = false;

        // Show intro
        console.log(chalk.bold.cyan(`\n${messages.init.intro}\n`));

        // Validate git repository
        spinner.start(messages.checking.repo);
        if (!(await isGitRepo())) {
            spinner.fail(chalk.red(messages.errors.notRepo));
            console.log(chalk.yellow(`\n${messages.tips.runGitInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Validate package.json exists
        spinner.start(messages.init.checkingPackageJson);
        if (!(await hasPackageJson())) {
            spinner.fail(chalk.red(messages.errors.noPackageJson));
            console.log(chalk.yellow(`\n${messages.tips.runNpmInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Detect existing setup files
        const existing = await detectExistingSetup();
        const hasExisting = Object.values(existing).some(Boolean);

        if (hasExisting) {
            console.log(chalk.yellow(`\n${messages.warnings.existingSetup}`));
            if (existing.husky) console.log(chalk.gray("  • .husky/ directory"));
            if (existing.commitMsgHook)
                console.log(chalk.gray("  • .husky/commit-msg hook"));
            if (existing.commitlintConfig)
                console.log(chalk.gray("  • commitlint config"));
            if (existing.merlinConfig) console.log(chalk.gray("  • .merlinrc.json"));
            console.log();
        }

        // Install dependencies (unless --no-install)
        if (!options.noInstall) {
            const shouldInstall = await confirm({
                message: messages.init.installDeps,
                default: true,
            });

            if (shouldInstall) {
                // Filter deps based on options
                let deps = [...INIT_DEPENDENCIES];
                if (options.huskyOnly) {
                    deps = deps.filter((d) => d === "husky");
                } else if (options.commitlintOnly) {
                    deps = deps.filter((d) => d !== "husky");
                }

                spinner.start(messages.init.installingDeps);
                try {
                    await installDependencies(deps, { silent: true });
                    spinner.succeed();
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.installFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}`));
                    console.log(
                        chalk.yellow(
                            `\n${messages.tips.manualInstall} ${deps.join(" ")}\n`
                        )
                    );
                    process.exit(1);
                }
            }
        }

        // Initialize Husky (unless --commitlint-only)
        if (!options.commitlintOnly) {
            let shouldInit = true;

            if (existing.husky) {
                shouldInit = await confirm({
                    message: `${messages.init.overwrite} (.husky/)`,
                    default: false,
                });
                if (!shouldInit) {
                    console.log(chalk.gray(`  ${messages.init.skipExisting} .husky/`));
                }
            }

            if (shouldInit) {
                spinner.start(messages.init.initializingHusky);
                try {
                    await initializeHusky();
                    spinner.succeed();
                    huskyInitialized = true;
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.huskyFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}\n`));
                    process.exit(1);
                }
            }
        }

        // Create commitlint config (unless --husky-only)
        if (!options.huskyOnly) {
            let shouldCreate = true;

            if (existing.commitlintConfig) {
                shouldCreate = await confirm({
                    message: `${messages.init.overwrite} (commitlint.config.js)`,
                    default: false,
                });
                if (!shouldCreate) {
                    console.log(
                        chalk.gray(`  ${messages.init.skipExisting} commitlint.config.js`)
                    );
                }
            }

            if (shouldCreate) {
                spinner.start(messages.init.creatingCommitlint);
                try {
                    await createCommitlintConfig();
                    spinner.succeed();
                    commitlintCreated = true;
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.configFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}\n`));
                    process.exit(1);
                }
            }
        }

        // Create commit-msg hook (only if both husky AND commitlint are available)
        // Skip if: huskyOnly (no commitlint to run) or commitlintOnly without existing husky
        if (!options.huskyOnly && (!options.commitlintOnly || existing.husky)) {
            let shouldCreate = true;

            if (existing.commitMsgHook) {
                shouldCreate = await confirm({
                    message: `${messages.init.overwrite} (.husky/commit-msg)`,
                    default: false,
                });
                if (!shouldCreate) {
                    console.log(
                        chalk.gray(`  ${messages.init.skipExisting} .husky/commit-msg`)
                    );
                }
            }

            if (shouldCreate) {
                spinner.start(messages.init.creatingHook);
                try {
                    await createCommitMsgHook();
                    spinner.succeed();
                    hookCreated = true;
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.hookFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}\n`));
                    process.exit(1);
                }
            }
        }

        // Setup git alias (optional)
        let aliasCreated = false;
        const wantsAlias = await confirm({
            message: messages.init.setupAlias,
            default: true,
        });

        if (wantsAlias) {
            const existingAlias = await checkGitAlias();

            let shouldCreate = true;
            if (existingAlias) {
                console.log(
                    chalk.yellow(`\n${messages.warnings.aliasExists}: ${existingAlias}`)
                );
                shouldCreate = await confirm({
                    message: messages.init.overwrite,
                    default: false,
                });
            }

            if (shouldCreate) {
                const scope = await select({
                    message: messages.init.aliasScope,
                    choices: [
                        {
                            value: "global" as const,
                            name: messages.init.aliasScopeGlobal,
                        },
                        { value: "local" as const, name: messages.init.aliasScopeLocal },
                    ],
                });

                spinner.start(messages.init.creatingAlias);
                try {
                    await setupGitAlias(scope);
                    spinner.succeed();
                    aliasCreated = true;
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.aliasFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}`));
                    // Non-fatal: continue to success summary
                }
            }
        }

        // Create project config (optional)
        let projectConfigCreated = false;
        const wantsProjectConfig = await confirm({
            message: messages.init.createProjectConfig,
            default: !existing.merlinConfig,
        });

        if (wantsProjectConfig) {
            let shouldCreate = true;

            if (existing.merlinConfig) {
                shouldCreate = await confirm({
                    message: `${messages.init.overwrite} (.merlinrc.json)`,
                    default: false,
                });
                if (!shouldCreate) {
                    console.log(
                        chalk.gray(`  ${messages.init.skipExisting} .merlinrc.json`)
                    );
                }
            }

            if (shouldCreate) {
                spinner.start(messages.init.creatingProjectConfig);
                try {
                    await createProjectConfig();
                    spinner.succeed();
                    projectConfigCreated = true;
                } catch (error) {
                    spinner.fail(chalk.red(messages.errors.configFailed));
                    console.error(chalk.gray(`\n${(error as Error).message}`));
                    // Non-fatal: continue to success summary
                }
            }
        }

        // Success summary
        console.log(chalk.green(`\n✨ ${messages.success.init}`));
        console.log(chalk.gray("\nCreated/updated:"));

        if (huskyInitialized) {
            console.log(chalk.gray("  • .husky/ directory"));
        }
        if (commitlintCreated) {
            console.log(chalk.gray("  • commitlint.config.js"));
        }
        if (hookCreated) {
            console.log(chalk.gray("  • .husky/commit-msg hook"));
        }
        if (aliasCreated) {
            console.log(chalk.gray("  • git merlin alias"));
        }
        if (projectConfigCreated) {
            console.log(chalk.gray("  • .merlinrc.json (project config)"));
        }

        console.log(chalk.cyan(`\n${messages.tips.nextSteps}`));
        console.log(chalk.gray("  1. Stage your changes: git add ."));
        console.log(chalk.gray("  2. Create a commit: merlin (or git merlin)"));
        console.log(chalk.gray(`\n${messages.init.exit}\n`));

        process.exit(0);
    } catch (error) {
        if ((error as Error).name === "ExitPromptError") {
            spinner.stop();
            console.log(chalk.yellow(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }
        spinner.fail();
        console.error(chalk.red("\n" + (error as Error).message + "\n"));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
