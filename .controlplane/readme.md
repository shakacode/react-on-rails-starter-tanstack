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

These inferred values come from `.controlplane/controlplane.yml`: the review-app
prefix is the app key with `match_if_app_name_starts_with: true`, and the
staging org is the `cpln_org` value on that app or its shared alias. The
variables below are escape hatches for forks and clones, so someone can test
this repo against their own Control Plane org, choose a different review-app
prefix, or expose a different public workload without editing the generated
workflow. Leave them unset for the standard setup.

Optional review-app override variables:

| Variable | Notes |
| --- | --- |
| `CPLN_ORG_STAGING` | Override the staging org inferred from `cpln_org` in `.controlplane/controlplane.yml`. |
| `REVIEW_APP_PREFIX` | Override the review-app app key inferred from the `match_if_app_name_starts_with: true` entry. |
| `PRIMARY_WORKLOAD` | Override the public workload used to discover the review URL; leave unset for `rails`. |

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
self-review, and consider disabling administrator bypass. Only release managers
or similarly trusted maintainers should be able to approve the promotion job.
The promotion workflow uses that environment before it can access
`CPLN_TOKEN_PRODUCTION`, so the production token is not exposed to ordinary
review-app or staging runs.

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

## Control Plane Setup

The GitHub secret is only the automation credential. The Control Plane org also
needs the app resources and runtime secrets that the workloads read at boot.

For review-app testing, the standard setup is:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Staging/review org | `shakacode-open-source-examples-staging` | The `CPLN_TOKEN_STAGING` service account must be able to create and update GVCs, workloads, images, identities, policies, and secrets in this org. |
| Review app prefix | `react-on-rails-starter-tanstack-pr` | Review apps are named `react-on-rails-starter-tanstack-pr-<PR number>`. This is inferred from `.controlplane/controlplane.yml`. |
| Review app secret dictionary | `react-on-rails-starter-tanstack-pr-secrets` | Shared by generated review apps because the PR app entry uses `match_if_app_name_starts_with: true`. |

For staging deploys later, also use:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Staging app | `react-on-rails-starter-tanstack-staging` | The `CPLN_TOKEN_STAGING` token deploys this app from `main`. |
| Staging app secret dictionary | `react-on-rails-starter-tanstack-staging-secrets` | Same required keys as the review app secret dictionary. |

For production promotion later, use a separate production org and token:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Production org | `shakacode-open-source-examples-production` | Do not give the staging token access to this org. |
| Production app | `react-on-rails-starter-tanstack-production` | Promotion copies the staging image into this app. |
| Production app secret dictionary | `react-on-rails-starter-tanstack-production-secrets` | Create before the first promotion. Use production-only values. |
| Production service-account token | GitHub Environment secret `CPLN_TOKEN_PRODUCTION` | Keep this token in the protected `production` GitHub Environment only. |

The demo PostgreSQL workload template creates `postgres-poc-credentials` for
review/staging demos. Replace the placeholder password before serious staging
testing. For real production, prefer a managed database and update the
`DATABASE_*` environment values accordingly.

## Control Plane App Secrets

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
