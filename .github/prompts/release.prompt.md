---
agent: agent
---

# Release Instructions

Releases are now managed automatically via [Changesets](https://github.com/changesets/changesets).  
Refer to the **Releasing** section in [CONTRIBUTING.md](../../CONTRIBUTING.md) for the standard contributor workflow.

The steps below are only needed for **manual / emergency releases** that bypass the automated changeset flow.

## Manual Release Steps

1. Go to the main branch and pull the latest changes. If dependencies changed, run `npm ci`.
2. Ask the user what the new version number should be. It should follow semantic versioning, but it may have a suffix for release candidates.
3. Work on a release branch, typically named `chore/prepare-release-<version>`.
4. Update `CHANGELOG.md`: add a new version section and move / reword any unreleased entries to fit the content guidelines in `.github/instructions/changelog.instructions.md`.
5. Run `npm version <version> --no-git-tag-version` to update `package.json`, then run `npm run release:update-versions -- <version>` to update `server.json`, `gemini-extension.json`, and sync `package-lock.json`.
6. Let the user verify the release notes and version number before proceeding.
7. Commit the changes with a message like `chore(release): prepare for <version> release`.
