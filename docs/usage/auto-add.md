# Auto-Add

The auto-add feature opens an interactive file picker when you run `merlin` with no staged changes. Instead of exiting with an error, merlin shows you all modified and untracked files and lets you select which ones to stage.

---

## Default Behavior vs. Auto-Add

| Behavior                 | Without auto-add (default)       | With auto-add enabled                            |
| ------------------------ | -------------------------------- | ------------------------------------------------ |
| No staged changes        | Error: "No staged changes found" | Opens interactive file picker                    |
| Files selected in picker | -                                | Selected files staged, then commit prompts begin |
| All files deselected     | -                                | Exits without committing                         |

---

## Enabling Auto-Add

### Via the config menu

```bash
merlin config
# → User config → Auto-add unstaged files → Yes
```

### Via config file

In `~/.merlinrc.json` (applies to all repositories):

```json
{
    "autoAdd": true
}
```

In `.merlinrc.json` (project-level override):

```json
{
    "autoAdd": true
}
```

---

## The Staging UI

When auto-add is enabled and no files are staged, merlin shows:

```
? 📜 Select scrolls to prepare for the ritual:   (wizard theme)
  ──────────────────────────────────────────
❯ ◉ src/auth/login.ts              (modified)
  ◉ src/auth/oauth.ts              (new file)
  ◉ tests/auth.test.ts             (modified)
  ◉ .env.example                   (new file)
  ○ node_modules/some-dep/file.js  (untracked)
```

**Standard theme equivalent:**

```
? Select files to stage:
```

**Key controls:**

| Key    | Action                                      |
| ------ | ------------------------------------------- |
| ↑ / ↓  | Move between files                          |
| Space  | Toggle selection                            |
| A      | Select all / deselect all                   |
| Enter  | Confirm and stage selected files            |
| Ctrl+C | Cancel - exit without staging or committing |

---

## File Selection Behavior

All files are **pre-checked** by default. This means the common case - staging everything - requires zero interaction: just press Enter.

To exclude specific files, press Space to deselect them before confirming.

**Files shown in the picker:**

| Status      | Description                                |
| ----------- | ------------------------------------------ |
| `modified`  | Tracked files with uncommitted changes     |
| `new file`  | Files tracked by git but not yet committed |
| `deleted`   | Tracked files that have been deleted       |
| `untracked` | Files not tracked by git                   |
| `renamed`   | Files that have been renamed               |
| `copied`    | Files that have been copied                |

---

## Deselecting All Files

If you deselect every file and confirm, merlin exits without staging anything and without creating a commit. This is the same as pressing Ctrl+C - it exits cleanly with code 0.

---

## Interaction with `--amend`

When using `merlin --amend`, the staged-changes check is skipped. Auto-add does not trigger for amend commits - `--amend` rewrites the most recent commit using the current staged state (which may be empty, leaving only the message to be changed).

---

## Auto-Add vs. `git add -p`

| Feature     | Auto-add                         | `git add -p`                     |
| ----------- | -------------------------------- | -------------------------------- |
| Granularity | Per file                         | Per hunk (within files)          |
| Interface   | Checkbox list                    | Interactive hunk-by-hunk prompts |
| Workflow    | Integrated into `merlin`         | Separate step before `merlin`    |
| Best for    | Selecting which files to include | Staging partial file changes     |

For fine-grained control over which lines within a file to stage, use `git add -p` manually before running `merlin`.

---

## Troubleshooting

### No files appear in the picker

All files are already staged, or the working tree is clean. Check with:

```bash
git status
```

### Unexpected files appear

The picker shows all files with uncommitted changes, including untracked files. If you see files you do not want to commit, deselect them in the picker.

To permanently exclude files (e.g., local config files), add them to `.gitignore`.

### Changes staged but I want to undo

After the picker confirms, merlin stages the selected files. If you cancel before the commit is created (Ctrl+C at any subsequent prompt), the files remain staged. Unstage them with:

```bash
git restore --staged <file>
# or unstage everything:
git restore --staged .
```

---

## Related

- [CLI Reference](../reference/cli-reference.md) - The `merlin` commit command
- [Configuration](../reference/configuration.md) - Enabling auto-add in config
