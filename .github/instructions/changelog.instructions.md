---
applyTo: 'CHANGELOG.md'
---

Do not edit the file unless explicitly requested by the user.
When releasing a new version, you will be asked to create a new section in the `CHANGELOG.md` file for the version based on "Unreleased Changes".

# Style guidelines

- Use semantic versioning headings (e.g., ## <version>)
- Release candidates are supported with version suffix format (e.g., `0.5.0-rc.1` should be labeled as "0.5.0 (Release Candidate 1)" in the changelog)
- Do not use subheadings
- Do not mention commit hashes
- Write in past tense (e.g., "improved", "introduced", "added")
- Balance technical accuracy with user-facing language
- Use bullet points for individual changes

# Content guidelines

- Entries should be concise but can include technical details relevant to users
- Write a bullet point for every new, changed, fixed, or removed feature
- Do not use emojis
- Include both user benefits and technical specifics when relevant

# Writing patterns

## Change descriptions

- **New tools/features**: "Added [tool/feature name] [brief description]"
- **Improvements**: "Improved [component] to [specific enhancement]"
- **Bug fixes**: "Fixed [issue description]" or "Fixed: [specific problem]"
- **Removals**: "Removed [item] [reason if relevant]"
- **Technical changes**: Include scope changes, API modifications, and architectural improvements

## User-centric language

- Emphasize user capabilities: "You can now...", "You will now find...", "It is now possible to..."
- Explain business value: "enabling more precise...", "providing greater flexibility...", "ensuring smoother performance..."
- Use positive framing: "enhanced", "improved", "better", "more accurate"

## Technical details to include

- Tool additions, modifications, and removals
- Scope changes and OAuth permissions
- API endpoint changes that affect users
- Performance improvements with specific impacts
- Breaking changes with migration guidance
