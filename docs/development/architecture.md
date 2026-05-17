# Architecture

Internal architecture reference for contributors. Covers the three-layer code structure, module responsibilities, data flow, and key design decisions.

---

## Three-Layer Architecture

The source code is organized into three layers. Each layer has a specific role and strict rules about which other layers it may depend on.

```
┌──────────────────────────────────────────┐
│            Commands Layer                │
│  src/commands/                           │  Orchestration
│  commit.ts | config.ts | init.ts         │
└──────────────────┬───────────────────────┘
                   │ calls
                   ↓
┌──────────────────────────────────────────┐
│             Library Layer                │
│  src/lib/                                │  Implementation
│  git | prompt | config-loader | message  │
│  editor | setup | sigint | terminal      │
│  transformers | commitlint-sync          │
└──────────────────┬───────────────────────┘
                   │ uses
                   ↓
┌──────────────────────────────────────────┐
│            Utilities Layer               │
│  src/utils/                              │  Pure helpers
│  constants | validators | config         │
└──────────────────────────────────────────┘
```

### Allowed dependency directions

```
✅ commands → lib
✅ commands → utils
✅ commands → types
✅ lib → utils
✅ lib → types
✅ lib → external packages (execa, inquirer, chalk, ora)
✅ utils → types

❌ lib → commands
❌ utils → commands
❌ utils → lib
```

The prohibition on `lib → commands` and `utils → lib` keeps the layers genuinely independent. Library modules can be tested without loading any command logic, and utilities can be tested without loading any library code.

---

## Layer Descriptions

### Commands (Orchestration)

Commands coordinate workflows. They decide the sequence of operations but do not implement domain logic themselves.

**Rules:**

- Delegate all domain work to lib modules
- Handle Inquirer's `ExitPromptError` (Ctrl+C) gracefully
- Display user-facing messages and error output
- Set process exit code appropriately

**Pattern:**

```
1. Validate preconditions
2. Gather user input (via lib/prompt.ts)
3. Process data (via lib modules)
4. Preview and confirm with user
5. Execute (via lib modules)
6. Report result
```

### Library (Implementation)

Each library module implements one domain. It exports a focused set of functions and handles errors within its domain.

**Rules:**

- Single responsibility - one domain per module
- Explicit error handling with descriptive `Error` objects
- Pure functions where possible
- No cross-dependencies between library modules

### Utilities (Pure Helpers)

Utilities are pure, stateless functions. They have no side effects and produce the same output for the same input every time.

**Rules:**

- No file I/O, network calls, or logging
- No external state or mutations
- Always return a value rather than throw (except for genuinely impossible states)
- 100% test coverage target - pure functions are trivial to test

---

## Module Map

### Commands

| File                 | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `commands/commit.ts` | Interactive commit wizard (176 lines)            |
| `commands/config.ts` | Config menu and --show/--reset flags (922 lines) |
| `commands/init.ts`   | Project initialization wizard (411 lines)        |

### Library

