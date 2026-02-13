import { confirm, select } from "@inquirer/prompts";
import ora from "ora";

import { getMessages } from "../lib/config-loader.js";
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
    isPackageInstalled,
    setupGitAlias,
} from "../lib/setup.js";
import { setupSigintHandler } from "../lib/sigint.js";
import type { InitOptions } from "../types/index.js";
import { colors } from "../utils/constants.js";

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
 * @param options.install - When false, skip npm install of dependencies
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
    const messages = await getMessages();
    const spinner = ora();
    const removeSigintHandler = setupSigintHandler(messages, () => spinner.stop());

    try {
        // Track which setup steps actually completed
        let huskyInitialized = false;
        let commitlintCreated = false;
        let hookCreated = false;

        // Show intro
        console.log(colors.header(`\n${messages.init.intro}\n`));

        // Validate git repository
        spinner.start(messages.checking.repo);
        if (!(await isGitRepo())) {
            spinner.fail(colors.error(messages.errors.notRepo));
            console.log(colors.warning(`\n${messages.tips.runGitInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Validate package.json exists
        spinner.start(messages.init.checkingPackageJson);
        if (!(await hasPackageJson())) {
            spinner.fail(colors.error(messages.errors.noPackageJson));
            console.log(colors.warning(`\n${messages.tips.runNpmInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Detect existing setup files
        const existing = await detectExistingSetup();
        const hasExisting = Object.values(existing).some(Boolean);

        if (hasExisting) {
            console.log(colors.warning(`\n${messages.warnings.existingSetup}`));
            if (existing.husky) console.log(colors.muted("  • .husky/ directory"));
            if (existing.commitMsgHook)
                console.log(colors.muted("  • .husky/commit-msg hook"));
            if (existing.commitlintConfig)
                console.log(colors.muted("  • commitlint config"));
            if (existing.merlinConfig) console.log(colors.muted("  • .merlinrc.json"));
            console.log();
        }

        // Install dependencies (unless --no-install)
        if (options.install !== false) {
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
                    spinner.fail(colors.error(messages.errors.installFailed));
                    console.error(colors.muted(`\n${(error as Error).message}`));
                    console.log(
                        colors.warning(
                            `\n${messages.tips.manualInstall} ${deps.join(" ")}\n`
                        )
                    );
                    process.exit(1);
                }
            }
        }

        // Initialize Husky (unless --commitlint-only)
        if (!options.commitlintOnly) {
            const isHuskyInstalled = await isPackageInstalled("husky");

            if (!isHuskyInstalled) {
                console.log(
                    colors.warning(
                        "  ⚠️  Skipping Husky initialization — husky not installed"
                    )
                );
            } else {
                let shouldInit = true;

                if (existing.husky) {
                    shouldInit = await confirm({
                        message: `${messages.init.overwrite} (.husky/)`,
                        default: false,
                    });
                    if (!shouldInit) {
                        console.log(
                            colors.muted(`  ${messages.init.skipExisting} .husky/`)
                        );
                    }
                }

                if (shouldInit) {
                    spinner.start(messages.init.initializingHusky);
                    try {
                        await initializeHusky();
                        spinner.succeed();
                        huskyInitialized = true;
                    } catch (error) {
                        spinner.fail(colors.error(messages.errors.huskyFailed));
                        console.error(colors.muted(`\n${(error as Error).message}\n`));
                        process.exit(1);
                    }
                }
            }
        }

        // Create commitlint config (unless --husky-only)
        if (!options.huskyOnly) {
            const isCommitlintInstalled = await isPackageInstalled("@commitlint/cli");

            if (!isCommitlintInstalled) {
                console.log(
                    colors.warning(
                        "  ⚠️  Skipping commitlint config — @commitlint/cli not installed"
                    )
                );
            } else {
                let shouldCreate = true;

                if (existing.commitlintConfig) {
                    shouldCreate = await confirm({
                        message: `${messages.init.overwrite} (commitlint.config.js)`,
                        default: false,
                    });
                    if (!shouldCreate) {
                        console.log(
                            colors.muted(
                                `  ${messages.init.skipExisting} commitlint.config.js`
                            )
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
                        spinner.fail(colors.error(messages.errors.configFailed));
                        console.error(colors.muted(`\n${(error as Error).message}\n`));
                        process.exit(1);
                    }
                }
            }
        }

        // Create commit-msg hook (only if both husky AND commitlint are available)
        // Skip if: huskyOnly (no commitlint to run) or commitlintOnly without existing husky
        if (!options.huskyOnly && (!options.commitlintOnly || existing.husky)) {
            const isHookViable =
                (huskyInitialized || existing.husky) &&
                (await isPackageInstalled("@commitlint/cli"));

            if (!isHookViable) {
                console.log(
                    colors.warning(
                        "  ⚠️  Skipping commit-msg hook — missing dependencies"
                    )
                );
            } else {
                let shouldCreate = true;

                if (existing.commitMsgHook) {
                    shouldCreate = await confirm({
                        message: `${messages.init.overwrite} (.husky/commit-msg)`,
                        default: false,
                    });
                    if (!shouldCreate) {
                        console.log(
                            colors.muted(
                                `  ${messages.init.skipExisting} .husky/commit-msg`
                            )
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
                        spinner.fail(colors.error(messages.errors.hookFailed));
                        console.error(colors.muted(`\n${(error as Error).message}\n`));
                        process.exit(1);
                    }
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
                    colors.warning(`\n${messages.warnings.aliasExists}: ${existingAlias}`)
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
                    spinner.fail(colors.error(messages.errors.aliasFailed));
                    console.error(colors.muted(`\n${(error as Error).message}`));
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
                        colors.muted(`  ${messages.init.skipExisting} .merlinrc.json`)
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
                    spinner.fail(colors.error(messages.errors.configFailed));
                    console.error(colors.muted(`\n${(error as Error).message}`));
                    // Non-fatal: continue to success summary
                }
            }
        }

        // Success summary
        console.log(colors.success(`\n✨ ${messages.success.init}`));
        console.log(colors.muted("\nCreated/updated:"));

        if (huskyInitialized) {
            console.log(colors.muted("  • .husky/ directory"));
        }
        if (commitlintCreated) {
            console.log(colors.muted("  • commitlint.config.js"));
        }
        if (hookCreated) {
            console.log(colors.muted("  • .husky/commit-msg hook"));
        }
        if (aliasCreated) {
            console.log(colors.muted("  • git merlin alias"));
        }
        if (projectConfigCreated) {
            console.log(colors.muted("  • .merlinrc.json (project config)"));
        }

        console.log(colors.primary(`\n${messages.tips.nextSteps}`));
        console.log(colors.muted("  1. Stage your changes: git add ."));
        console.log(colors.muted("  2. Create a commit: merlin (or git merlin)"));
        console.log(colors.muted(`\n${messages.init.exit}\n`));

        process.exit(0);
    } catch (error) {
        if ((error as Error).name === "ExitPromptError") {
            spinner.stop();
            console.log(colors.warning(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }
        spinner.fail();
        console.error(colors.error("\n" + (error as Error).message + "\n"));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}
