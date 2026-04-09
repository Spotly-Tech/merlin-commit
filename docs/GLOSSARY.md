# Merlin Commit Glossary

Official vocabulary reference for the wizard theme used throughout Merlin Commit.
This glossary ensures consistent language across all themed messages and future
changes.

The wizard theme is active when `theme: "wizard"` is set in the config (the
default). The standard theme uses plain language equivalents.

---

## Wizard Vocabulary

Each entry maps a wizard-themed term to its real-world meaning, with usage notes
and examples from the codebase.

### Characters & Entities

| Term         | Meaning                      | Usage                                  |
| ------------ | ---------------------------- | -------------------------------------- |
| **Merlin**   | The CLI tool itself          | "Merlin is ready to guide your commit" |
| **guardian** | Git hook (husky, commit-msg) | "Awakening the husky guardian"         |

### Core Actions

| Term         | Meaning                              | Usage                                           |
| ------------ | ------------------------------------ | ----------------------------------------------- |
| **cast**     | Create a commit                      | "Shall Merlin cast this spell?"                 |
| **inscribe** | Write, save, or create a file/config | "Inscribing project enchantments"               |
| **summon**   | Install or fetch (npm install)       | "Summoning dependencies from the npm realm"     |
| **invoke**   | Run a command                        | "Invoke git init to create a sacred repository" |
| **awaken**   | Initialize (a tool or service)       | "Awakening the husky guardian"                  |
| **weave**    | Write detailed content (commit body) | "Would you like to weave a detailed tale?"      |
| **shatter**  | Break (as in breaking changes)       | "Does this spell shatter ancient contracts?"    |
| **peer**     | Preview or inspect                   | "Merlin peers into possible futures"            |
| **bind**     | Create an alias                      | "Bind 'git merlin' to your spellbook"           |

### Objects & Artifacts

| Term          | Meaning                                     | Usage                                                           |
| ------------- | ------------------------------------------- | --------------------------------------------------------------- |
| **spell**     | A commit                                    | "Spell successfully cast!", "The spell failed to materialize"   |
| **tome**      | A configuration or settings file            | "Merlin opens the tome of settings", "the commitlint tome"      |
| **scroll**    | A staged or changed file                    | "Examining the staged scrolls", "No scrolls have been prepared" |
| **ledger**    | package.json (project manifest)             | "No package.json ledger found in this realm"                    |
| **quill**     | External text editor                        | "Press Enter to summon the enchanted quill"                     |
| **artifact**  | An existing setup file from a previous init | "Skipping existing artifact", "This artifact already exists"    |
| **covenant**  | A breaking change contract/description      | "Inscribe the shattered covenant"                               |
| **spellbook** | The CLI interface / tool itself             | "Bind 'git merlin' to your spellbook"                           |
| **rune**      | A character (in validation context)         | "This spell contains forbidden runes"                           |

### Places & Concepts

