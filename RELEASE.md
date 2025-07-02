# Release Process

This repository uses automated GitHub workflows to prepare releases whenever a new tag is pushed.

## How it works

1. When you push a tag starting with `v` (e.g., `v1.0.0`, `v2.1.3`), the release workflow automatically triggers
2. The workflow builds the project, runs tests, and creates a GitHub release with auto-generated release notes

**Note**: This workflow does (not yet) publish the release to npmjs.com.

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
git tag vx.y.z  # Replace with your desired version
git push origin vx.y.z
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
git tag vx.y.z-beta.1
git push origin vx.y.z-beta.1
```

Pre-releases will be automatically marked as such in the GitHub release.

## Release Notes

The workflow automatically generates technical release notes by collecting all commit messages between the current and previous tag. The release notes include:

- A list of changes with commit hashes
- Proper pre-release marking for beta/alpha versions