| File                     | Purpose                                        | Key exports                                                                                                                                                |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/git.ts`             | All git operations via execa                   | `isGitRepo`, `hasStagedChanges`, `getStagedFilesWithStatus`, `getStagingCandidates`, `addFiles`, `commit`, `amendCommit`, `getRepoRoot`, `getGitDirectory` |
| `lib/prompt.ts`          | Interactive prompts with injected dependencies | `promptUser(deps)`, `promptFileSelection(candidates, message)`                                                                                             |
| `lib/config-loader.ts`   | Config I/O and 3-tier merging                  | `loadConfig`, `loadUserConfig`, `loadProjectConfig`, `saveConfig`, `resetConfig`, `saveProjectConfig`, `getMessages`                                       |
| `lib/message.ts`         | Commit message building and preview            | `buildCommitMessage(answers)`, `formatPreview(message)`                                                                                                    |
| `lib/editor-wrapper.ts`  | External editor integration                    | `editWithGitCommitMessage`, `editWithCommitEditMsg`, `buildBreakingChangeTemplate`, `buildIssueReferenceTemplate`                                          |
| `lib/setup.ts`           | Husky, commitlint, and git alias setup         | `installDependencies`, `initializeHusky`, `createCommitlintConfig`, `createCommitMsgHook`, `setupGitAlias`, `createProjectConfig`                          |
| `lib/commitlint-sync.ts` | Commitlint config detection and sync           | `detectCommitlintConfig`, `buildSyncRules`, `syncToCommitlintConfig`                                                                                       |
| `lib/sigint.ts`          | Graceful Ctrl+C handling                       | `setupSigintHandler`                                                                                                                                       |
| `lib/terminal.ts`        | VS16 emoji width detection and normalization   | `isWideEmojiTerminal`, `normalizeEmojiSpacing`                                                                                                             |
| `lib/transformers.ts`    | Character counter Inquirer transformers        | `createCharacterCounterTransformer`, `createOptionalCharacterCounterTransformer`                                                                           |

### Utilities

| File                  | Purpose                                      | Key exports                                                                                                                  |
| --------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `utils/constants.ts`  | Commit types, theme messages, default config | `COMMIT_TYPES`, `WIZARD_MESSAGES`, `STANDARD_MESSAGES`, `DEFAULT_CONFIG`, `colors`                                           |
| `utils/validators.ts` | Inquirer-compatible validator factories      | `createRangeValidator`, `createNonEmptyValidator`, `createMaxLengthValidator`, `createPatternValidator`, `composeValidators` |
| `utils/config.ts`     | Config object validation                     | `validateConfig(unknown) → Partial<MerlinConfig>`                                                                            |

---

## Data Flow: `merlin` to Git Commit

```
User runs: merlin

cli.ts
  ↓ parseCommitOptions()
  ↓ calls commitCommand(options)

commands/commit.ts
  ├─ getRepoRoot()        → lib/git.ts
  ├─ loadConfig()         → lib/config-loader.ts
  ├─ getMessages()        → lib/config-loader.ts
  ├─ setupSigintHandler() → lib/sigint.ts
  │
  ├─ hasStagedChanges()   → lib/git.ts
  │     if false and autoAdd:
  │       getStagingCandidates() → lib/git.ts
  │       promptFileSelection()  → lib/prompt.ts
  │       addFiles()             → lib/git.ts
  │
  ├─ promptUser(deps)     → lib/prompt.ts
  │     ↓ inquirer type selector (COMMIT_TYPES from utils/constants.ts)
  │     ↓ inquirer scope input   (validators from utils/validators.ts)
  │     ↓ inquirer subject input (transformers from lib/transformers.ts)
  │     ↓ optional: editWithGitCommitMessage() → lib/editor-wrapper.ts
  │     ↓ optional: editWithCommitEditMsg()    → lib/editor-wrapper.ts (x2)
  │     → CommitAnswers
  │
  ├─ buildCommitMessage() → lib/message.ts
  │     → formatted string
  │
  ├─ formatPreview()      → lib/message.ts
  │     → preview string with visual emoji indicators
  │
  ├─ [dry-run: exit here]
  │
  ├─ confirm()            → @inquirer/prompts
  │
  └─ commit() or amendCommit() → lib/git.ts
        → execa("git", ["commit", "-m", message, ...flags])
        → commit hash string

Display success message
Exit 0
```

---

## Config Loader: Three-Tier Merge Algorithm

`loadConfig(repoRoot?)` in `lib/config-loader.ts`:

```
1. Start with DEFAULT_CONFIG (from utils/constants.ts)
2. Load ~/.merlinrc.json via loadUserConfig()
   - Parse JSON
   - Validate with validateConfig() from utils/config.ts
   - Ignore invalid fields
3. If repoRoot provided: load <repoRoot>/.merlinrc.json via loadProjectConfig()
   - Same parse + validate process
4. Deep merge: defaults → userConfig → projectConfig
   - Later keys win at every level
5. Resolve editor:
   - userConfig.editor ?? projectConfig.editor ?? $EDITOR ?? $VISUAL ?? platform default
