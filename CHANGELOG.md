# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Raise the minimum supported Node.js version to 22

    The declared `engines.node` range of `>=18` was already inaccurate:
    `commander@15` requires Node `>=22.12.0`, so v1.0.1 could not install or
    run on Node 18 or 20 despite claiming support. This corrects the declared
    range to match reality rather than removing working functionality. Node 18
    and 20 are both past end-of-life.

- Update production dependencies: `chalk` 5 to 6, `execa` 9 to 10,
  `@inquirer/prompts` to 8.6.0, `ora` to 9.4.1

    `@inquirer/prompts` 8.5.2 hardens temp-file handling in `external-editor`,
    which backs the external editor flow. No merlin code changes were required:
    only chalk colour helpers are used, and every `execa` call site uses the
    `execa(file, argsArray)` form that both majors support.

- Run CI and release workflows on Node 22 so the supported floor is actually exercised

## [1.0.1] - 2026-07-05

### Fixed

- Correct the LICENSE copyright holder to Maksym Bukator

### Changed

- Add knip unused-code detection to CI and the pre-push hook
- Broaden the Prettier format check to cover docs and test files
- Update development dependencies to resolve security advisories (vite, flatted, js-yaml)
- Retarget Dependabot at the develop branch

## [1.0.0] - 2026-05-29

### Added

- Interactive commit wizard with wizard and standard theme support
- Real-time character counter on subject and scope input fields
- Commit preview with formatted output before confirmation
- External editor integration for body, breaking change, and issue reference fields
- `merlin config` - interactive configuration menu with user and project scope selectors
- `merlin config --show` - display effective, user, or project config as JSON
- `merlin config --reset` - reset user config to defaults with confirmation
- `merlin init` - one-command setup wizard for husky and commitlint
- `merlin init --husky-only` and `--commitlint-only` flags for partial setup
- 3-tier config merge pipeline: defaults - user (`~/.merlinrc.json`) - project (`.merlinrc.json`)
- Project config management: create, update, remove individual fields, reset
- Auto-add flow: interactive file selection when no staged changes and `autoAdd` is enabled
- commitlint sync: propagate merlin config rules to existing commitlint config files
- `--dry-run` flag: build and preview the commit message without creating a commit
- `--amend` flag: amend the previous commit with a new message
- `--no-verify` flag: bypass git hooks when creating a commit
- `showCharacterCounter` config option to disable prompt counters
- `maxScopeLength` config option for scope field validation
- VS16 emoji width normalization for consistent display across terminals
- Graceful Ctrl+C handling with clean exit on all interactive prompts
- 506 tests across 20 test files (17 unit, 3 integration)
- GitHub Actions CI workflow on push and pull request to main and develop
- GitHub Actions release workflow publishing to npm on version tag push

### Fixed

- Breaking change `!` marker missing from commit header
- Duplicate `BREAKING CHANGE:` prefix when user types the prefix manually
- Editor fields failing on Windows due to shell injection prevention gaps
- Blank checkmark artifact in editor label display
- Malformed project config silently swallowed instead of warned
- VS16 emoji rendering as 1-column wide on terminals that render them as 2-column
- Decimal inputs accepted by numeric range validators
- Git system errors swallowed instead of re-thrown
- Missing newline before intro message in commit flow
- `--no-install` flag not following Commander.js convention
- Dependent init steps proceeding when packages were not installed
- `commit-msg` hook missing bash shebang and unquoted argument
