import { confirm, select } from "@inquirer/prompts";
import ora from "ora";

import { getMessages } from "../lib/config-loader.js";
import { getRepoRoot, isGitRepo } from "../lib/git.js";
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
import { normalizeVS16Spacing } from "../lib/terminal.js";
import type { InitOptions } from "../types/index.js";
import { colors } from "../utils/constants.js";

type ExistingSetup = Awaited<ReturnType<typeof detectExistingSetup>>;
type Messages = ReturnType<typeof getMessages>;
type Spinner = ReturnType<typeof ora>;

/**
 * Init command handler that sets up husky and commitlint for conventional commits.
 *
 * Performs the following setup steps:
 * 1. Validates git repository and package.json exist
 * 2. Detects existing setup files
 * 3. Installs dependencies (husky, `@commitlint/cli`, `@commitlint/config-conventional`)
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
    const repoRoot = await getRepoRoot();
    const messages = getMessages(repoRoot);
    const spinner = ora();
    const removeSigintHandler = setupSigintHandler(messages, () => spinner.stop());

    try {
        // Show intro
        console.log(colors.header(`\n${messages.init.intro}\n`));

        // Validate git repository
        spinner.start(messages.checking.repo);
        if (!(await isGitRepo())) {
            spinner.fail(colors.error(messages.errors.notRepo));
            console.log(colors.warning(`\n${messages.tips.init.runGitInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Validate package.json exists
        spinner.start(messages.init.checkingPackageJson);
        if (!(await hasPackageJson())) {
            spinner.fail(colors.error(messages.errors.init.noPackageJson));
            console.log(colors.warning(`\n${messages.tips.init.runNpmInit}\n`));
            process.exit(1);
        }
        spinner.succeed();

        // Detect existing setup files
        const existing = await detectExistingSetup();
        const hasExisting = Object.values(existing).some(Boolean);

        if (hasExisting) {
            console.log(colors.warning(`\n${messages.warnings.init.existingSetup}`));
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
                    spinner.fail(colors.error(messages.errors.init.installFailed));
                    console.error(colors.muted(`\n${(error as Error).message}`));
                    console.log(
                        colors.warning(
                            `\n${messages.tips.init.manualInstall} ${deps.join(" ")}\n`
                        )
                    );
                    process.exit(1);
                }
            }
        }

        const huskyInitialized = await runHuskySetup(
            options,
            existing,
            messages,
            spinner
        );
        const commitlintCreated = await runCommitlintSetup(
            options,
            existing,
            messages,
            spinner
        );

        let hookCreated = false;
        if (!options.huskyOnly && (!options.commitlintOnly || existing.husky)) {
            hookCreated = await runHookSetup(
                huskyInitialized,
                existing,
                messages,
                spinner
            );
        }

        const aliasCreated = await runAliasSetup(messages, spinner);
        const projectConfigCreated = await runProjectConfigSetup(
            existing,
            messages,
            spinner
        );

        // Success summary
        console.log(colors.success(`\n${messages.success.init.completed}`));
        console.log(colors.muted("\nCreated/updated:"));
        if (huskyInitialized) console.log(colors.muted("  • .husky/ directory"));
        if (commitlintCreated) console.log(colors.muted("  • commitlint.config.js"));
        if (hookCreated) console.log(colors.muted("  • .husky/commit-msg hook"));
        if (aliasCreated) console.log(colors.muted("  • git merlin alias"));
        if (projectConfigCreated)
            console.log(colors.muted("  • .merlinrc.json (project config)"));

        console.log(colors.primary(`\n${messages.tips.init.nextSteps}`));
        console.log(colors.muted("  1. Stage your changes: git add ."));
        console.log(colors.muted("  2. Create a commit: merlin (or git merlin)"));
        console.log(colors.muted(`\n${messages.init.exit}\n`));
    } catch (error) {
        if ((error as Error).name === "ExitPromptError") {
            spinner.stop();
            console.log(colors.warning(`\n${messages.warnings.cancel}\n`));
            process.exit(0);
        }
        spinner.fail();
        console.error(colors.error(`\n${(error as Error).message}\n`));
        process.exit(1);
    } finally {
        removeSigintHandler();
    }
}

async function runHuskySetup(
    options: InitOptions,
    existing: ExistingSetup,
    messages: Messages,
    spinner: Spinner
): Promise<boolean> {
    if (options.commitlintOnly) {
        return false;
    }

    const isHuskyInstalled = await isPackageInstalled("husky");
    if (!isHuskyInstalled) {
        console.log(
            colors.warning(
                normalizeVS16Spacing(
                    "  ⚠️  Skipping Husky initialization - husky not installed"
                )
            )
        );
        return false;
    }

    if (existing.husky) {
        const shouldInit = await confirm({
            message: messages.init.overwrite(".husky/"),
            default: false,
        });
        if (!shouldInit) {
            console.log(colors.muted(`  ${messages.init.skipExisting} .husky/`));
            return false;
        }
    }

    spinner.start(messages.init.initializingHusky);
    try {
        await initializeHusky();
        spinner.succeed();
        return true;
    } catch (error) {
        spinner.fail(colors.error(messages.errors.init.huskyFailed));
        console.error(colors.muted(`\n${(error as Error).message}\n`));
        process.exit(1);
    }
}

async function runCommitlintSetup(
    options: InitOptions,
    existing: ExistingSetup,
    messages: Messages,
    spinner: Spinner
): Promise<boolean> {
    if (options.huskyOnly) {
        return false;
    }

    const isCommitlintInstalled = await isPackageInstalled("@commitlint/cli");
    if (!isCommitlintInstalled) {
        console.log(
            colors.warning(
                normalizeVS16Spacing(
                    "  ⚠️  Skipping commitlint config - @commitlint/cli not installed"
                )
            )
        );
        return false;
    }

    if (existing.commitlintConfig) {
        const shouldCreate = await confirm({
            message: messages.init.overwrite("commitlint.config.js"),
            default: false,
        });
        if (!shouldCreate) {
            console.log(
                colors.muted(`  ${messages.init.skipExisting} commitlint.config.js`)
            );
            return false;
        }
    }

    spinner.start(messages.init.creatingCommitlint);
    try {
        await createCommitlintConfig();
        spinner.succeed();
        return true;
    } catch (error) {
        spinner.fail(colors.error(messages.errors.init.configFailed));
        console.error(colors.muted(`\n${(error as Error).message}\n`));
        process.exit(1);
    }
}

async function runHookSetup(
    huskyInitialized: boolean,
    existing: ExistingSetup,
    messages: Messages,
    spinner: Spinner
): Promise<boolean> {
    const isHookViable =
        (huskyInitialized || existing.husky) &&
        (await isPackageInstalled("@commitlint/cli"));

    if (!isHookViable) {
        console.log(
            colors.warning(
                normalizeVS16Spacing(
                    "  ⚠️  Skipping commit-msg hook - missing dependencies"
                )
            )
        );
        return false;
    }

    if (existing.commitMsgHook) {
        const shouldCreate = await confirm({
            message: messages.init.overwrite(".husky/commit-msg"),
            default: false,
        });
        if (!shouldCreate) {
            console.log(
                colors.muted(`  ${messages.init.skipExisting} .husky/commit-msg`)
            );
            return false;
        }
    }

    spinner.start(messages.init.creatingHook);
    try {
        await createCommitMsgHook();
        spinner.succeed();
        return true;
    } catch (error) {
        spinner.fail(colors.error(messages.errors.init.hookFailed));
        console.error(colors.muted(`\n${(error as Error).message}\n`));
        process.exit(1);
    }
}

async function runAliasSetup(messages: Messages, spinner: Spinner): Promise<boolean> {
    const wantsAlias = await confirm({
        message: messages.init.setupAlias,
        default: true,
    });

    if (!wantsAlias) {
        return false;
    }

    const existingAlias = await checkGitAlias();
    if (existingAlias) {
        console.log(
            colors.warning(`\n${messages.warnings.init.aliasExists}: ${existingAlias}`)
        );
        const shouldOverwrite = await confirm({
            message: messages.init.overwrite(),
            default: false,
        });
        if (!shouldOverwrite) {
            return false;
        }
    }

    const scope = await select({
        message: messages.init.aliasScope,
        choices: [
            { value: "global" as const, name: messages.init.aliasScopeGlobal },
            { value: "local" as const, name: messages.init.aliasScopeLocal },
        ],
    });

    spinner.start(messages.init.creatingAlias);
    try {
        await setupGitAlias(scope);
        spinner.succeed();
        return true;
    } catch (error) {
        spinner.fail(colors.error(messages.errors.init.aliasFailed));
        console.error(colors.muted(`\n${(error as Error).message}`));
        // Non-fatal: continue to success summary
        return false;
    }
}

async function runProjectConfigSetup(
    existing: ExistingSetup,
    messages: Messages,
    spinner: Spinner
): Promise<boolean> {
    const wantsProjectConfig = await confirm({
        message: messages.init.createProjectConfig,
        default: !existing.merlinConfig,
    });

    if (!wantsProjectConfig) {
        return false;
    }

    if (existing.merlinConfig) {
        const shouldCreate = await confirm({
            message: messages.init.overwrite(".merlinrc.json"),
            default: false,
        });
        if (!shouldCreate) {
            console.log(colors.muted(`  ${messages.init.skipExisting} .merlinrc.json`));
            return false;
        }
    }

    spinner.start(messages.init.creatingProjectConfig);
    try {
        await createProjectConfig();
        spinner.succeed();
        return true;
    } catch (error) {
        spinner.fail(colors.error(messages.errors.init.configFailed));
        console.error(colors.muted(`\n${(error as Error).message}`));
        // Non-fatal: continue to success summary
        return false;
    }
}
