# Config Schema

Complete reference for every field in `.merlinrc.json` (project config) and `~/.merlinrc.json` (user config). Both files share the same schema.

See [Configuration](configuration.md) for how the two files interact and how to manage them through the interactive menu.

---

## Schema Overview

Both config files are JSON objects at the top level. Every field is optional - omit fields you want to inherit from a lower-priority tier or leave at their defaults.

```json
{
    "theme": "wizard",
    "maxSubjectLength": 72,
    "maxScopeLength": 20,
    "editor": "vim",
    "autoAdd": false,
    "showCharacterCounter": true,
    "types": [ ... ]
}
```

Invalid values are silently ignored and the built-in default is used instead. Merlin does not reject a config file because of one bad field.

---

## Fields

---

### `theme`

**Type:** `"wizard"` | `"standard"`  
**Default:** `"wizard"`

Controls the UI theme used throughout the prompt sequence.

| Value        | Description                                                                             |
| ------------ | --------------------------------------------------------------------------------------- |
| `"wizard"`   | Magical themed prompts with emoji, color, and thematic vocabulary.                      |
| `"standard"` | Minimal prompts with plain text. Better for low-color terminals or accessibility needs. |

**Example:**

```json
{
    "theme": "standard"
}
```

See [Themes](../usage/themes.md) for a full comparison including exact prompt text for each theme.

---

### `maxSubjectLength`

**Type:** `number`  
**Default:** `72`  
**Valid range:** `10` to `200`

Maximum number of characters allowed in the commit subject line. The character counter turns yellow when you are within 10% of the limit and red when exceeded. Submission is blocked if the limit is exceeded.

The default of 72 follows the widely used convention that git log and many tools display the subject line without wrapping at this width.

**Example:**

```json
{
    "maxSubjectLength": 100
}
```

---

### `maxScopeLength`

**Type:** `number`  
**Default:** `20`  
**Valid range:** `5` to `50`

Maximum number of characters allowed in the commit scope. The character counter turns yellow when you are above 75% of the limit.

**Example:**

```json
{
    "maxScopeLength": 30
}
```

---

### `editor`

**Type:** `string`  
**Default:** `"vim"` (Unix / macOS) or `"notepad"` (Windows)

The command used to open an external editor for multi-line fields (body, breaking changes, issue references). The string is passed directly to the shell, so multi-word commands like `code --wait` are supported.

**Resolution order** - the first non-empty value wins:

1. `editor` in project `.merlinrc.json`
2. `editor` in user `~/.merlinrc.json`
3. `$EDITOR` environment variable
4. `$VISUAL` environment variable
5. Platform default (`vim` or `notepad`)

**Examples:**

```json
{ "editor": "vim" }
{ "editor": "nano" }
{ "editor": "code --wait" }
{ "editor": "emacsclient --wait" }
{ "editor": "subl --wait" }
```

See [Editor Integration](../usage/editor-integration.md) for per-editor setup instructions.

---

### `autoAdd`

**Type:** `boolean`  
**Default:** `false`

When `true`, running `merlin` with no staged changes opens an interactive checkbox picker listing all modified and untracked files. Selected files are staged before the commit prompt sequence begins.

When `false` (the default), `merlin` exits with an error if no files are staged.

**Example:**

```json
{
    "autoAdd": true
}
```

See [Auto-Add](../usage/auto-add.md) for the full staging UI walkthrough.

---

### `showCharacterCounter`

**Type:** `boolean`  
**Default:** `true`

When `true`, the subject and scope input fields display a real-time `(current/max)` character counter while typing.

- Subject (required field): counter always visible while typing. Threshold 90% = yellow, over limit = red.
- Scope (optional field): counter appears only when the field is non-empty. Threshold 75% = yellow, over limit = red.

When `false`, the counter is hidden. Length validation is still enforced - you are blocked from submitting if the limit is exceeded.

**Example:**

```json
{
    "showCharacterCounter": false
}
```

---

### `types`

**Type:** `CommitType[]`  
**Default:** The 11 built-in commit types

An array of commit type definitions. When this field is present, it **replaces** the built-in types entirely - the 11 defaults are not merged in.

