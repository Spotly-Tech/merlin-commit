# CLI Reference

Complete reference for every `merlin` command, flag, and option.

---

## Synopsis

```
merlin [options]
merlin commit [options]
merlin config [options]
merlin init [options]
```

---

## Commands

### `merlin` / `merlin commit`

Launches the interactive commit wizard. Prompts for commit type, optional scope, subject, optional body, optional breaking changes, and optional issue references. Shows a formatted preview before creating the commit.

Alias: `merlin c`

**Requires:**

- Current directory must be inside a git repository
- At least one staged file (unless `autoAdd` is enabled - see [Auto-Add](../usage/auto-add.md))

**Flags:**

| Flag          | Type    | Default | Description                                                                                                          |
| ------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`   | boolean | false   | Run the full prompt sequence and show the preview, but do not create the commit. Exits after displaying the preview. |
| `--amend`     | boolean | false   | Amend the most recent commit instead of creating a new one. Skips the staged-changes check.                          |
| `--no-verify` | boolean | false   | Skip pre-commit and commit-msg git hooks. Shows a warning message before proceeding.                                 |

**Examples:**

```bash
# Standard interactive commit
merlin

# Preview commit message without creating it
merlin --dry-run

# Amend the previous commit
merlin --amend

# Skip git hooks (use sparingly)
merlin --no-verify

# Combine flags
merlin --amend --no-verify
```

---

### `merlin config`

Opens the interactive configuration menu or performs a non-interactive config operation.

Without flags, displays a scope selector (user or project), then a menu of configurable settings.

**Flags:**

| Flag      | Type                               | Default | Description                                                                                                                                                                                                     |
| --------- | ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--show`  | boolean or `"user"` or `"project"` | -       | Print the effective configuration as JSON and exit. Pass `user` to show only `~/.merlinrc.json`, `project` to show only the project `.merlinrc.json`. Without a value, shows the fully merged effective config. |
| `--reset` | boolean                            | false   | Reset the user configuration (`~/.merlinrc.json`) to built-in defaults, with a confirmation prompt.                                                                                                             |

**Examples:**

```bash
# Open interactive config menu
merlin config

# Show fully merged effective configuration
merlin config --show

# Show only user config
merlin config --show user

# Show only project config
merlin config --show project

# Reset user config to defaults (prompts for confirmation)
merlin config --reset
```

**Interactive menu structure:**

```
Scope selector
├── User config  (~/.merlinrc.json - applies to all repositories)
│   ├── Theme
│   ├── Max subject length
│   ├── Max scope length
│   ├── Default editor
│   ├── Auto-add unstaged files
│   ├── Show character counter
│   ├── Show current config
│   ├── Reset to defaults
│   └── Exit
└── Project config  (.merlinrc.json - applies to this repository)
    ├── [Fields currently set in project config]
    ├── [Fields available to add as overrides]
    ├── Sync to commitlint
    ├── Show current config
    ├── Reset to defaults
    └── Exit
```

---

### `merlin init`

Runs the project initialization wizard. Sets up husky git hooks and commitlint for commit message validation. Designed to be run once per repository, typically by a team lead.

**What it creates:**

- `node_modules/husky`, `node_modules/@commitlint/cli`, `node_modules/@commitlint/config-conventional` (via `npm install --save-dev`)
- `.husky/` directory (via `npx husky init`)
- `commitlint.config.js` (extends `@commitlint/config-conventional`)
- `.husky/commit-msg` hook (runs `npx --no-install commitlint --edit "$1"`)
- Optional: git alias `git merlin` pointing to `merlin`
- Optional: `.merlinrc.json` project config seeded with `{ "theme": "wizard" }`

**Flags:**

| Flag                | Type    | Default | Description                                                                   |
| ------------------- | ------- | ------- | ----------------------------------------------------------------------------- |
| `--husky-only`      | boolean | false   | Set up only the husky hooks. Skip creating `commitlint.config.js`.            |
| `--commitlint-only` | boolean | false   | Set up only `commitlint.config.js`. Skip initializing husky.                  |
| `--no-install`      | boolean | false   | Skip the `npm install` step. Use when the dependencies are already installed. |

**Requires:**

- Current directory must be inside a git repository
- A `package.json` file must exist in the repository

**Examples:**

```bash
# Full setup
merlin init

# Skip npm install (dependencies already present)
merlin init --no-install

# Only set up husky hooks
merlin init --husky-only

# Only create commitlint config
merlin init --commitlint-only

# Combine flags
merlin init --commitlint-only --no-install
```

---

## Flag Precedence

When the same setting can be controlled by both a CLI flag and a configuration value, the CLI flag always wins.

For example, if `"autoAdd": true` is set in `~/.merlinrc.json`, running `merlin` still respects that. But behavior defined in config is always overridable at the command line - they operate at different layers.

---

## Environment Variables

| Variable       | Used by  | Description                                                                                                                                                    |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EDITOR`       | `merlin` | Fallback editor command when no editor is configured. Example: `EDITOR=nano merlin`.                                                                           |
| `VISUAL`       | `merlin` | Secondary fallback editor, checked after `EDITOR`. Less commonly set.                                                                                          |
| `TERM_PROGRAM` | Internal | Detected automatically. Used to identify VS Code's integrated terminal (xterm.js) and adjust emoji spacing accordingly. Not intended for manual configuration. |

**Editor resolution order:**

1. `editor` field in project `.merlinrc.json`
2. `editor` field in user `~/.merlinrc.json`
3. `$EDITOR` environment variable
4. `$VISUAL` environment variable
5. `notepad` (Windows) or `vim` (Unix/macOS)

---

## Exit Codes

| Code | Meaning                                                                    |
| ---- | -------------------------------------------------------------------------- |
| `0`  | Success, or the user cancelled (Ctrl+C)                                    |
| `1`  | Fatal error (not a git repository, git not installed, commit failed, etc.) |

Cancellation via Ctrl+C at any prompt exits with code `0`. This makes it safe to use in scripts where you want to detect actual errors but treat user cancellation as normal.

---

## Commit Message Format

The commit message produced by `merlin` follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[(<scope>)][!]: <subject>

[body]

[BREAKING CHANGE: <description>]

[<issue references>]
```

- `type` - one of the 11 built-in types or a custom type (see [Commit Types](../usage/commit-types.md))
- `scope` - optional, enclosed in parentheses, max 20 characters (configurable)
- `!` - appended automatically when breaking changes are present
- `subject` - required, max 72 characters (configurable)
- `body` - optional, opened in external editor
- `BREAKING CHANGE:` - optional footer, prefix added automatically
- Issue references - optional, opened in external editor (e.g., `Closes #123`)

**Examples:**

```
feat: add user authentication
```

```
fix(api): handle null response from payment gateway
```

```
feat(auth)!: replace session tokens with JWTs

The old session-based auth system has been removed entirely.
All clients must migrate to the new JWT-based flow.

BREAKING CHANGE: Session cookies are no longer issued. Clients
must send a Bearer token in the Authorization header.

Closes #441
```

---

## Related

- [Configuration](configuration.md) - Setting defaults for flags via config file
- [Config Schema](config-schema.md) - All configurable fields
- [Auto-Add](../usage/auto-add.md) - Interactive staging when no files are staged
- [Editor Integration](../usage/editor-integration.md) - Setting up your preferred editor
