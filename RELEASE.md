# Release Process

This repository uses automated GitHub workflows to create releases whenever a new tag is pushed.

## How it works

1. When you push a tag starting with `v` (e.g., `v1.0.0`, `v2.1.3`), the release workflow automatically triggers
2. The workflow builds the project, runs tests, and creates a GitHub release with auto-generated release notes

## Creating a Release

### Manual tagging

```bash
# Make sure you're on the main branch and have latest changes
git checkout main
git pull origin main

# Run tests and build locally (optional but recommended)
npm test
npm run build

# Create and push a tag
git tag v1.0.0  # Replace with your desired version
git push origin v1.0.0
```

After pushing the tag, the workflow will automatically:
1. Run tests
2. Build the project
3. Generate release notes from commit history
4. Create a GitHub release

### Creating Pre-releases

For beta or alpha releases:

```bash
# Create a pre-release tag
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

Pre-releases will be automatically marked as such in the GitHub release.

## Release Notes

The workflow automatically generates release notes by collecting all commit messages between the current and previous tag. The release notes include:

- A list of changes with commit hashes
- Proper pre-release marking for beta/alpha versions

## Troubleshooting

### Release workflow fails

1. Check that all tests pass locally: `npm test`
2. Verify the build works: `npm run build`
3. Ensure the tag follows the `v*` pattern (e.g., `v1.0.0`)
4. Check the GitHub Actions logs for specific error details

### Version conflicts

If you need to re-release a version:

```bash
# Delete the local tag
git tag -d v1.0.0

# Delete the remote tag
git push origin --delete v1.0.0

# Create the tag again with the correct version
git tag v1.0.0
git push origin v1.0.0
```
