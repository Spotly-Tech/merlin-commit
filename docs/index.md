# Merlin Commit Documentation

**Merlin Commit** is an interactive CLI for creating [Conventional Commits](https://www.conventionalcommits.org/). It guides you through each part of a commit message with a prompt sequence, validates your input in real time, and produces consistently formatted messages your whole team can rely on.

| Property | Value           |
| -------- | --------------- |
| Package  | `merlin-commit` |
| Binary   | `merlin`        |
| Node.js  | >= 22.0.0       |
| License  | MIT             |

---

## Install

```bash
npm install -g merlin-commit
```

Then run `merlin` inside any git repository with staged changes.

---

## Quick Start

**First commit:**

```bash
git add .
merlin
```

**Team setup (one-time, per repository):**

```bash
npm install -D merlin-commit
merlin init
```

**Preview a commit without creating it:**

```bash
merlin --dry-run
```

---

## Documentation by Audience

### End Users

You want to create commits and understand what merlin-commit can do.

| Document                                          | Description                                 |
| ------------------------------------------------- | ------------------------------------------- |
| [Installation](getting-started/installation.md)   | Requirements, install methods, uninstalling |
| [Quick Start](getting-started/quickstart.md)      | Your first commit, step by step             |
| [Commit Types](usage/commit-types.md)             | All 11 built-in types with usage guidance   |
| [Themes](usage/themes.md)                         | Wizard (default) and standard themes        |
| [Editor Integration](usage/editor-integration.md) | VS Code, Neovim, Emacs, Nano setup          |
| [Auto-Add](usage/auto-add.md)                     | Interactive file staging before committing  |
| [CLI Reference](reference/cli-reference.md)       | Every command, flag, and option             |

### Team Leads

You want to roll out merlin-commit across a repository with consistent standards.

| Document                                                   | Description                                |
| ---------------------------------------------------------- | ------------------------------------------ |
| [Team Setup](guides/team-setup.md)                         | Step-by-step team rollout guide            |
| [Configuration](reference/configuration.md)                | Config files, merge strategy, common tasks |
| [Commitlint Integration](guides/commitlint-integration.md) | Syncing merlin rules to commitlint         |
| [Config Schema]                                            | Every config field documented              |

### Advanced Users

You want to customize behavior beyond the defaults.

| Document                                          | Description                                |
| ------------------------------------------------- | ------------------------------------------ |
| [Config Schema]                                   | Custom types, all field details            |
| [Configuration](reference/configuration.md)       | Three-tier merge, project overrides        |
| [Editor Integration](usage/editor-integration.md) | Advanced editor configuration              |
| [Themes](usage/themes.md)                         | Theme internals and terminal compatibility |

### Contributors

You want to contribute code or understand how the project is built.

| Document                                    | Description                              |
| ------------------------------------------- | ---------------------------------------- |
| [Contributing](development/contributing.md) | Development setup, PR process            |
| [Architecture](development/architecture.md) | Code layers, data flow, design decisions |
| [Testing](development/testing.md)           | Test patterns, running tests, coverage   |
| [Releases](development/releases.md)         | Release process for maintainers          |

---

## All Documents

- [Installation](getting-started/installation.md) - Installing merlin-commit globally or as a project dependency
- [Quick Start](getting-started/quickstart.md) - Create your first conventional commit in five minutes
- [Commit Types](usage/commit-types.md) - Built-in and custom commit type reference
- [Themes](usage/themes.md) - Wizard and standard UI themes
- [Editor Integration](usage/editor-integration.md) - Configuring your preferred external editor
- [Auto-Add](usage/auto-add.md) - Interactive file staging before the commit prompt
- [Configuration](reference/configuration.md) - How configuration works and common tasks
- [Config Schema] - Complete `.merlinrc.json` field reference
- [Team Setup](guides/team-setup.md) - Rolling out merlin-commit across a repository
- [Commitlint Integration](guides/commitlint-integration.md) - Syncing merlin config to commitlint
- [CLI Reference](reference/cli-reference.md) - All commands, flags, and environment variables
- [Contributing](development/contributing.md) - Development setup and contribution workflow
- [Architecture](development/architecture.md) - Internal code architecture for contributors
- [Testing](development/testing.md) - Test patterns and coverage requirements
- [Releases](development/releases.md) - Release process for maintainers
- [Glossary](GLOSSARY.md) - Wizard-theme vocabulary reference

---

## Getting Help

- **Bugs and feature requests:** [GitHub Issues](https://github.com/mBukator/merlin-commit/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mBukator/merlin-commit/discussions)
- **Changelog:** [Releases](development/releases.md)
