# Dependabot Configuration

This repository uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to automatically manage dependency updates.

## What's Configured

### 1. **npm Dependencies** (`/.github/dependabot.yml`)

- **Schedule**: Weekly on Mondays at 06:00 UTC
- **Grouping**:
  - `@dynatrace-sdk/*` packages are grouped together
  - Development dependencies are grouped separately
  - Major updates are grouped separately for careful review
- **Limits**: Maximum 10 open PRs at once
- **Auto-ignore**: Major version updates for `@modelcontextprotocol/sdk` and `dt-app` to prevent breaking changes

### 2. **GitHub Actions** (`/.github/dependabot.yml`)

- **Schedule**: Weekly on Mondays at 06:00 UTC
- **Limits**: Maximum 5 open PRs at once
- Updates GitHub Actions in workflows to latest versions

### 3. **Docker Dependencies** (`/.github/dependabot.yml`)

- **Schedule**: Weekly on Mondays at 06:00 UTC
- **Limits**: Maximum 3 open PRs at once
- Updates base images in Dockerfile

## Manual Review Process

All dependency updates require manual review and approval:

- **All Updates**: Maintainers review and approve all dependency updates
- **CI Testing**: All PRs go through the standard CI pipeline (build, test, prettier)
- **Grouped PRs**: Related dependencies are updated together for easier review
- **Clear Labeling**: PRs are properly categorized and assigned to maintainers

## How It Works

1. **Weekly Check**: Every Monday, Dependabot checks for outdated dependencies
2. **PR Creation**: Creates PRs for available updates (grouped by category)
3. **Assignment**: PRs are automatically assigned to `dynatrace-oss/dynatrace-mcp-maintainers`
4. **CI Testing**: All PRs go through the standard CI pipeline (build, test, prettier)
5. **Manual Review**: Maintainers review and manually merge approved PRs
6. **Full Control**: No automatic merging ensures careful review of all changes

## Customization

To modify Dependabot behavior:

- Edit `.github/dependabot.yml` for dependency monitoring configuration
- Adjust grouping, scheduling, or ignore rules as needed

## Benefits

- **Security**: Automatic detection of security updates
- **Visibility**: Clear overview of available dependency updates
- **Organization**: Related dependencies are grouped together
- **Control**: Full manual control over what gets merged and when
- **CI Integration**: All updates are tested before review
