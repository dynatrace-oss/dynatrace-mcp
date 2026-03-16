# How to Contribute

We'd love to accept your patches and contributions to this project. There are
just a few small guidelines you need to follow.

## Contributor License Agreement

Contributions to this project must be accompanied by a Contributor License
Agreement. You (or your employer) retain the copyright to your contribution;
this simply gives us permission to use and redistribute your contributions as
part of the project.

You generally only need to submit a CLA once, so if you've already submitted one
(even if it was for a different project), you probably don't need to do it
again.

## Code Reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases.

### Making a change that should trigger a release

If your pull request introduces a user-visible change (new feature, bug fix, etc.), add a changeset to it:

```bash
npx changeset
```

This starts an interactive prompt that asks you to:

1. Select the type of change: **major** (breaking change), **minor** (new feature), or **patch** (bug fix).
2. Write a short description of the change. This description will appear in `CHANGELOG.md`.

The command creates a small Markdown file in the `.changeset/` directory. Commit and push that file along with your other changes.

Changes that are purely internal (refactoring, test updates, documentation tweaks, CI configuration) do not need a changeset.

### How releases are created

After a pull request with a changeset is merged into `main`, the **Changesets** GitHub Actions workflow (`.github/workflows/changeset.yml`) automatically:

1. Opens (or updates) a **"chore(release): version packages"** pull request.  
   This PR contains the version bump in `package.json`, `server.json`, and `gemini-extension.json`, as well as the updated `CHANGELOG.md`.
2. Keeps the release PR up-to-date as additional changesets land on `main`.

When that release PR is merged into `main`, the workflow publishes the new version to [npm](https://www.npmjs.com/package/@dynatrace-oss/dynatrace-mcp-server) and the [MCP Registry](https://github.com/modelcontextprotocol/registry) automatically.
