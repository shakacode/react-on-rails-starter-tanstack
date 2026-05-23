# Control Plane Deployment

This repo uses `cpflow` to generate a Heroku Flow style Control Plane setup:

- review apps for pull requests
- staging deploys from `main`
- manual promotion from staging to production
- nightly cleanup for stale review apps

The app runs three image-backed workloads:

- `rails`: public web workload
- `worker`: Solid Queue worker via `./bin/jobs`
- `renderer`: React on Rails Pro Node renderer on port `3800`

PostgreSQL runs as a stateful workload for review/staging demos. Production
should be reviewed before launch; a managed database is usually preferable.

## GitHub Repository Settings

For review apps in this repo, GitHub needs only one repository secret:

| Secret | Notes |
| --- | --- |
| `CPLN_TOKEN_STAGING` | Control Plane service-account token for the staging org. |

No GitHub repository variables are required for the normal review-app workflow.
The generated workflow infers the review app prefix
`react-on-rails-starter-tanstack-pr` and staging org
`shakacode-open-source-examples-staging` from `.controlplane/controlplane.yml`
because that file defines exactly one app with
`match_if_app_name_starts_with: true`.

Optional review-app variables:

| Variable | Notes |
| --- | --- |
| `CPLN_ORG_STAGING` | Override the inferred staging org. |
| `REVIEW_APP_PREFIX` | Override or disambiguate the inferred review app prefix. |
| `PRIMARY_WORKLOAD` | Public workload name used to discover the review URL; defaults to `rails`. |

For staging auto-deploys later, configure:

| Secret or variable | Value |
| --- | --- |
| `CPLN_TOKEN_STAGING` | Same staging Control Plane token used by review apps. |
| `CPLN_ORG_STAGING` | `shakacode-open-source-examples-staging` |
| `STAGING_APP_NAME` | `react-on-rails-starter-tanstack-staging` |

For production promotion later, configure a protected GitHub Environment named
`production`:

| Secret or variable | Value |
| --- | --- |
| `CPLN_TOKEN_PRODUCTION` | Environment secret on `production`, not a repository or organization secret. |
| `CPLN_ORG_PRODUCTION` | Environment variable on `production`: `shakacode-open-source-examples-production` |
| `PRODUCTION_APP_NAME` | Environment variable on `production`: `react-on-rails-starter-tanstack-production` |

Protect the `production` environment with required reviewers, enable prevent
self-review, and consider disabling administrator bypass. The promotion workflow
uses that environment before it can access `CPLN_TOKEN_PRODUCTION`, so the
production token is not exposed to ordinary review-app or staging runs.

Optional build variables:

| Name | Notes |
| --- | --- |
| `DOCKER_BUILD_EXTRA_ARGS` | Newline-delimited extra `docker build` tokens, such as `--build-arg=FOO=bar`. |
| `DOCKER_BUILD_SSH_KEY` | Private SSH key used when Docker builds fetch private dependencies through SSH. |
| `DOCKER_BUILD_SSH_KNOWN_HOSTS` | SSH `known_hosts` entries when SSH build hosts are not GitHub.com. |

Advanced optional variables:

| Name | Notes |
| --- | --- |
| `REVIEW_APP_DEPLOYING_ICON_URL` | Cosmetic custom animated icon for review-app comments. Ignore this for the standard setup. |
| `CPLN_CLI_VERSION` | Pin only when Control Plane CLI compatibility requires it. |
| `CPFLOW_VERSION` | Runtime gem override. Leave unset when workflow wrappers are pinned to a GitHub commit SHA for upstream PR testing. |

## Control Plane Secrets

These are Control Plane app runtime secrets, not GitHub repository variables.

The generated app template expects the app secret dictionary to provide:

- `SECRET_KEY_BASE`
- `RENDERER_PASSWORD`
- `REACT_ON_RAILS_PRO_LICENSE`

Generate values with:

```sh
openssl rand -hex 64 # SECRET_KEY_BASE
openssl rand -hex 32 # RENDERER_PASSWORD
```

The `RENDERER_PASSWORD` value must match on both Rails and the Node renderer;
both workloads inherit the same GVC environment, so one secret value covers both.

## Local Validation

Run:

```sh
ruby /path/to/control-plane-flow/bin/cpflow github-flow-readiness
bin/test-cpflow-github-flow ruby /path/to/control-plane-flow/bin/cpflow
```

This repo is locked at runtime by the generated workflow wrapper GitHub ref, not
by the gem alone. The wrappers currently point both `uses: ...@<ref>` and
`control_plane_flow_ref: <ref>` to the upstream `control-plane-flow` commit
`db013e139af4ee8741f791c14ff825f13c0a1021` so this PR can test unreleased
workflow changes before the next `cpflow` release. GitHub loads the reusable
workflow and shared actions from that GitHub ref. The gem is used to
generate/update these wrappers and is only installed at workflow runtime when
`CPFLOW_VERSION` is set.

To move to a newer stable `cpflow` release:

1. Install or bundle the released `cpflow` gem.
2. Run `cpflow generate-github-actions`.
3. Verify the generated wrappers point to the matching tag, such as `v5.0.1`.
4. Leave `CPFLOW_VERSION` unset, or set it to the same RubyGems version without
   the leading `v`. For prereleases, use dot syntax such as `5.0.0.rc.1`.
5. Run `bin/test-cpflow-github-flow`.

If the generated files are already current and only the upstream tag needs to
move, run:

```sh
bin/pin-cpflow-github-ref v5.0.1
```

When testing unreleased `control-plane-flow` changes before a release, pin the
wrappers to a full 40-character upstream commit SHA and leave `CPFLOW_VERSION`
unset so the workflow builds the gem from the same source as the reusable
workflow and actions. Do not commit moving branch refs such as `main`.

## Review App Smoke Test

After the workflow PR merges and `CPLN_TOKEN_STAGING` is configured, create a
review app by commenting exactly:

```text
+review-app-deploy
```

The workflow should build the image, create or update
`react-on-rails-starter-tanstack-pr-<PR number>`, and comment with the review URL.
