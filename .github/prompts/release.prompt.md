---
mode: agent
---

# Release Instructions

When preparing a release, follow these steps to ensure everything is in order:

1. Go to the main branch and pull the latest changes. If dependencies changed, run `npm ci`.
2. Ask the user what the new version number should be. It should follow semantic versioning, but it may have a suffix for release candidates.
3. Work on a release branch, typically named `chore/prepare-release-<version>`.
4. Create a new section in CHANGELOG.md for the version below "Unreleased Changes".
5. Move all entries from "Unreleased Changes" to this new section. Reword them in the process to fit the content guidelines specified in `.github/instructions/changelog.instructions.md`.
6. Update the version number in `package.json`, `server.json`, and `gemini-extension.json`.
7. Run `npm install --package-lock-only` to sync the lock file.
8. Let the user verify the release notes and version number before proceeding.
9. Commit the changes with a message like `chore(release): prepare for <version> release`.
