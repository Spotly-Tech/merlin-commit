# End-to-End Tests

End-to-end tests verify the complete CLI application as users would interact with it.

## Planned Tests

### cli.test.ts
Full CLI testing:
- `merlin --help` displays help text
- `merlin --version` shows version number
- `merlin commit` runs interactive workflow
- `merlin config` manages configuration
- `merlin init` sets up project
- Error handling for invalid commands

## Running E2E Tests

```bash
# Run all e2e tests
npx vitest run __tests__/e2e/

# Run specific e2e test
npx vitest run __tests__/e2e/cli.test.ts
```

## Guidelines

- Test the compiled CLI binary (from `dist/`)
- Simulate real user interactions
- Test in isolated test repositories
- Verify terminal output and exit codes
- Test cross-platform compatibility (Windows, macOS, Linux)
- Clean up test artifacts after runs