| Term         | Meaning                       | Usage                                        |
| ------------ | ----------------------------- | -------------------------------------------- |
| **realm**    | A git repository              | "This realm is not under Git's dominion"     |
| **domain**   | Scope / area of the codebase  | "What domain does this affect?"              |
| **ether**    | The npm registry              | "Summon husky and commitlint from the ether" |
| **dominion** | Control or management (Git's) | "This realm is not under Git's dominion"     |

### Processes & States

| Term            | Meaning                                         | Usage                                                                |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| **ritual**      | The commit workflow/process                     | "The ritual has been cancelled"                                      |
| **enchantment** | A configuration setting applied to a project    | "Realm enchantments inscribed", "Which realm enchantment to modify?" |
| **blessing**    | An init/setup operation applied to a repository | "Your repository is now blessed!", "Existing blessings detected"     |
| **binding**     | A git alias                                     | "A binding for 'git merlin' already exists"                          |
| **quest**       | A GitHub/tracker issue                          | "Does this resolve any quests?"                                      |
| **vision**      | A preview / dry run                             | "The vision fades - no spell was cast"                               |
| **wards**       | Validation checks / git hooks                   | "Merlin bypasses the guardian wards"                                 |

### Adjectives & Modifiers

| Term          | Meaning                                 | Usage                                 |
| ------------- | --------------------------------------- | ------------------------------------- |
| **sacred**    | Important, protected (repository)       | "Verifying the sacred repository"     |
| **ancient**   | Established, existing (contracts/texts) | "The ancient texts demand this field" |
| **woven**     | Committed, saved to history             | "Your spell is woven into history"    |
| **forbidden** | Invalid, not allowed                    | "This spell contains forbidden runes" |
| **magical**   | Enhanced, special (alias)               | "Binding the magical alias"           |

### Verbs of Failure

| Term            | Meaning                  | Usage                              |
| --------------- | ------------------------ | ---------------------------------- |
| **materialize** | Succeed or complete      | "The spell failed to materialize"  |
| **vanish**      | Crash or fail to respond | "The enchanted quill has vanished" |

### Other

| Term       | Meaning                            | Usage                                            |
| ---------- | ---------------------------------- | ------------------------------------------------ |
| **wisdom** | User preferences / configuration   | "This will erase all of Merlin's learned wisdom" |
| **tale**   | Detailed description (commit body) | "Would you like to weave a detailed tale?"       |
| **fate**   | Action to take                     | "What fate shall befall [field]"                 |

---

## Emoji Glossary

### Commit Type Emojis

These emojis represent each conventional commit type in the type selector.

| Emoji | Commit Type | Description                         |
| ----- | ----------- | ----------------------------------- |
| ✨    | `feat`      | A new feature                       |
| 🐛    | `fix`       | A bug fix                           |
| 📚    | `docs`      | Documentation changes               |
| 💄    | `style`     | Code style (formatting, whitespace) |
| 🔧    | `refactor`  | Code restructuring                  |
| 🚀    | `perf`      | Performance improvement             |
| 🚨    | `test`      | Adding or fixing tests              |
| 🔨    | `build`     | Build system changes                |
| ⚙️    | `ci`        | CI/CD configuration                 |
| ♻️    | `chore`     | Maintenance tasks                   |
| ⏪    | `revert`    | Reverting a previous commit         |

### UI Context Emojis

These emojis prefix wizard-themed messages to provide visual context.

#### Characters & Actions

| Emoji | Context          | Meaning                               |
| ----- | ---------------- | ------------------------------------- |
| 🧙    | Merlin character | The wizard is speaking or acting      |
| 🔮    | Crystal ball     | Prompts, predictions, magical actions |
| ✨    | Sparkles         | Success, magic happening              |

#### Documents & Files

| Emoji | Context   | Meaning                                |
| ----- | --------- | -------------------------------------- |
| 📜    | Scroll    | Config files, documents, saved content |
| 📖    | Open book | Editor, detailed writing               |
| 📋    | Clipboard | Commitlint, structured config          |
| 📦    | Package   | npm packages, dependencies             |
| 📁    | Folder    | Directory, local scope                 |

#### Status & Feedback

| Emoji | Context     | Meaning                       |
| ----- | ----------- | ----------------------------- |
| ❌    | Red X       | Error                         |
| ⚠️    | Warning     | Caution, breaking changes     |
| 💡    | Lightbulb   | Tips, suggestions             |
| 🌟    | Star        | Next steps, success           |
| 🎉    | Celebration | Major success (init complete) |
| 👁️    | Eye         | Dry run, preview mode         |
| 👀    | Eyes        | Searching, looking            |
| 🌙    | Moon        | Cancellation, goodbye         |
| ⏭️    | Skip        | Skipping existing items       |

#### Actions

| Emoji | Context      | Meaning              |
| ----- | ------------ | -------------------- |
| 🎯    | Target       | Scope selection      |
| 📝    | Pencil       | Writing (subject)    |
| 🔗    | Link         | Issues, aliases      |
| 🔄    | Refresh      | Amend, update        |
| 🎣    | Fishing hook | Husky initialization |
| 🌍    | Globe        | Global scope         |

#### Config Menu (wizard theme)

| Emoji | Context | Meaning            |
| ----- | ------- | ------------------ |
| 🎨    | Palette | Theme setting      |
| 📏    | Ruler   | Max subject length |
| 🎯    | Target  | Max scope length   |
| 📝    | Pencil  | Editor setting     |
| 🔄    | Refresh | Auto-add setting   |
| 👁️    | Eye     | Show config        |
| 🗑️    | Trash   | Reset config       |
| 👋    | Wave    | Exit               |

---

## Vocabulary Boundaries

To keep the theme consistent, these rules define which wizard term applies where.
When in doubt, consult this table.

| Real Concept          | Wizard Term | NOT              |
| --------------------- | ----------- | ---------------- |
| Repository            | realm       | domain           |
| Scope (codebase area) | domain      | realm            |
| Config/settings file  | tome        | scroll, artifact |
| Staged/changed file   | scroll      | tome, artifact   |
| package.json          | ledger      | scroll, tome     |
| External editor       | quill       | tome             |
| Existing setup file   | artifact    | scroll, tome     |
| Configuration setting | enchantment | blessing         |
| Init/setup operation  | blessing    | enchantment      |

---

## Adding New Vocabulary

When adding new wizard-themed messages:

1. Check this glossary for the correct term before writing
2. Use existing vocabulary - do not invent synonyms for concepts that already have a term
3. If a genuinely new concept needs a term, add it to this glossary first
4. Keep the standard theme messages plain and jargon-free
5. Every wizard term should have exactly one primary meaning (see Vocabulary Boundaries)
