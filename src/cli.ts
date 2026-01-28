import chalk from "chalk";
import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { commitCommand } from "./commands/commit.js";
import { configCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const program = new Command();

program
    .name("merlin-commit")
    .description("🧙‍♂️ Magical, interactive CLI for creating conventional commits")
    .version(packageJson.version, "-v, --version", "Display version number");

// Default command (commit)
program
    .command("commit", { isDefault: true })
    .alias("c")
    .description("Create a conventional commit interactively")
    .option("--dry-run", "Preview commit message without creating commit")
    .option("--no-verify", "Skip git hooks (commitlint, husky)")
    .option("--amend", "Amend the previous commit")
    .action(commitCommand);

// Config command
program
    .command("config")
    .description("Manage Merlin configuration interactively")
    .option("--show", "Display current configuration")
    .option("--reset", "Reset configuration to defaults")
    .action(configCommand);

program
    .command("init")
    .description("Setup husky, commitlint, and project config")
    .option("--husky-only", "Only setup husky hooks")
    .option("--commitlint-only", "Only setup commitlint")
    .option("--no-install", "Skip npm install")
    .action(initCommand);

// Handle unknown commands
program.on("command:*", () => {
    console.error(chalk.red("\n✖ Invalid command: %s\n"), program.args.join(" "));
    program.help();
});

// Parse arguments
program.parse();
