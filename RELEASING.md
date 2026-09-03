# Releasing Homey CLI

The version workflow supports stable releases from `develop` and testing releases from branches
other than `master` and `production`. Start it from **Actions → Update Package Version**, select the
source branch, and choose a major, minor, or patch bump. Direct version bumps on the two promotion
branches are rejected.

## Stable releases

1. Run **Update Package Version** on `develop`.
2. Review the generated draft GitHub Release and the `develop` to `master` pull request.
3. Merge the pull request into `master`. Merge commits, squash merges, and rebase merges are all
   supported, provided the resulting repository contents match the tagged release.
4. Edit the release notes as needed and publish the GitHub Release. The notes may be empty, but the
   release must be published.
5. Publishing the release and merging into `master` jointly cause a `master` to `production` pull
   request to be opened. Either action may happen first.
6. Review and merge the production pull request. The production workflow verifies the published
   release again before publishing the matching version to npm with the `latest` dist-tag.

Only one stable draft may exist. Publish it and complete both promotion pull requests before
starting another stable version. The workflow verifies that the current version on `develop` has a
published stable GitHub Release, matches the contents and version on `production`, and is the npm
`latest` version. This prevents a later release from entering an older, still-open production pull
request or bypassing a deleted draft.

## Testing releases

Run **Update Package Version** on the branch that contains the testing changes, then merge or push
that version to `testing`. A non-`develop` bump creates only the version commit and tag: it does not
inspect drafts, create a GitHub Release, or open a promotion pull request.

Pushing `testing` publishes the package with the npm `beta` dist-tag. Testing releases currently use
ordinary semantic versions rather than prerelease versions. npm versions are immutable, so a version
published as beta cannot later be published again as a stable artifact; use a new version for the
subsequent stable release.

## Naming

- Version commit: `chore(release): vX.Y.Z`
- Git tag and GitHub Release: `vX.Y.Z`
- Stable pull requests: `Release vX.Y.Z` and `Release vX.Y.Z to production`

## Recovering from failures

All validation runs before the version commit is created, and the commit and tag are pushed
atomically. If GitHub Release creation fails after that push, create the missing draft manually from
the existing tag; do not run another bump. If pull-request creation fails, keep the draft and create
the corresponding promotion pull request manually.

The promotion workflow is safe to rerun manually. It opens a pull request only after both the
published GitHub Release and matching tagged contents on `master` exist, and it does nothing if a
promotion pull request is already open or production already has the release version.
