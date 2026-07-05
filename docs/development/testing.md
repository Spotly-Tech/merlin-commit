# Testing

Testing guide for contributors. Covers the testing philosophy, how to write tests for each layer, and how to run the test suite.

---

## Philosophy

**Plain tests over mocks.** Write real assertions against real logic first. Introduce mocks only when the code under test touches something external: the file system, git commands, or interactive prompts.

**What to mock:**

- `execa` - avoids creating real git commits during tests
- `fs` - avoids reading/writing real config files
- `@inquirer/prompts` - avoids requiring a real TTY

**What not to mock:**

- Pure utility functions - test them directly with inputs and expected outputs
- Internal module logic - if you are mocking the code under test, you are not testing it

---

## Test Stack

| Tool                          | Purpose                          |
| ----------------------------- | -------------------------------- |
| [Vitest](https://vitest.dev/) | Test runner, assertions, mocking |
| `vi.mock()`                   | Module-level mock injection      |
| `vi.fn()`                     | Spy and mock functions           |

Tests use Vitest's global API (`describe`, `it`, `expect`, `beforeEach`, `vi`) without explicit imports, configured in `vitest.config.ts` with `globals: true`.

---

## Coverage Targets

| Metric     | Target |
| ---------- | ------ |
| Lines      | 80%    |
| Statements | 80%    |
| Functions  | 80%    |
| Branches   | 75%    |

Run coverage:

```bash
npm run test:coverage
```

Coverage thresholds are enforced in CI. A PR that drops below target will fail.

---

## Directory Structure

```
tests/
└── unit/
    ├── cli.test.ts                 CLI program structure
    ├── commit-command.test.ts      Commit workflow orchestration
    ├── config-command.test.ts      Config menu and flags
    ├── init-command.test.ts        Init wizard steps
    ├── commitlint-sync.test.ts     Commitlint sync logic
    ├── config-loader.test.ts       Config loading and merging
    ├── config.test.ts              Config validation (utils)
    ├── constants.test.ts           Commit types and theme messages
    ├── editor-wrapper.test.ts      Editor launch and template building
    ├── git.test.ts                 Git operations
    ├── message.test.ts             Message building and preview
    ├── prompt.test.ts              Interactive prompt logic
    ├── setup.test.ts               Husky and commitlint setup
    ├── sigint.test.ts              Signal handling
    ├── terminal.test.ts            Emoji normalization
    ├── transformers.test.ts        Character counter transformers
    └── validators.test.ts          Input validator factories
```

**Naming convention:**

- Command tests: `<command-name>-command.test.ts`
- Library and utility tests: `<module-name>.test.ts`

---

## Test Structure

Use the Arrange-Act-Assert pattern with nested `describe` blocks:

```typescript
describe("buildCommitMessage", () => {
    describe("when scope is provided", () => {
        it("should include scope in parentheses", () => {
            // Arrange
            const answers: CommitAnswers = {
                type: "feat",
                scope: "auth",
                subject: "add login",
            };

            // Act
            const message = buildCommitMessage(answers);

            // Assert
            expect(message).toBe("feat(auth): add login");
        });
    });
});
```

---

## Testing Pure Utility Functions

Utility functions are pure and require no mocks. Pass input, assert output.

```typescript
// tests/unit/validators.test.ts
import { createMaxLengthValidator } from "../../src/utils/validators.js";

describe("createMaxLengthValidator", () => {
    it("should return true when input is within limit", () => {
        const validate = createMaxLengthValidator(72);
        expect(validate("short subject")).toBe(true);
    });

    it("should return error string when input exceeds limit", () => {
        const validate = createMaxLengthValidator(72, "Subject");
        const result = validate("a".repeat(100));
        expect(result).toContain("exceeds 72 characters");
    });

    it("should be composable with other validators", () => {
        const notEmpty = createNonEmptyValidator("Subject");
        const maxLen = createMaxLengthValidator(72);
        const composed = composeValidators(notEmpty, maxLen);

        expect(composed("valid")).toBe(true);
        expect(composed("")).not.toBe(true);
    });
});
```

---

## Testing Library Modules

Mock external dependencies. Assert the right functions were called with the right arguments.

### Mocking execa (git operations)

```typescript
import { execa } from "execa";
import { beforeEach, vi } from "vitest";

import { commit } from "../../src/lib/git.js";

vi.mock("execa");

describe("commit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should call git commit with message", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "abc1234 feat: add login",
            stderr: "",
            exitCode: 0,
        } as any);

        await commit("feat: add login");

        expect(execa).toHaveBeenCalledWith("git", ["commit", "-m", "feat: add login"]);
    });

    it("should pass --no-verify when noVerify is true", async () => {
        vi.mocked(execa).mockResolvedValue({
            stdout: "",
            stderr: "",
            exitCode: 0,
        } as any);

        await commit("feat: test", true);

        expect(execa).toHaveBeenCalledWith("git", [
            "commit",
            "-m",
            "feat: test",
            "--no-verify",
        ]);
    });
});
```

### Mocking the file system (config I/O)

```typescript
import * as fs from "fs";
import { vi } from "vitest";

import { loadUserConfig } from "../../src/lib/config-loader.js";

vi.mock("fs");

describe("loadUserConfig", () => {
    it("should return parsed config from ~/.merlinrc.json", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(
            JSON.stringify({ theme: "standard", maxSubjectLength: 100 })
        );

        const config = loadUserConfig();

        expect(config.theme).toBe("standard");
        expect(config.maxSubjectLength).toBe(100);
    });

    it("should return empty object when file does not exist", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        expect(loadUserConfig()).toEqual({});
    });
});
```

---

## Testing Commands

Commands orchestrate workflows. Test the coordination logic - that the right lib functions are called in the right order with the right arguments.

```typescript
import { beforeEach, vi } from "vitest";

import { commitCommand } from "../../src/commands/commit.js";
import { getMessages, loadConfig } from "../../src/lib/config-loader.js";
import { commit, hasStagedChanges, isGitRepo } from "../../src/lib/git.js";
import { buildCommitMessage } from "../../src/lib/message.js";
import { promptUser } from "../../src/lib/prompt.js";
import { DEFAULT_CONFIG, WIZARD_MESSAGES } from "../../src/utils/constants.js";

// Mock all dependencies before imports
vi.mock("../../src/lib/git.js");
vi.mock("../../src/lib/prompt.js");
vi.mock("../../src/lib/message.js");
vi.mock("../../src/lib/config-loader.js");

function setupHappyPath() {
    vi.mocked(isGitRepo).mockResolvedValue(true);
    vi.mocked(hasStagedChanges).mockResolvedValue(true);
    vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);
    vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);
    vi.mocked(promptUser).mockResolvedValue({
        type: "feat",
        subject: "add login",
    });
    vi.mocked(buildCommitMessage).mockReturnValue("feat: add login");
    vi.mocked(commit).mockResolvedValue("abc1234");
}

describe("commitCommand", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw when not in a git repo", async () => {
        vi.mocked(isGitRepo).mockResolvedValue(false);
        vi.mocked(loadConfig).mockReturnValue(DEFAULT_CONFIG);
        vi.mocked(getMessages).mockReturnValue(WIZARD_MESSAGES);

        await expect(commitCommand({})).rejects.toThrow();
    });

    it("should create commit on happy path", async () => {
        setupHappyPath();
        // Mock confirm to return true
        // ...
        await commitCommand({});
        expect(commit).toHaveBeenCalledWith("feat: add login", false);
    });

    it("should not create commit on dry run", async () => {
        setupHappyPath();
        await commitCommand({ dryRun: true });
        expect(commit).not.toHaveBeenCalled();
    });
});
```

---

## Common Mocking Patterns

### Mocking `@inquirer/prompts`

```typescript
import { confirm, input, select } from "@inquirer/prompts";

vi.mock("@inquirer/prompts");

vi.mocked(confirm).mockResolvedValue(true);
vi.mocked(input).mockResolvedValue("my input");
vi.mocked(select).mockResolvedValue("feat");
```

### Testing error conditions

```typescript
it("should handle git command failure", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("git: not a repository"));

    await expect(isGitRepo()).resolves.toBe(false);
});
```

### Testing async functions

Always `await` async functions. Forgotten `await` is a common source of false positives.

```typescript
// Good
it("should resolve with result", async () => {
    const result = await asyncFunction();
    expect(result).toBe(expected);
});

// Bad - test may pass even if the function rejects
it("should resolve with result", () => {
    asyncFunction().then((result) => {
        expect(result).toBe(expected);
    });
});
```

### Using `it.each` for parameterized tests

```typescript
it.each([
    ["short", "short", 72, true],
    ["exact limit", "a".repeat(72), 72, true],
    ["one over", "a".repeat(73), 72, false],
])("validateSubjectLength: %s", (_, input, max, expected) => {
    const validate = createMaxLengthValidator(max);
    const result = validate(input);
    expect(result === true).toBe(expected);
});
```

---

## Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run a single test file
npx vitest run tests/unit/message.test.ts

# Run tests matching a name pattern
npx vitest run -t "should format message"
```

---

## Pre-PR Testing Checklist

Before opening a pull request:

- [ ] `npm run test` - all tests pass
- [ ] `npm run test:coverage` - coverage does not drop below thresholds
- [ ] `npm run lint` - no ESLint errors
- [ ] `npm run type-check` - no TypeScript errors
- [ ] `npm run build` - build succeeds
- [ ] Manual smoke test: run `merlin --dry-run` in a git repo and verify the full prompt sequence works as expected

---

## Related

- [Contributing](contributing.md) - Development setup and PR process
- [Architecture](architecture.md) - How layers interact, which functions to mock
