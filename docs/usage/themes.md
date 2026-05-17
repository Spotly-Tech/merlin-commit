# Themes

Merlin Commit ships with two UI themes. Both produce identical commit messages - the theme only affects the prompt text and visual decoration.

---

## The Wizard Theme (Default)

The wizard theme uses magical vocabulary, emoji decorations, and color to make the commit workflow feel distinct and memorable.

**Commit prompts (wizard):**

```
🧙 Merlin awaits your command...

? 🪄 Choose the type of spell:
❯ ✨  feat          A new feature visible to users
  🐛  fix           ...

? 🎯 What domain does this affect? (optional)

? 📝 Describe your spell briefly:
(0/72) _

? 📖 Would you like to weave a detailed tale? (y/N)

? ⚠️ Does this spell shatter ancient contracts? (y/N)

? 🔗 Does this resolve any quests? (y/N)

? 🔮 Shall Merlin cast this spell? (Y/n)

✓ Spell cast! [abc1234] feat(auth): add login
```

**Config prompts (wizard):**

```
? Which configuration would you like to edit?
❯ User config (applies to all repos - ~/.merlinrc.json)
  Project config (applies to this repo - .merlinrc.json)
```

**Init prompts (wizard):**

```
🧙 Merlin will bless your realm with commit guardians

? 📦 Summon husky and commitlint from the ether? (Y/n)
? 🔗 Bind 'git merlin' to your spellbook? (y/N)
? 📜 Create a realm tome for team sharing? (y/N)
```

**Vocabulary:** The wizard theme uses thematic synonyms for common concepts. See [Glossary](../GLOSSARY.md) for the full vocabulary map.

---

## The Standard Theme

The standard theme uses plain, direct language with no thematic vocabulary or decorative emoji. It is easier to read quickly and has no dependency on emoji rendering.

**Commit prompts (standard):**

```
? Select the type of change:
❯ feat      A new feature visible to users
  fix       ...

? Scope (optional):

? Short description:
(0/72) _

? Add a detailed description? (y/N)

? Are there any breaking changes? (y/N)

? Reference any issues? (y/N)

? Create this commit? (Y/n)

✓ Commit created: [abc1234] feat(auth): add login
```

**Config prompts (standard):**

```
? Which configuration would you like to edit?
❯ User config (applies to all repos - ~/.merlinrc.json)
  Project config (applies to this repo - .merlinrc.json)
```

---

## When to Use Each Theme

| Use the wizard theme when...                                                      | Use the standard theme when...                                       |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| You are working in a modern terminal (Windows Terminal, iTerm2, Alacritty, Kitty) | Your terminal has poor emoji support                                 |
| You want a distinctive commit experience                                          | You prefer minimal, fast prompts                                     |
| You enjoy the thematic vocabulary                                                 | You work in VS Code's integrated terminal and find emoji spacing off |
| You are onboarding developers who are new to conventional commits                 | Accessibility requirements prefer plain text                         |

---

## Switching Themes

### Via the config menu

```bash
merlin config
# → User config → Theme → standard (or wizard)
```

### Via config file

Edit `~/.merlinrc.json` (user, applies everywhere) or `.merlinrc.json` (project, overrides user):

```json
{
    "theme": "standard"
}
```

The theme takes effect immediately - no restart needed.

<p align="center">
  <img src="../../.github/assets/gif-03-theme-switch.gif" alt="switching themes" width="100%" />
</p>

---

## Terminal Compatibility

### Windows Terminal / iTerm2 / Alacritty / Kitty

Full emoji support. The wizard theme renders as intended, with proper emoji column widths.

### VS Code Integrated Terminal

VS Code uses xterm.js, which renders some emoji (those followed by the Unicode variation selector U+FE0F) as a single column wide instead of two columns. This can cause misaligned text in the type selector.

Merlin detects VS Code automatically via the `TERM_PROGRAM` environment variable and adjusts emoji spacing accordingly. If you notice alignment issues in VS Code, this detection is the mitigation.

### Other terminals (PuTTY, older xterm)

Emoji support varies. If the wizard theme displays garbled characters or misaligned columns, switch to the standard theme:

```json
{
    "theme": "standard"
}
```

### Windows Command Prompt / PowerShell (legacy)

The standard theme is recommended. Color support is present in Windows Terminal but may be absent in `cmd.exe` or older PowerShell versions.

---

## Colors

Both themes use terminal colors for feedback, independent of the theme setting:

| Color  | Used for                                         |
| ------ | ------------------------------------------------ |
| Cyan   | Section headers and primary labels               |
| Green  | Success messages                                 |
| Red    | Error messages, character counter overflow       |
| Yellow | Warnings, character counter approaching limit    |
| Blue   | Informational messages                           |
| Gray   | Secondary text, character counter (normal state) |
| White  | Main content                                     |

Color output requires a terminal that supports ANSI escape codes. Colors are not affected by the theme choice.

---

## Related

- [Glossary](../GLOSSARY.md) - Complete wizard-theme vocabulary reference
- [Configuration](../reference/configuration.md) - Setting a default theme and other options
- [CLI Reference](../reference/cli-reference.md) - The `merlin config` command
