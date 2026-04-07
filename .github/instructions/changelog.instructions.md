---
applyTo: 'CHANGELOG.md'
---

When releasing a new version, you will be asked to create a new section in the `CHANGELOG.md` file for the version based on "Unreleased Changes".

# What belongs in the changelog

Only include changes that are **relevant to end-users**:

- New tools or features
- Bug fixes and reliability improvements
- Authentication or scope changes
- Breaking changes or migration guidance
- Dependency updates that fix security vulnerabilities
- Routine dependency updates (non-dev dependencies), summarized in a single line listing all updated packages with their old and new versions

Do **not** add entries for internal/technical changes that have no user-visible impact, such as:

- Refactoring or code cleanup
- Test additions or updates
- Documentation or instruction file updates
- Tooling and build configuration changes
- Dev-only dependency updates (e.g., `vite`, `@types/*`, test frameworks)

# Style guidelines

- Use semantic versioning headings (e.g., ## <version>)
- Release candidates are supported with a version suffix format (e.g., `0.5.0-rc.1` should be labeled as "0.5.0 (Release Candidate 1)" in the changelog)
- Do not use subheadings
- Do not mention commit hashes, pull request numbers, or ticket IDs
- Write in past tense (e.g., "improved", "introduced", "added")
- Balance technical accuracy with user-facing language
- Use bullet points for individual changes

# Content guidelines

- Entries should be concise but can include technical details relevant to users
- Write a bullet point for every new, changed, fixed, or removed feature
- No emojis
- Include both user benefits and technical specifics when relevant
- Use user-centric language ("You can now...", "You will now find...", "It is now possible to...")
- Explain business value ("enabling more precise...", "providing greater flexibility...", "ensuring smoother performance...")

## Examples

- **New tools/features**: "Added [tool/feature name] [brief description]"
- **Improvements**: "Improved [component] to [specific enhancement]"
- **Bug fixes**: "Fixed [issue description]" or "Fixed: [specific problem]"
- **Removals**: "Removed [item] [reason if relevant]"
- **Technical changes**: Include scope changes, API modifications, and architectural improvements
- **Dependency updates**: "Updated `pkg-a` (1.0.0 → 1.1.0), `pkg-b` (2.3.0 → 2.4.0), and `pkg-c` (0.5.1 → 0.6.0)." — all non-dev dependency updates in a single bullet point
