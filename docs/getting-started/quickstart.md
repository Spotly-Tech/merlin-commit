# Quick Start

Create your first conventional commit with merlin in five minutes.

**Prerequisite:** merlin-commit installed globally. See [Installation](installation.md) if you haven't done that yet.

<p align="center">
  <img src="../../.github/assets/gif-08-speed-run.gif" alt="merlin commit speed run" width="100%" />
</p>

---

## Step 1 - Stage your changes

Merlin requires at least one staged file before starting the commit workflow.

```bash
git add src/auth/login.ts
# or stage everything:
git add .
```

If you prefer to let merlin handle staging interactively, enable `autoAdd` in your config - see [Auto-Add](../usage/auto-add.md).

---

## Step 2 - Run merlin

```bash
merlin
```

The wizard opens with an intro message and begins the prompt sequence.

---

## Step 3 - Select a commit type

You will see a searchable list of commit types:

```
🧙 Merlin awaits your command...

? 🪄 Choose the type of spell:
❯ ✨  feat          A new feature visible to users
  🐛  fix           Resolves incorrect or broken behavior
  📚  docs          Changes to README, comments, or docs
  💄  style         Formatting - no logic changes
  🔧  refactor      Code restructuring, no behavior change
  🚀  perf          Measurable performance improvement
  🚨  test          Adding or fixing tests
  🔨  build         Build system or dependency changes
  ⚙️   ci            CI/CD pipeline configuration
  ♻️   chore         Maintenance, no production code
  ⏪  revert        Undo a previous commit
```

Use the arrow keys to move, Enter to confirm. Type characters to filter the list.

See [Commit Types](../usage/commit-types.md) for usage guidance on each type.

---

## Step 4 - Enter a scope (optional)

The scope describes which part of the codebase is affected. It is optional.

```
? 🎯 What domain does this affect? (optional)
```

**Rules:**

- Must start with a letter
- May contain letters, digits, and hyphens
- Maximum 20 characters (configurable)

**Examples of good scopes:** `auth`, `api`, `dashboard`, `user-profile`

Press Enter with an empty field to skip scope.

---

## Step 5 - Enter a subject

The subject is a short, required description of the change.

```
? 📝 Describe your spell briefly:
(0/72) _
```

The `(0/72)` counter updates as you type. It turns yellow near the limit and red if exceeded.

**Tips:**

- Use imperative mood: "add feature" not "added feature" or "adds feature"
- Describe what the change does, not how it does it
- Do not capitalize the first word
- Do not end with a period

```
(28/72) add OAuth login with GitHub
```

---

## Step 6 - Add optional fields

After the subject, merlin asks about three optional fields. Answer Yes to open your editor for each.

**Body** - detailed description:

```
? 📖 Would you like to weave a detailed tale? (y/N)
```

**Breaking changes:**

```
? ⚠️ Does this spell shatter ancient contracts? (y/N)
```

**Issue references:**

```
? 🔗 Does this resolve any quests? (y/N)
```

Answer No (the default) to skip all three. These fields open your configured editor when you answer Yes - see [Editor Integration](../usage/editor-integration.md).

---

## Step 7 - Review the preview

Merlin shows a formatted preview before creating the commit:

```
Commit Preview:
─────────────────────────────────────────────────────────────
feat(auth): add OAuth login with GitHub

Implements OAuth 2.0 authorization code flow with GitHub.
Tokens are stored in encrypted local storage.

⚠️ BREAKING CHANGE: The previous username/password endpoint
   has been removed.

🔗 Closes #88
─────────────────────────────────────────────────────────────
(⚠️ and 🔗 are visual indicators - not included in the commit)
```

The ⚠️ and 🔗 prefixes are display-only. The actual commit message contains `BREAKING CHANGE:` and the issue reference text without those emoji prefixes.

---

## Step 8 - Confirm

```
? 🔮 Shall Merlin cast this spell? (Y/n)
```

Press Enter (or Y) to create the commit. The default is Yes.

```
✓ Spell cast! [abc1234] feat(auth): add OAuth login with GitHub
```

---

## Cancelling

Press Ctrl+C at any prompt to cancel without creating a commit. Merlin exits cleanly with code 0.

<p align="center">
  <img src="../../.github/assets/gif-09-ctrl-c-exit.gif" alt="cancelling with Ctrl+C" width="100%" />
</p>

---

## Useful Flags

```bash
# Preview the commit message without creating it
merlin --dry-run

# Amend the most recent commit
merlin --amend

# Skip git hooks (use sparingly)
merlin --no-verify
```

<p align="center">
  <img src="../../.github/assets/gif-07-dry-run.gif" alt="dry run flag preview" width="100%" />
</p>

---

## Switching to the Standard Theme

Prefer a minimal, no-emoji interface? Switch to the standard theme:

```bash
merlin config
# → User config → Theme → standard
```

The same workflow applies, with plain text prompts instead of wizard-themed ones. See [Themes](../usage/themes.md) for a full comparison.

---

## Next Steps

- [Commit Types](../usage/commit-types.md) - Learn when to use each of the 11 types
- [Configuration](../reference/configuration.md) - Customize merlin for your workflow
- [CLI Reference](../reference/cli-reference.md) - All commands and flags
