# Contributing

Contributions are welcome - bug fixes, features, tests, and documentation improvements. This guide covers everything you need to go from a fresh clone to an open pull request.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](../../CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Before You Start

- **Bug reports and feature requests:** [GitHub Issues](https://github.com/mBukator/merlin-commit/issues). Search for existing issues before opening a new one.
- **Discussions and ideas:** [GitHub Discussions](https://github.com/mBukator/merlin-commit/discussions).
- **Small changes** (typo fixes, one-line bug fixes): feel free to open a PR directly.
- **Larger changes** (new features, significant refactors): open an issue first to discuss the approach. This avoids wasted effort if the direction needs adjustment.

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Clone and install

```bash
git clone https://github.com/mBukator/merlin-commit.git
cd merlin-commit
npm install
```

### Build

```bash
npm run build
```

This compiles TypeScript to `dist/`. The build must succeed before you can run the CLI.

### Link for local development

```bash
npm link
```

This installs the local build as a global `merlin` command. After making code changes, rebuild and the linked binary picks up the new output:

```bash
npm run build
merlin --version
```

### Watch mode

```bash
npm run dev
```

Recompiles automatically on file changes. Useful when iterating quickly, though you still need to save changes before testing them.

---

## Project Structure

```
merlin-commit/
├── bin/
│   └── merlin.js              Entry point (shebang wrapper)
├── src/
│   ├── cli.ts                 Commander.js program setup
│   ├── commands/              Orchestration layer
│   │   ├── commit.ts          Interactive commit workflow
│   │   ├── config.ts          Configuration management
│   │   └── init.ts            Project initialization wizard
│   ├── lib/                   Implementation layer
│   │   ├── commitlint-sync.ts Commitlint config sync
│   │   ├── config-loader.ts   Config I/O and merging
│   │   ├── editor-wrapper.ts  External editor integration
│   │   ├── git.ts             Git operations via execa
│   │   ├── message.ts         Commit message building
│   │   ├── prompt.ts          Interactive prompts
│   │   ├── setup.ts           Husky and commitlint setup
│   │   ├── sigint.ts          Ctrl+C signal handling
│   │   ├── terminal.ts        Emoji width normalization
│   │   └── transformers.ts    Character counter transformers
│   ├── types/                 TypeScript type definitions
│   │   ├── commit.ts
│   │   ├── config.ts
│   │   ├── theme.ts
│   │   ├── common.ts
│   │   ├── init.ts
│   │   └── index.ts           Barrel re-exports
│   └── utils/                 Pure helper functions
│       ├── config.ts          Config validation
│       ├── constants.ts       Commit types, themes, defaults
│       └── validators.ts      Inquirer input validators
├── tests/
│   └── unit/                  Unit tests (Vitest)
├── docs/                      Documentation
└── dist/                      Compiled output (git-ignored)
```

See [Architecture](architecture.md) for a detailed description of each layer's responsibilities and constraints.

---

## Development Scripts

| Script     | Command                 | When to use                                     |
| ---------- | ----------------------- | ----------------------------------------------- |
| Build      | `npm run build`         | Before testing locally, before committing       |
| Watch      | `npm run dev`           | During active development                       |
| Lint       | `npm run lint`          | Check code style (also runs in pre-commit hook) |
| Format     | `npm run format`        | Auto-format with Prettier                       |
| Type check | `npm run type-check`    | Verify TypeScript types without emitting        |
| Test       | `npm run test`          | Run full test suite once                        |
| Test watch | `npm run test:watch`    | Run tests on file changes                       |
| Coverage   | `npm run test:coverage` | Run tests with coverage report                  |
| Clean      | `npm run clean`         | Delete `dist/`                                  |

---

## Making Changes

### Create a branch

Follow the branching conventions:

```bash
# Feature
git checkout -b feat/my-feature-name

# Bug fix
git checkout -b fix/describe-the-fix

# Documentation
git checkout -b docs/what-you-are-documenting

# Maintenance
git checkout -b chore/what-you-are-doing
```

Always branch from `develop`, not `main`.

### Write tests

All changes should come with tests. The project targets 80% coverage on lines/statements/functions and 75% on branches.

- New utility functions: unit tests in `tests/unit/<module-name>.test.ts`
- New library modules: unit tests in `tests/unit/<module-name>.test.ts`
- New commands: tests in `tests/unit/<command-name>-command.test.ts`
- Bug fixes: add a test that would have caught the bug

See [Testing](testing.md) for patterns and examples.

### Write documentation

Any change that adds, removes, or modifies user-facing behavior must include a matching update to the relevant file in `docs/`. A PR that changes behavior without updating docs will not be merged.

Mapping:

- New CLI flags or changed flag behavior - `docs/reference/cli-reference.md`
- New config fields or changed defaults - `docs/reference/config-schema.md` and `docs/reference/configuration.md`
- New commands - `docs/reference/cli-reference.md` and `docs/index.md`
- New features - the appropriate guide file under `docs/`
- Behavior changes - whichever doc describes that behavior

If you are unsure which doc to update, check `docs/index.md` - it links every guide to its topic.

### Pre-PR quality check

Run the full quality check before opening a pull request:

```bash
npm run lint && npm run format && npm run type-check && npm run test && npm run build
```

All five must pass.

---

## Commit Message Requirements

This project uses conventional commits and validates them with commitlint. Use `merlin` to create commits:

```bash
merlin
```

If you prefer `git commit` directly, the format is:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

The `commit-msg` hook will reject messages that do not follow the format.

---

## Pull Request Process

1. Push your branch:

    ```bash
    git push -u origin feat/my-feature-name
    ```

2. Open a pull request against `develop` (not `main`). Follow the PR template.

3. All CI checks must pass: lint, type check, tests, and build.

4. At least one maintainer review is required before merging.

5. PRs are merged with **squash and merge** to keep a clean linear history on `develop`.

6. Delete your branch after merge.

---

## Code Style

The project enforces style automatically via ESLint and Prettier. Run `npm run format` to auto-fix formatting. Key rules:

- TypeScript: `type` preferred over `interface`, no `any`, strict equality (`===`)
- 4-space indentation, double quotes, semicolons
- Named constants for all magic values - no inline strings or numbers
- Boolean variable names use `is`, `has`, or `can` prefixes
- No single-letter variable names (except very short lambdas)
- All git commands must use `execa` with an args array - never string interpolation

See the `.claude/rules/` directory for complete style documentation.

---

## Security Requirements

- **No network calls** - merlin is fully offline
- **No telemetry** - zero data collection
- **No `eval()`** - never evaluate user input as code
- **All git commands use `execa` with args array** - prevents command injection
- **Config validation** - all user input is validated before use
- **Fixed file paths only** - never construct paths from user input

---

## Related

- [Architecture](architecture.md) - Code layers, data flow, design patterns
- [Testing](testing.md) - Test patterns, coverage requirements
- [Releases](releases.md) - Release process for maintainers
