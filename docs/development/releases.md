# Releases

Release process for maintainers. Covers versioning policy, the step-by-step release procedure, pre-releases, hotfixes, and reverting a bad release.

---

## Versioning Policy

This project follows [Semantic Versioning](https://semver.org/) (semver):

| Change type                      | Version bump              | When to use                                                                |
| -------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `BREAKING CHANGE` in footer      | Major (`1.0.0` → `2.0.0`) | Incompatible changes to CLI flags, config schema, or commit message format |
| `feat` commits                   | Minor (`1.0.0` → `1.1.0`) | New commands, new flags, new config options                                |
| `fix`, `perf`, `refactor`, other | Patch (`1.0.0` → `1.0.1`) | Bug fixes, performance improvements, internal changes                      |

The version in `package.json` is the single source of truth. The `merlin --version` output reads from it at runtime.

---

## Release Checklist

- [ ] All changes for the release are merged to `develop`
- [ ] CI passes on `develop`
- [ ] Changelog updated
- [ ] Version bumped in `package.json`
- [ ] Release commit created
- [ ] PR to `main` opened and merged
- [ ] Git tag pushed
- [ ] npm package published
- [ ] GitHub release created
- [ ] `develop` synced with version bump from `main`

---

## Step-by-Step Release

### 1. Create a release branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0
```

### 2. Update `CHANGELOG.md`

Add a section at the top for the new release. Follow the existing format:

```markdown
## [1.1.0] - 2026-06-15

### Added

- Auto-add: interactive file staging before commit prompts
- Config: `showCharacterCounter` option to disable input counters

### Fixed

- Terminal: correct emoji spacing detection on Windows Terminal

### Changed

- Default `maxScopeLength` increased from 15 to 20
```

### 3. Bump the version

```bash
npm version minor  # or major / patch
```

This updates `package.json`, `package-lock.json`, and creates a git commit and tag. Use `--no-git-tag-version` if you want to tag manually:

```bash
npm version minor --no-git-tag-version
```

### 4. Commit the release

```bash
git add package.json package-lock.json CHANGELOG.md
merlin
# type: chore
# scope: release
# subject: bump version to 1.1.0
```

### 5. Push the release branch and open a PR to `main`

```bash
git push -u origin release/v1.1.0
gh pr create \
  --base main \
  --title "release: v1.1.0" \
  --body "Release version 1.1.0. See CHANGELOG.md for details."
```

All CI checks must pass before merging.

### 6. Merge to `main` and tag

After the PR is merged:

```bash
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### 7. Publish to npm

```bash
npm publish --access public
```

Verify the published version:

```bash
npm info merlin-commit version
```

### 8. Create a GitHub release

```bash
gh release create v1.1.0 \
  --title "v1.1.0" \
  --notes-file CHANGELOG_FRAGMENT.md
```

Or use the GitHub web UI with the content from `CHANGELOG.md` for this version.

### 9. Sync `develop` with the version bump

```bash
gh pr create \
  --base develop \
  --head main \
  --title "chore: sync release v1.1.0 to develop" \
  --body "Sync version bump and changelog from release v1.1.0."
```

---

## Pre-Release Versions

For testing a release candidate before the stable release:

```bash
npm version prerelease --preid=rc  # 1.1.0-rc.0
npm publish --tag next --access public
```

Users can install the pre-release with:

```bash
npm install -g merlin-commit@next
```

The `next` tag does not affect users on the default `latest` tag.

---

## Hotfix Procedure

For urgent fixes to a production release:

```bash
# Branch from main (not develop)
git checkout main
git pull origin main
git checkout -b hotfix/fix-description

# Make the fix
# ...

# Bump patch version
npm version patch

# Commit
merlin
# type: fix
# scope: (affected area)
# subject: (fix description)

# Push and open PR to main
git push -u origin hotfix/fix-description
gh pr create --base main --title "hotfix: fix description"
```

After merge to `main`:

```bash
git checkout main && git pull origin main
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin v1.0.1
npm publish --access public
```

Then sync to `develop` as in step 9 above.

---

## Reverting a Bad Release

### Deprecating a version (preferred)

Mark the problematic version as deprecated without removing it. Users on older versions are warned when they install:

```bash
npm deprecate merlin-commit@1.1.0 "Critical bug - upgrade to 1.1.1"
```

Then release a patch that fixes the issue.

### Unpublishing (last resort, time-limited)

npm allows unpublishing within 72 hours of publish, or if the package is fewer than 7 days old:

```bash
npm unpublish merlin-commit@1.1.0
```

After 72 hours, use `npm deprecate` instead.

---

## Related

- [Contributing](contributing.md) - Development workflow and PR process
