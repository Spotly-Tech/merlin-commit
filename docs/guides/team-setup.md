# Team Setup

This guide walks a team lead through setting up merlin-commit for a repository so that the whole team produces consistent commit messages. The setup takes about ten minutes.

---

## Prerequisites

- Node.js >= 22.0.0 on all developer machines
- A git repository with a `package.json` (any Node.js project)
- npm, yarn, or pnpm

---

## Setup Checklist

- [ ] Step 1: Add merlin-commit as a dev dependency
- [ ] Step 2: Create a project config file (`.merlinrc.json`)
- [ ] Step 3: Run `merlin init` to scaffold husky and commitlint
- [ ] Step 4: Sync merlin rules to commitlint
- [ ] Step 5: Verify the hook chain
- [ ] Step 6: Commit everything and onboard teammates

---

## Step 1 - Add as Dev Dependency

Installing as a dev dependency pins the version for the whole team:

```bash
npm install -D merlin-commit
```

This adds merlin-commit to `devDependencies` in `package.json`. Everyone who runs `npm install` will get the same version.

Add a convenience script to `package.json`:

```json
{
    "scripts": {
        "commit": "merlin"
    }
}
```

Developers can then use `npm run commit` as an alternative to the global `merlin` command.

---

## Step 2 - Create a Project Config

Create `.merlinrc.json` at the repository root with your team's standards:

```json
{
    "theme": "wizard",
    "maxSubjectLength": 72,
    "maxScopeLength": 20
}
```

You can also let `merlin init` create an initial file in Step 3 and edit it afterward.

**What to configure at the project level:**

- `maxSubjectLength` - if your team uses a different limit than the default 72
- `maxScopeLength` - if your team uses longer scope names
- `types` - if your project uses non-standard commit types
- `theme` - team-wide preference (individuals can override with their own `~/.merlinrc.json`)

Do not put `editor` or `autoAdd` in the project config - those are personal preferences that belong in each developer's `~/.merlinrc.json`.

Commit this file to version control:

```bash
git add .merlinrc.json
```

---

## Step 3 - Run `merlin init`

The init wizard scaffolds husky and commitlint:

```bash
npx merlin init
```

Or, if you have it installed globally:

```bash
merlin init
```

**What the wizard does:**

1. Asks to install husky, `@commitlint/cli`, and `@commitlint/config-conventional` as dev dependencies
2. Initializes husky (creates `.husky/`)
3. Creates `commitlint.config.js`
4. Creates `.husky/commit-msg` hook (runs commitlint on every commit)
5. Optionally creates a git alias (`git merlin`)
6. Optionally creates a project config (if you skipped Step 2)

After the wizard, you will have:

```
.husky/
  commit-msg       ← runs commitlint on every commit
commitlint.config.js
package.json       ← updated with husky, @commitlint/cli, @commitlint/config-conventional
```

The `commit-msg` hook content:

```bash
#!/bin/sh
npx --no-install commitlint --edit "$1"
```

This validates every commit message against commitlint rules, whether the commit was created by merlin or by any other tool (including `git commit -m`).

**Using flags to skip steps:**

```bash
# Skip npm install (if dependencies are already installed)
merlin init --no-install

# Only set up husky, skip commitlint
merlin init --husky-only

# Only create commitlint config, skip husky
merlin init --commitlint-only
```

---

## Step 4 - Sync Merlin Rules to Commitlint

If your project config sets `maxSubjectLength`, `maxScopeLength`, or custom `types`, sync those values to `commitlint.config.js` so that commitlint enforces the same rules:

```bash
merlin config
# → Project config → Sync to commitlint
```

This writes the corresponding commitlint rules to `commitlint.config.js`:

```js
// @merlin-managed
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "subject-max-length": [2, "always", 72],
        "scope-max-length": [2, "always", 20],
    },
};
```

Re-run sync any time you change `maxSubjectLength`, `maxScopeLength`, or `types` in the project config to keep the two files in agreement. See [Commitlint Integration](commitlint-integration.md) for details.

---

## Step 5 - Verify the Hook Chain

Make a test commit to confirm the hook chain works:

```bash
# Stage a file
git add .merlinrc.json

# Attempt a commit with an invalid message (should be rejected)
git commit -m "bad message"
# Expected: commitlint rejects the message

# Attempt a commit with a valid message (should succeed)
git commit -m "chore: add merlin-commit and commitlint"
# Expected: hook passes, commit created
```

If the hook does not fire, check that `.husky/commit-msg` exists and is executable:

```bash
ls -la .husky/commit-msg
chmod 755 .husky/commit-msg
```

---

## Step 6 - Commit and Onboard Teammates

Commit all generated files:

```bash
git add package.json package-lock.json .husky/ commitlint.config.js .merlinrc.json
merlin
# type: chore
# scope: setup
# subject: add merlin-commit, husky, and commitlint
```

Add a section to your repository's README so teammates know how to get started:

```markdown
## Commits

This repository uses [Conventional Commits](https://www.conventionalcommits.org/).

Install dependencies:
\`\`\`bash
npm install
\`\`\`

Create commits with the interactive wizard:
\`\`\`bash
npm run commit
\`\`\`

Or, if merlin-commit is installed globally:
\`\`\`bash
merlin
\`\`\`

Commit messages are validated automatically by a git hook.
```

---

## Per-Developer Configuration

Each developer can override project settings with their own `~/.merlinrc.json`. This is the right place for personal preferences:

- `theme` - personal UI preference (wizard vs. standard)
- `editor` - preferred editor (`code --wait`, `nvim`, etc.)
- `autoAdd` - whether to use the interactive file picker
- `showCharacterCounter` - whether to show the character counter

Project config values take precedence over user config for fields like `maxSubjectLength` and `types` - developers cannot override team-wide standards without editing the project config.

---

## Upgrading merlin-commit

Update the pinned version:

```bash
npm install -D merlin-commit@latest
```

Review the [releases page](../development/releases.md) for any breaking changes that require config updates, then commit the updated `package.json` and lockfile.

---

## Troubleshooting Hook Failures

### Hook fires but commits still go through with bad messages

Check that the hook file runs commitlint:

```bash
cat .husky/commit-msg
# Should contain: npx --no-install commitlint --edit "$1"
```

If the file is empty or missing, re-run `merlin init`.

### `npx --no-install commitlint` fails with "module not found"

`@commitlint/cli` is not installed. Run:

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

### Hook is not running at all

Husky must be initialized after `npm install`. If developers cloned the repo and hooks are not firing, check that `prepare` is in `package.json` scripts:

```json
{
    "scripts": {
        "prepare": "husky"
    }
}
```

If it is missing, add it and re-run `npm install`.

---

## Related

- [Configuration](../reference/configuration.md) - Config files and the three-tier merge model
- [Config Schema] - All project config fields
- [Commitlint Integration](commitlint-integration.md) - Keeping merlin and commitlint in sync
- [Installation](../getting-started/installation.md) - Per-developer install instructions