6. Return Required<MerlinConfig>
```

The `editor` field cannot use the standard merge because `DEFAULT_CONFIG.editor` is always defined (it is the platform default), which would prevent `$EDITOR` from ever being reached if the merge ran normally. The editor is resolved after merging as a special case.

---

## Theme System

Theme messages live in `utils/constants.ts` as two complete objects: `WIZARD_MESSAGES` and `STANDARD_MESSAGES`. Both satisfy the `ThemeMessages` type, which has a nested structure:

```
ThemeMessages
├── commit.{intro, exit, dryRunExit, previewHeader}
├── config.{intro, exit, scopeSelector, ...}
├── init.{intro, exit, checkingPackageJson, ...}
├── prompts.{selectType, enterScope, enterSubject, ...}
├── errors.commit.{notGitRepo, noStagedChanges, ...}
├── errors.config.{...}
├── errors.init.{...}
├── warnings.{cancel, noVerify, resetConfig, ...}
├── success.commit.{created, amended, dryRun}
├── success.config.{saved}
├── success.init.{completed}
└── tips.{gitAdd, runGitInit, nextSteps, ...}
```

`getMessages(repoRoot?)` in `lib/config-loader.ts` resolves the active message set:

1. Calls `loadConfig(repoRoot)` to get the resolved config including `theme`
2. If `theme === "wizard"`: runs `normalizeThemeStrings(WIZARD_MESSAGES)` to fix VS16 emoji spacing
3. If `theme === "standard"`: returns `STANDARD_MESSAGES` directly

`normalizeThemeStrings()` uses `normalizeEmojiSpacing()` from `lib/terminal.ts` which detects whether the terminal renders VS16 emojis as 1 or 2 columns wide and adjusts spacing accordingly.

---

## Dependency Injection in `promptUser`

`promptUser` in `lib/prompt.ts` accepts a `PromptDependencies` object instead of calling `loadConfig()` and git functions directly. This makes the function testable without mocking module-level imports:

```typescript
type PromptDependencies = {
    config: Required<MerlinConfig>;
    messages: ThemeMessages;
    getStagedFiles: () => Promise<StagedFile[]>;
    editBody: (context: CommitEditorContext) => string;
    editBreaking: () => string;
    editIssues: () => string;
};
```

The command layer creates this object and passes it in. Tests can substitute any of the dependencies.

---

## Validator Factory Pattern

Validators in `utils/validators.ts` use a factory pattern that returns functions compatible with Inquirer's `validate` option:

```typescript
type Validator = (value: string) => true | string;

// Factory
export function createMaxLengthValidator(
    maxLength: number,
    fieldName?: string
): Validator {
    return (value: string) => {
        if (value.length > maxLength)
            return `${fieldName ?? "Value"} exceeds ${maxLength} characters`;
        return true;
    };
}

// Composition
export function composeValidators(...validators: Validator[]): Validator {
    return (value: string) => {
        for (const v of validators) {
            const result = v(value);
            if (result !== true) return result;
        }
        return true;
    };
}
```

Returning `true` on success (rather than a falsy empty string) follows Inquirer's API contract.

---

## Security Design Decisions

### execa with args array

All git operations use `execa("git", ["arg1", "arg2"])` rather than shell string interpolation. This prevents command injection - user input in an args array is always treated as a literal string, never parsed as shell syntax.

### No `eval()` or `new Function()`

ESLint rules `no-eval` and `no-new-func` are configured at error level. User-provided strings (commit messages, config values) are never executed as code.

### Offline-only

No network calls anywhere in the codebase. ESLint restricts use of `http`, `https`, `net`, and similar modules. No analytics, no update checks, no telemetry.

### Config validation

`validateConfig()` in `utils/config.ts` filters user config through strict type checks. Unknown or malformed fields are ignored rather than passed through. This prevents prototype pollution or unexpected behavior from tampered config files.

### Fixed file paths

Config files are at fixed paths (`~/.merlinrc.json`, `<repoRoot>/.merlinrc.json`). No user input is ever used to construct a file path.

---

## Extension Points

### Adding a new command

1. Create `src/commands/new-command.ts` following the orchestration pattern
2. Register it in `src/cli.ts`: `program.command("name").description("...").action(newCommand)`
3. Add tests in `tests/unit/new-command-command.test.ts`

### Adding a new commit type

1. Add an entry to `COMMIT_TYPES` in `src/utils/constants.ts`
2. No other changes required - the type selector is data-driven

### Adding a new theme

1. Add a new message set constant in `src/utils/constants.ts` implementing `ThemeMessages`
2. Add the new theme value to the `theme` union type in `src/types/config.ts`
3. Update `getMessages()` in `src/lib/config-loader.ts` to return the new message set

---

## Related

- [Contributing](contributing.md) - Development setup and contribution workflow
- [Testing](testing.md) - Test patterns and running tests
- [Config Schema] - All config fields and types
