---
agent: agent
---

# Release Instructions

When preparing a release, follow these steps to ensure everything is in order:

1. Go to the main branch and pull the latest changes. If dependencies changed, run `npm ci`.
2. Ask the user what the new version number should be. It should follow semantic versioning, but it may have a suffix for release candidates.
3. Work on a release branch, typically named `chore/prepare-release-<version>`.
4. Create a new section in CHANGELOG.md for the version below "Unreleased Changes".
5. Move all entries from "Unreleased Changes" to this new section. Reword them in the process to fit the content guidelines specified in `.github/instructions/changelog.instructions.md`.
6. Run `npm version <version> --no-git-tag-version` to update `package.json`, then run `npm run release:update-versions -- <version>` to update `server.json`, `gemini-extension.json`, and sync `package-lock.json`.
7. Let the user verify the release notes and version number before proceeding.
8. Commit the changes with a message like `chore(release): prepare for <version> release`.
