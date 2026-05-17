# Commit Types

Merlin Commit follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Every commit has a type that communicates the nature of the change at a glance.

---

## Built-in Types

| Type       | Emoji | When to use                                           |
| ---------- | ----- | ----------------------------------------------------- |
| `feat`     | ✨    | New functionality visible to users                    |
| `fix`      | 🐛    | Resolves incorrect or broken behavior                 |
| `docs`     | 📚    | Changes to documentation only                         |
| `style`    | 💄    | Code formatting, whitespace - no logic changes        |
| `refactor` | 🔧    | Restructuring code without changing external behavior |
| `perf`     | 🚀    | Measurable performance improvement                    |
| `test`     | 🚨    | Adding, updating, or fixing test cases                |
| `build`    | 🔨    | Build system, bundler, or dependency changes          |
| `ci`       | ⚙️    | CI/CD pipeline or configuration                       |
| `chore`    | ♻️    | Tooling, maintenance - no production code             |
| `revert`   | ⏪    | Undo a previous commit                                |

---

## Type Reference

### `feat` - A new feature

Add new capabilities that end users can observe or use. This is the primary driver of minor version bumps in semantic versioning.

**Use for:**

- New API endpoints or CLI options
- New UI components or interactions
- New integrations or supported platforms

**Do not use for:**

- Internal refactoring with no user-visible effect (use `refactor`)
- Bug fixes that restore existing behavior (use `fix`)

**Examples:**

```
feat(auth): add OAuth 2.0 login with GitHub
feat: export data as CSV from dashboard
```

---

### `fix` - A bug fix

Correct something that was broken, incorrect, or producing unexpected results.

**Use for:**

- Runtime errors and exceptions
- Wrong output or calculated values
- UI rendering issues

**Do not use for:**

- Adding new capabilities to fix a limitation (use `feat`)
- Updating tests to pass after a previous change (use `test`)

**Examples:**

```
fix(api): handle null response from payment gateway
fix: prevent duplicate submissions on slow connections
```

---

### `docs` - Documentation

Changes to README files, inline comments, JSDoc, wiki pages, or any prose documentation. No production code is modified.

**Use for:**

- README updates
- JSDoc / docstring additions
- Changelog entries
- Inline code comments

**Do not use for:**

- Code that only changes types or interfaces (use `refactor` or `feat`)

**Examples:**

```
docs(api): document rate limiting behavior
docs: add prerequisites to installation guide
```

---

### `style` - Code style

Formatting changes that do not affect runtime behavior: whitespace, indentation, semicolons, trailing commas, bracket alignment.

**Use for:**

- Running a formatter (Prettier, Black, gofmt) on existing files
- Fixing lint rule violations that are purely stylistic

**Do not use for:**

- Renaming variables or functions (use `refactor`)
- Any change that affects runtime output

**Examples:**

```
style: apply prettier formatting to src/
style(config): fix inconsistent indentation
```

---

### `refactor` - Code refactoring

Internal restructuring that does not change external behavior or fix a bug. The public API, outputs, and side effects remain identical.

**Use for:**

- Extracting functions or modules
- Renaming variables and functions for clarity
- Simplifying logic while preserving behavior

**Do not use for:**

- Changes that add new behavior (use `feat`)
- Changes that fix broken behavior (use `fix`)

**Examples:**

```
refactor(auth): extract token validation to separate module
refactor: simplify retry logic with exponential backoff helper
```

---

### `perf` - Performance improvement

Changes that measurably improve speed, memory usage, or resource consumption. The external behavior remains identical.

**Use for:**

- Caching results that were previously recomputed
- Replacing an algorithm with a faster equivalent
- Reducing database query count

**Examples:**

```
perf(db): add index on user_id for order lookups
perf: memoize expensive config resolution
```

---

### `test` - Tests

Adding test cases, updating existing tests, or fixing broken tests. No production code changes.

**Use for:**

- New unit or integration tests
- Fixing flaky tests
- Improving test coverage for an existing feature

**Examples:**

```
test(validators): add edge cases for email validation
test: increase coverage for payment retry logic
```

---

### `build` - Build system

Changes to the build configuration, bundler, dependency management, or project tooling that affect how the project is compiled or packaged.

**Use for:**

- Updating `package.json` dependencies
- Changing TypeScript, Webpack, Rollup, or Vite config
- Updating lockfiles

**Examples:**

```
build(deps): upgrade TypeScript to 5.7
build: switch from webpack to esbuild
```

---

### `ci` - Continuous integration

Changes to CI/CD pipeline configuration, automated test workflows, or deployment scripts.

**Use for:**

- GitHub Actions, GitLab CI, CircleCI workflows
- Deployment pipeline changes
- Automated testing matrix updates

**Examples:**

```
ci: add Node 22 to test matrix
ci(deploy): configure staging environment release
```

---

### `chore` - Maintenance

Routine maintenance that does not affect production behavior or tests. Catch-all for changes that do not fit other types.

**Use for:**

- Updating `.gitignore`, `.editorconfig`, linting config
- Releasing a new version (`chore(release): bump version to 2.0.0`)
- Removing unused files

**Examples:**

```
chore(deps): update eslint to v9
chore: remove unused helper script
```

---

### `revert` - Revert

Reverting a previous commit. The subject should reference the commit being reverted.

**Examples:**

```
revert: revert "feat(auth): add OAuth login"
revert: revert commit abc123
```

---

## Choosing the Right Type

Use this decision flow when you are unsure:

```
Does this add new user-visible functionality?
   Yes → feat

Does this fix broken or incorrect behavior?
   Yes → fix

Does this only change documentation or comments?
   Yes → docs

Does this only change formatting (whitespace, style)?
   Yes → style

Does this improve speed or memory without changing behavior?
   Yes → perf

Does this only change tests?
   Yes → test

Does this change the build system or dependencies?
   Yes → build

Does this change CI/CD pipelines only?
   Yes → ci

Does this undo a previous commit?
   Yes → revert

Does it restructure code without changing behavior or fixing bugs?
   Yes → refactor

Catch-all → chore
```

---

## Breaking Changes

Any type can be marked as a breaking change. Breaking changes represent incompatible API or behavior changes that require consumers to update their code.

**How breaking changes work in merlin:**

1. When prompted "Are there any breaking changes?", answer yes.
2. Describe the breaking change in the editor that opens.
3. Merlin automatically:
    - Adds `!` after the scope in the commit header: `feat(auth)!:`
    - Adds `BREAKING CHANGE:` prefix to your description in the footer
    - Shows a ⚠️ indicator in the preview (visual only, not in the commit)

**Example output:**

```
feat(auth)!: replace session tokens with JWTs

All clients must update their authentication flow.

BREAKING CHANGE: Session cookies are no longer issued. Clients
must send a Bearer token in the Authorization header.
```

You do not need to type "BREAKING CHANGE:" yourself - merlin adds it automatically.

---

## Custom Commit Types

When the built-in types do not fit your workflow, you can define a custom set in `.merlinrc.json`. Custom types **replace** the built-in 11 entirely.

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
            "value": "release",
            "name": "release",
            "description": "A production release commit",
            "emoji": "🚢"
        }
    ]
}
```

See [Config Schema] for the full type definition format.

---

## Related

- [Configuration](../reference/configuration.md) - Defining custom types and project settings
- [CLI Reference](../reference/cli-reference.md) - The commit command and flags
- [Glossary](../GLOSSARY.md) - Wizard-theme vocabulary reference
