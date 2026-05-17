# Configuration

Merlin Commit uses a three-tier configuration system. Settings cascade from built-in defaults through a user-level file to a project-level file, with each tier able to override the one before it.

---

## How Configuration Works

```
Built-in defaults
       ↓  (overridden by)
~/.merlinrc.json           (user config - applies to all repositories)
       ↓  (overridden by)
.merlinrc.json             (project config - applies to this repository only)
       ↓
Effective config used at runtime
```

**What this means in practice:**

- Your personal preferences (editor, theme) live in `~/.merlinrc.json` and follow you everywhere.
- Team-wide standards (subject length, custom types) live in the repository's `.merlinrc.json` and apply to everyone who clones the project.
- Project config wins over user config when both define the same field.
- If neither file sets a field, the built-in default applies.

---

## Configuration Files

### User Config - `~/.merlinrc.json`

Stored in your home directory. Applies to every repository on your machine. Never checked into version control.

Created and managed via `merlin config` → **User config** menu, or by editing the file directly.

**Default location:**

- Linux / macOS: `~/.merlinrc.json`
- Windows: `C:\Users\<username>\.merlinrc.json`

### Project Config - `.merlinrc.json`

Stored at the root of a git repository (next to `package.json`). Applies only to that repository. Should be committed to version control so the whole team shares the same settings.

Created and managed via `merlin config` → **Project config** menu, or by editing the file directly. The `merlin init` wizard can also create an initial project config.

**File format:** JSON with 4-space indentation.

When first created through `merlin`, the project config is seeded with:

```json
{
    "theme": "wizard"
}
```

---

## The Interactive Config Menu

Run `merlin config` to open the interactive menu.

### Step 1 - Scope selector

```
? Which configuration would you like to edit?
❯ User config (applies to all repos - ~/.merlinrc.json)
  Project config (applies to this repo - .merlinrc.json)
```

### Step 2a - User config menu

```
? What would you like to configure?
❯ 🎨 Theme                   wizard
  📏 Max subject length        72
  🎯 Max scope length          20
  📝 Default editor            vim
  🔄 Auto-add unstaged files   false
  🔢 Show character counter    true
  ─────────────────────────────────
  👁️  Show current config
  🗑️  Reset to defaults
  👋 Exit
```

<p align="center">
  <img src="../../.github/assets/gif-06-config-menu.gif" alt="interactive config menu" width="100%" />
</p>

### Step 2b - Project config menu

The project config menu shows only the fields currently set as overrides, plus an option to add new overrides. For each existing override, you can change its value or remove it from the project config entirely (falling back to user config or defaults).

```
? What would you like to configure?
❯ 📏 Max subject length [project override: 100]
  ─────────────────────────────────
  Add override: Theme
  Add override: Max scope length
  Add override: Default editor
  Add override: Auto-add unstaged files
  Add override: Show character counter
  ─────────────────────────────────
  🔗 Sync to commitlint
  👁️  Show current config
  🗑️  Reset to defaults
  ⬅️  Back
  👋 Exit
```

---

## Common Configuration Tasks

### Change the UI theme

```bash
merlin config
# → User config → Theme → standard
```

Or edit `~/.merlinrc.json`:

```json
{
    "theme": "standard"
}
```

See [Themes](../usage/themes.md) for a comparison of both themes.

### Enable auto-add

When `autoAdd` is true, running `merlin` when no files are staged opens an interactive file picker instead of exiting with an error.

```bash
merlin config
# → User config → Auto-add unstaged files → Yes
```

Or in `~/.merlinrc.json`:

```json
{
    "autoAdd": true
}
```

See [Auto-Add](../usage/auto-add.md) for details.

### Set a default editor

```bash
merlin config
# → User config → Default editor → code --wait
```

Or in `~/.merlinrc.json`:

```json
{
    "editor": "code --wait"
}
```

See [Editor Integration](../usage/editor-integration.md) for per-editor instructions.

### Increase the subject length limit

The default maximum is 72 characters. To raise it for a project:

```bash
merlin config
# → Project config → Add override: Max subject length → 100
```

Or in `.merlinrc.json`:

```json
{
    "maxSubjectLength": 100
}
```

### Define custom commit types

Custom types replace the default 11 types. Define them in `.merlinrc.json` to share them with your team:

```json
{
    "types": [
        {
            "value": "feat",
            "name": "feat",
            "description": "A new feature",
            "emoji": "✨"
        },
        {
            "value": "fix",
            "name": "fix",
            "description": "A bug fix",
            "emoji": "🐛"
        },
        {
            "value": "infra",
            "name": "infra",
            "description": "Infrastructure or deployment changes",
            "emoji": "🏗️"
        }
    ]
}
```

See [Commit Types](../usage/commit-types.md) and [Config Schema](config-schema.md#types) for details.

### Disable the character counter

```json
{
    "showCharacterCounter": false
}
```

Validation is still enforced - only the visual counter is hidden.

<p align="center">
  <img src="../../.github/assets/gif-02-char-counter.gif" alt="character counter on subject and scope inputs" width="100%" />
</p>

---

## Viewing the Effective Config

```bash
# Show the fully merged effective config
merlin config --show

# Show only your user config (~/.merlinrc.json)
merlin config --show user

# Show only the project config (.merlinrc.json)
merlin config --show project
```

---

## Resetting Configuration

### Reset user config

```bash
merlin config --reset
```

Prompts for confirmation, then resets `~/.merlinrc.json` to built-in defaults.

### Reset project config

```bash
merlin config
# → Project config → Reset to defaults
```

---

## Manual Editing

Both config files are plain JSON. You can edit them directly in any text editor. Merlin validates the file on load and silently ignores any fields with invalid values (they fall back to defaults).

**Valid example (`~/.merlinrc.json`):**

```json
{
    "theme": "wizard",
    "maxSubjectLength": 72,
    "maxScopeLength": 20,
    "editor": "vim",
    "autoAdd": false,
    "showCharacterCounter": true
}
```

---

## Related

- [Config Schema](config-schema.md) - Complete field reference with types, defaults, and valid ranges
- [Commit Types](../usage/commit-types.md) - Built-in and custom commit types
- [Team Setup](../guides/team-setup.md) - Rolling out project config to a team
- [CLI Reference](cli-reference.md) - The `merlin config` command flags
