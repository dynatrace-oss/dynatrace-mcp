---
applyTo: 'package.json'
---

# package.json Instructions

## Dependency Versioning

Always use **exact version numbers** for all entries in `dependencies` and `devDependencies`. Do not use range specifiers such as `^`, `~`, or `*`.

**Correct:**

```json
"@commitlint/cli": "20.5.0",
"typescript": "5.9.3"
```

**Incorrect:**

```json
"@commitlint/cli": "^20.5.0",
"typescript": "~5.9.3"
```

Pinning exact versions ensures reproducible installs and prevents unexpected breakage from transitive upgrades. Dependency updates are managed deliberately via Dependabot, which opens dedicated PRs for each version bump.

## No `overrides`

Do **not** add entries to the `"overrides"` section of `package.json` to force transitive dependency versions. Instead, update `package-lock.json` directly by running `npm install` — once the lock file pins a version, subsequent installs will respect it without needing an override.