To extend the built-ins, include all 11 default types in your array plus your additions.

**`CommitType` schema:**

| Field         | Type     | Required | Description                                                                        |
| ------------- | -------- | -------- | ---------------------------------------------------------------------------------- |
| `value`       | `string` | Yes      | The type keyword used in the commit message (e.g., `"feat"`, `"fix"`)              |
| `name`        | `string` | Yes      | Display name shown in the type selector prompt                                     |
| `description` | `string` | Yes      | Explanatory text shown alongside the type in the selector                          |
| `emoji`       | `string` | Yes      | Emoji character shown in the selector and (for wizard theme) in prompt decorations |

**Example - adding a custom type:**

```json
{
    "types": [
        {
            "value": "feat",
            "name": "feat",
            "description": "A new feature",
            "emoji": "✨"
        },
        { "value": "fix", "name": "fix", "description": "A bug fix", "emoji": "🐛" },
        {
            "value": "docs",
            "name": "docs",
            "description": "Documentation changes",
            "emoji": "📚"
        },
        {
            "value": "style",
            "name": "style",
            "description": "Code formatting, no logic changes",
            "emoji": "💄"
        },
        {
            "value": "refactor",
            "name": "refactor",
            "description": "Code restructuring",
            "emoji": "🔧"
        },
        {
            "value": "perf",
            "name": "perf",
            "description": "Performance improvements",
            "emoji": "🚀"
        },
        {
            "value": "test",
            "name": "test",
            "description": "Adding or fixing tests",
            "emoji": "🚨"
        },
        {
            "value": "build",
            "name": "build",
            "description": "Build system or dependencies",
            "emoji": "🔨"
        },
        {
            "value": "ci",
            "name": "ci",
            "description": "CI/CD configuration",
            "emoji": "⚙️"
        },
        {
            "value": "chore",
            "name": "chore",
            "description": "Maintenance, no production code",
            "emoji": "♻️"
        },
        {
            "value": "revert",
            "name": "revert",
            "description": "Undo a previous commit",
            "emoji": "⏪"
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

**`value` field constraints:**

- Used verbatim in the commit message header
- Should be lowercase
- Avoid spaces or special characters

---

## Validation Rules

| Field                  | Validation                               | On invalid value                                                |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `theme`                | Must be `"wizard"` or `"standard"`       | Ignored, falls back to default                                  |
| `maxSubjectLength`     | Must be a number greater than 0          | Ignored, falls back to default                                  |
| `maxScopeLength`       | Must be a number greater than 0          | Ignored, falls back to default                                  |
| `editor`               | Must be a non-empty string               | Ignored, falls back to default                                  |
| `autoAdd`              | Must be a boolean                        | Ignored, falls back to default                                  |
| `showCharacterCounter` | Must be a boolean                        | Ignored, falls back to default                                  |
| `types`                | Array, each entry filtered by type shape | Invalid entries filtered out; empty array falls back to default |

Unknown fields are silently ignored.

---

## Complete Annotated Example

```json
{
    // UI theme: "wizard" (default) or "standard"
    "theme": "wizard",

    // Subject line character limit (10-200, default 72)
    "maxSubjectLength": 72,

    // Scope character limit (5-50, default 20)
    "maxScopeLength": 20,

    // External editor command for body/breaking/issues fields
    "editor": "vim",

    // Stage files interactively when none are staged (default false)
    "autoAdd": false,

    // Show (current/max) counter on subject and scope inputs (default true)
    "showCharacterCounter": true,

    // Custom commit types (replaces the 11 defaults when present)
    "types": [
        {
            "value": "feat",
            "name": "feat",
            "description": "A new feature visible to users",
            "emoji": "✨"
        },
        {
            "value": "fix",
            "name": "fix",
            "description": "Resolves incorrect or broken behavior",
            "emoji": "🐛"
        }
    ]
}
```

---

## Related

- [Configuration](configuration.md) - How tiers merge and common configuration tasks
- [Commit Types](../usage/commit-types.md) - Descriptions and usage guidance for all 11 built-in types
- [Team Setup](../guides/team-setup.md) - Using project config for team-wide standards
