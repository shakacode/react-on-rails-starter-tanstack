# Control Plane Handoff

Last updated: 2026-05-26 UTC.

This handoff summarizes the Control Plane Flow rollout for this repo after
[PR #11](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/11)
merged.

## Current State

- `main` includes the cpflow GitHub Actions wrappers pinned to
  `shakacode/control-plane-flow@v5.0.2`.
- PR #11 merged with squash commit
  `85a2bff7cbeb8d89ae39ca1d9f1d4a64ffd49964`.
- The PR review app deploy passed on commit
  `4b2b04420b0eb1bfe0fc5ea63f6d1b74a80c00b5`.
- The review app smoke test passed before cleanup:
  `https://rails-4y1pd78svfdc6.cpln.app/` returned `200`.
- The server-rendered route smoke test passed before cleanup:
  `https://rails-4y1pd78svfdc6.cpln.app/hello_server` returned `200`.
- PR-close cleanup completed successfully, and
  `react-on-rails-starter-tanstack-review-pr-11` no longer exists.
- Staging deploy run `26425930909` completed successfully from `main`.
- The persistent staging renderer needed the updated template applied after the
  merge because deploy-image updates images, not workload template shape.
- Staging smoke tests passed after the renderer template repair:
  `https://rails-1w9hq69n5eeyr.cpln.app/` and
  `https://rails-1w9hq69n5eeyr.cpln.app/hello_server` both returned `200`.

## What Changed

PR #11 did four things:

- Updated generated cpflow GitHub Action wrappers and docs from `v5.0.1` to
  `v5.0.2`.
- Documented the normal release-tag pinning workflow, plus the stricter
  full-SHA pinning path for organizations that require immutable GitHub Action
  refs.
- Corrected moved demo links so the generated pages do not point at stale
  repositories.
- Fixed the React on Rails Pro renderer deployment path for Control Plane:
  the renderer binds for production container routing and exposes port `3800`
  as `http2`.

## Important Fix

The React on Rails Pro Node renderer speaks cleartext HTTP/2. In Control Plane,
the renderer workload must expose port `3800` as `http2`, not `http`.

The durable template fix is in
`.controlplane/templates/renderer.yml`:

```yaml
ports:
  - number: 3800
    protocol: http2
```

The renderer entrypoint also sets a production bind address in
`client/node-renderer.js`:

```js
host: env.RENDERER_HOST || (env.RAILS_ENV === 'production' ? '0.0.0.0' : 'localhost'),
```

Without these settings, `/hello_server` can fail even when Rails and the
renderer workloads both look ready.

For existing persistent apps, merging the template change is not enough by
itself. `cpflow deploy-image` updates image tags, but it does not rewrite the
existing workload port protocol. After changing workload templates, apply the
changed template once:

```sh
cpflow apply-template renderer -a react-on-rails-starter-tanstack-staging --org shakacode-open-source-examples-staging --yes
```

Wait until `readyLatest: true`, then smoke `/hello_server`.

## Required Setup

Review apps use:

- Control Plane org: `shakacode-open-source-examples-staging`
- Review app prefix: `react-on-rails-starter-tanstack-review-pr`
- Review app GVC shape:
  `react-on-rails-starter-tanstack-review-pr-<PR number>`

For review apps, the normal GitHub setup is only:

```text
CPLN_TOKEN_STAGING
```

That value must be a GitHub repository secret. The workflow infers the staging
org, review app prefix, and public workload from `.controlplane/controlplane.yml`
for the standard path.

For staging deploys, configure:

```text
CPLN_TOKEN_STAGING
CPLN_ORG_STAGING=shakacode-open-source-examples-staging
STAGING_APP_NAME=react-on-rails-starter-tanstack-staging
```

For production promotion later, use a protected GitHub Environment named
`production`, not repository-level production secrets:

```text
CPLN_TOKEN_PRODUCTION
CPLN_ORG_PRODUCTION=shakacode-open-source-examples-production
PRODUCTION_APP_NAME=react-on-rails-starter-tanstack-production
```

Require reviewers on the `production` environment, prevent self-review, and
consider disabling administrator bypass. The production token should only become
available after the environment approval gate passes.

## Control Plane Secrets

These are Control Plane app runtime secrets, not GitHub variables:

```text
SECRET_KEY_BASE
RENDERER_PASSWORD
REACT_ON_RAILS_PRO_LICENSE
```

Generate values with:

```sh
openssl rand -hex 64 # SECRET_KEY_BASE
openssl rand -hex 32 # RENDERER_PASSWORD
```

`RENDERER_PASSWORD` must match for Rails and the renderer. The generated app
template reads it from the app secret dictionary, and both workloads inherit the
GVC environment.

The Pro license can be left blank for initial demo testing, but the renderer
logs a license warning. Production should use a real license value.

## Bootstrap

Bootstrap persistent staging once before relying on merge-to-main staging
deploys:

```sh
cpflow setup-app -a react-on-rails-starter-tanstack-staging --org shakacode-open-source-examples-staging --skip-post-creation-hook
```

Use `--skip-post-creation-hook` for first bootstrap because no deploy image
exists yet. Database preparation belongs in `.controlplane/release_script.sh`,
which runs after the Docker image is built.

For production, run the same setup against the production org and use
production-only secret values.

## Version Locking

Generated downstream workflows are locked by GitHub reusable workflow refs, not
by the local Ruby gem alone. This repo intentionally uses release tags for the
standard demo path:

```yaml
uses: shakacode/control-plane-flow/.github/workflows/<workflow>.yml@v5.0.2
```

Leave `CPFLOW_VERSION` unset for normal operation. If it is set, it must match
the workflow tag without the leading `v`, for example:

```text
CPFLOW_VERSION=5.0.2
```

For organizations that require immutable action refs, pin to the commit SHA
behind the release tag:

```sh
bin/pin-cpflow-github-ref <40-character-control-plane-flow-commit-sha>
```

Use full commit SHAs for short-lived tests of unreleased upstream changes.
Do not commit moving branch refs such as `main`.

## Validation Commands

Local checks used for this handoff:

```sh
node -c client/node-renderer.js
pnpm test:router-shim
bin/test-cpflow-github-flow
git diff --check
```

GitHub checks that passed for PR #11:

- `rspec`
- `playwright`
- `dev-modes`
- `deploy / deploy`
- `CodeRabbit`
- `Cursor Bugbot`

Post-merge checks:

- Staging deploy run `26425930909` passed.
- Review-app cleanup run `26425931041` passed.
- `react-on-rails-starter-tanstack-review-pr-11` was deleted.
- Staging renderer workload version `7` is `readyLatest: true` and exposes port
  `3800` as `http2`.
- Staging `/` and `/hello_server` returned `200`.

Review app smoke checks:

```sh
curl -L -s -o /dev/null -w '%{http_code}\n' https://rails-4y1pd78svfdc6.cpln.app/
curl -L -s -o /dev/null -w '%{http_code}\n' https://rails-4y1pd78svfdc6.cpln.app/hello_server
```

Renderer workload check:

```sh
cpln workload get renderer \
  --org shakacode-open-source-examples-staging \
  --gvc react-on-rails-starter-tanstack-review-pr-11 \
  -o yaml-slim
```

Expected renderer details:

```yaml
ports:
  - number: 3800
    protocol: http2
```

## Troubleshooting

If the root page returns `200` but `/hello_server` returns `500`, inspect Rails
and renderer logs:

```sh
cpln logs '{gvc="<app-gvc>", workload="rails"}' --org shakacode-open-source-examples-staging --since 15m --limit 160 --output raw
cpln logs '{gvc="<app-gvc>", workload="renderer"}' --org shakacode-open-source-examples-staging --since 15m --limit 160 --output raw
```

Useful log signatures:

- `delayed connect error: Connection refused`: verify the renderer image has the
  production bind-address change and the latest workload revision is ready.
- `upstream_reset_before_response_started{protocol_error}`: verify the renderer
  workload port protocol is `http2`.
- `No license found`: expected while the Pro license is blank. It is a warning,
  not the renderer protocol failure.

If GitHub Actions looks stalled with zero steps started, the blocker is usually
Actions queueing. Recheck the run rather than changing Control Plane settings.

## Operator Notes

Codex permission prompts are local sandbox approval prompts, not repo setup
requirements. To reduce repeat prompts, approve narrow saved prefixes for the
commands used in this workflow, such as:

```text
gh pr
gh run
gh api
git push
curl
cpln gvc
cpln workload
cpln logs
cpln apply
cpflow apply-template
pnpm test:router-shim
```

If a plain chat response says "yes" but the approval UI still rejects a command,
that is an approval-layer issue. Use the approval dialog's saved-prefix option
for the smallest useful command family.

## Follow-Up Checks

For future changes:

1. Verify the target GVC exists:

   ```sh
   cpln gvc get react-on-rails-starter-tanstack-staging --org shakacode-open-source-examples-staging -o yaml
   ```

2. If a workload template changed, run `cpflow apply-template` for existing
   persistent apps before relying on deploy-image alone.
3. Open or curl the Rails URL from the deploy output.
4. Smoke both `/` and `/hello_server`.
5. Confirm the renderer workload exposes port `3800` as `http2` and reports
   `readyLatest: true`.
