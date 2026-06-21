# Commitlint Integration

Merlin Commit can write its configuration rules directly to your `commitlint.config.js`, so that the commit-msg git hook enforces the same constraints that merlin validates interactively. This keeps the two tools in sync without manual maintenance.

---

## What Commitlint Sync Does

When you trigger the sync, merlin:

1. Reads your current project config (`maxSubjectLength`, `maxScopeLength`, and `types` if custom)
2. Translates them into commitlint rule format
3. Writes or updates `commitlint.config.js`

**Rules written:**

| Config field             | Commitlint rule                              |
| ------------------------ | -------------------------------------------- |
| `maxSubjectLength`       | `subject-max-length: [2, "always", <value>]` |
| `maxScopeLength`         | `scope-max-length: [2, "always", <value>]`   |
| `types` (only if custom) | `type-enum: [2, "always", [<values>]]`       |

`type-enum` is only written when you have defined custom types. When using the 11 default types, commitlint's `@commitlint/config-conventional` already covers conventional type validation.

---

## Triggering Sync

```bash
merlin config
# → Project config → Sync to commitlint
```

This is available only in the **Project config** scope (not User config), because commitlint config is per-repository.

Re-run sync whenever you change `maxSubjectLength`, `maxScopeLength`, or `types` in `.merlinrc.json`.

---

## Config File Format Detection

Merlin detects the format of your existing commitlint config and handles each differently:

| Format              | File examples                                    | Sync behavior                                                     |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| JSON                | `.commitlintrc`, `.commitlintrc.json`            | Merges rules directly into the JSON `rules` object                |
| JS (merlin-managed) | `commitlint.config.js` with `// @merlin-managed` | Regenerates the entire file                                       |
| JS (user-authored)  | `commitlint.config.js` without the marker        | Returns manual instructions - merlin does not overwrite custom JS |
| YAML                | `.commitlintrc.yaml`, `.commitlintrc.yml`        | Returns manual instructions                                       |

The `// @merlin-managed` comment is how merlin identifies files it generated (or files you have explicitly marked as safe to regenerate).

---

## The Generated File

When merlin creates or regenerates `commitlint.config.js`, it produces:

```js
// @merlin-managed
// This file is managed by merlin-commit. Run 'merlin config' → Project config → Sync to commitlint to update.
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "subject-max-length": [2, "always", 72],
        "scope-max-length": [2, "always", 20],
    },
};
```

With custom types:

```js
// @merlin-managed
// This file is managed by merlin-commit. Run 'merlin config' → Project config → Sync to commitlint to update.
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "subject-max-length": [2, "always", 100],
        "scope-max-length": [2, "always", 30],
        "type-enum": [2, "always", ["feat", "fix", "docs", "infra"]],
    },
};
```

---

## Customizing Beyond Sync

Because merlin only writes `subject-max-length`, `scope-max-length`, and optionally `type-enum`, you can safely add additional rules to the `rules` object without them being overwritten:

```js
// @merlin-managed
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "subject-max-length": [2, "always", 72],
        "scope-max-length": [2, "always", 20],
        // Added manually - merlin sync will not overwrite these:
        "subject-case": [2, "always", "lower-case"],
        "scope-enum": [1, "always", ["api", "auth", "ui", "db"]],
    },
};
```

Merlin only touches the specific rule keys it manages. Unknown keys are preserved.

---

## Handling Config Drift

Config drift occurs when `.merlinrc.json` and `commitlint.config.js` define different limits - for example, if someone updates `maxSubjectLength` in `.merlinrc.json` without re-running sync.

To check for drift and fix it:

```bash
# View current merlin project config
merlin config --show project

# Run sync to update commitlint rules
merlin config
# → Project config → Sync to commitlint
```

In a team setting, add a reminder in your PR template or development checklist: "If you changed `maxSubjectLength`, `maxScopeLength`, or `types` in `.merlinrc.json`, run the commitlint sync."

---

## Opting Out of Sync

If you want to manage `commitlint.config.js` entirely by hand, do not use the sync feature. Merlin will not touch a file that lacks the `// @merlin-managed` marker unless the format is JSON.

To opt a previously merlin-managed JS file back to manual management: remove the `// @merlin-managed` comment. Merlin will then treat the file as user-authored and return manual instructions instead of writing to it.

---

## Manual Instructions

When merlin cannot write to a config file (user-authored JS or YAML), it returns instructions you can apply by hand. Example for YAML:

```
Merlin cannot automatically update your YAML commitlint config.
Add the following rules to .commitlintrc.yaml:

rules:
  subject-max-length:
    - 2
    - always
    - 72
  scope-max-length:
    - 2
    - always
    - 20
```

---

## Troubleshooting

### "Sync to commitlint" does not appear in the project config menu

The option appears only when a commitlint config file is detected in the current repository. If no file exists, `merlin init` creates one, after which sync becomes available.

### Sync runs but commitlint still rejects valid commits

The commitlint config may have been updated but the old cached version is in use. Try:

```bash
npx commitlint --print-config
```

to see the active rules, and compare with what merlin wrote.

### Sync writes to the wrong file

Merlin uses a fixed detection order. If you have multiple commitlint config files, the first one found wins. Detection order: `.commitlintrc` → `.commitlintrc.json` → `.commitlintrc.yaml` → `.commitlintrc.yml` → `.commitlintrc.js` → `commitlint.config.js` → `commitlint.config.ts`.

---

## Related

- [Team Setup](team-setup.md) - Full team onboarding guide
- [Config Schema] - Fields that affect sync (`maxSubjectLength`, `maxScopeLength`, `types`)
- [Configuration](../reference/configuration.md) - Project vs. user config
