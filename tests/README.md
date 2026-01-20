# Tests

This directory contains all test files for the Merlin Commit project, organized by test type following the testing strategy outlined in the PRD.

## Structure

```
__tests__/
├── unit/              # Unit tests (80% of test coverage)
│   ├── message.test.ts   # Message building and preview formatting
│   ├── git.test.ts       # Git operations with mocked commands
│   └── config.test.ts    # Configuration management
├── integration/       # Integration tests (15% of test coverage)
│   └── (Coming soon)
└── e2e/              # End-to-end tests (5% of test coverage)
    └── (Coming soon)
```

## Test Pyramid

```
        /\
       /  \     5% - E2E Tests
      /____\
     /      \   15% - Integration Tests
    /________\
   /          \  80% - Unit Tests
  /__________  \
```

**Coverage Target:** >80% overall

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npx vitest run __tests__/unit/message.test.ts
```

## Unit Tests

Located in `__tests__/unit/`. These tests focus on individual functions and modules in isolation:

- **message.test.ts**: Tests commit message building and preview formatting logic
- **git.test.ts**: Tests git operations with mocked `execa` commands
- **config.test.ts**: Tests configuration loading, saving, and validation

All external dependencies (file system, git commands) are mocked.

## Integration Tests

Located in `__tests__/integration/`. These tests verify that multiple components work together correctly:

- **commit-flow.test.ts** (planned): Full commit workflow from prompts to git commit
- **config-flow.test.ts** (planned): Configuration changes and persistence
- **init-flow.test.ts** (planned): Project setup with husky and commitlint

## E2E Tests

Located in `__tests__/e2e/`. These tests verify the entire CLI application:

- **cli.test.ts** (planned): Full CLI interactions including help, version, and commands

## Adding New Tests

When adding new tests:

1. **Unit tests**: Place in `__tests__/unit/` with descriptive name (e.g., `prompt.test.ts`)
2. **Integration tests**: Place in `__tests__/integration/` with workflow name (e.g., `amend-flow.test.ts`)
3. **E2E tests**: Place in `__tests__/e2e/` with feature name (e.g., `dry-run.test.ts`)

Import paths from test files should use relative paths to source:
```typescript
import { functionName } from "../../src/lib/module";
```

## Testing Guidelines

- Use descriptive test names that explain what is being tested
- Mock external dependencies (file system, git, network)
- Test both success and error cases
- Verify error messages and validation
- Maintain high coverage on critical paths
