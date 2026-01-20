# Integration Tests

Integration tests verify that multiple components of Merlin work together correctly.

## Planned Tests

### commit-flow.test.ts
Full commit workflow testing:
- User prompts → Message building → Git commit
- Dry run mode
- Amendment flow
- Hook bypass

### config-flow.test.ts
Configuration management testing:
- Loading configuration from file
- Saving configuration changes
- Theme switching
- Config reset

### init-flow.test.ts
Project setup testing:
- Husky installation and configuration
- Commitlint setup
- Git hook creation
- Git alias configuration

## Running Integration Tests

```bash
# Run all integration tests
npx vitest run __tests__/integration/

# Run specific integration test
npx vitest run __tests__/integration/commit-flow.test.ts
```

## Guidelines

- Test realistic workflows end-to-end
- Use actual file system operations in temp directories
- Mock only external services (npm, git remote operations)
- Verify side effects (files created, git commits made)
- Clean up after tests (temp directories, test repositories)
