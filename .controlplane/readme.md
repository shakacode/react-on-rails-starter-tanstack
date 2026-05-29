# Control Plane Deployment

This repo uses `cpflow` to generate a Heroku Flow style Control Plane setup:

- review apps for pull requests
- staging deploys from `main`
- manual promotion from staging to production
- nightly cleanup for stale review apps

The app runs three image-backed workloads:

- `rails`: public web workload
- `worker`: Solid Queue worker via `./bin/jobs`
- `renderer`: React on Rails Pro Node renderer on HTTP/2 port `3800`

PostgreSQL runs as a stateful workload for review/staging demos. Production
should be reviewed before launch; a managed database is usually preferable.

## GitHub Repository Settings

For review apps in this repo, GitHub needs only one repository secret:

| Secret | Notes |
| --- | --- |
| `CPLN_TOKEN_STAGING` | Control Plane service-account token for the staging org. |

No GitHub repository variables are required for the normal review-app workflow.
The generated workflow infers the review app prefix
`react-on-rails-starter-tanstack-review-pr` and staging org
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
The generated caller passes `production_environment: production`; the upstream
reusable workflow runs its production job in that environment, so GitHub injects
`CPLN_TOKEN_PRODUCTION` only after the environment approval gate passes. The
production token is not exposed to ordinary review-app or staging runs.

Generated caller workflows pass only the named secrets each upstream workflow
needs. They do not use `secrets: inherit`; `CPLN_TOKEN_PRODUCTION` is supplied
only by the protected `production` Environment after approval.

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
| `CPFLOW_VERSION` | Runtime gem override. Normally leave unset. If set, it must match the workflow tag without the leading `v`, such as `5.0.4`. |

## Control Plane Setup

The GitHub secret is only the automation credential. The Control Plane org also
needs the app resources and runtime secrets that the workloads read at boot.
Staging and review app GVCs should appear in:

```text
https://console.cpln.io/console/org/shakacode-open-source-examples-staging/gvc
```

Expected names:

- `react-on-rails-starter-tanstack-staging`
- `react-on-rails-starter-tanstack-review-pr-<PR number>`

For review-app testing, the standard setup is:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Staging/review org | `shakacode-open-source-examples-staging` | The `CPLN_TOKEN_STAGING` service account must be able to create and update GVCs, workloads, images, identities, policies, and secrets in this org. |
| Review app prefix | `react-on-rails-starter-tanstack-review-pr` | Review apps are named `react-on-rails-starter-tanstack-review-pr-<PR number>`. This is inferred from `.controlplane/controlplane.yml`. |
| Review app secret dictionary | `react-on-rails-starter-tanstack-review-pr-secrets` | Shared by generated review apps because the PR app entry uses `match_if_app_name_starts_with: true`. |

For staging deploys later, also use:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Staging app | `react-on-rails-starter-tanstack-staging` | The `CPLN_TOKEN_STAGING` token deploys this app from `main`. |
| Staging app secret dictionary | `react-on-rails-starter-tanstack-staging-secrets` | Same required keys as the review app secret dictionary. |

Bootstrap the persistent staging app once before the first merge-to-main
deploy:

```sh
cpflow setup-app -a react-on-rails-starter-tanstack-staging --org shakacode-open-source-examples-staging --skip-post-creation-hook
```

`setup-app` reads `setup_app_templates` from `.controlplane/controlplane.yml`
and creates the app identity, app secret dictionary, app secret policy, policy
binding, and template resources. Use `--skip-post-creation-hook` so first-time
bootstrap does not try to run database setup before a Docker image exists. For
later template updates on an existing persistent app, use
`cpflow apply-template` and make sure the app identity still has `reveal`
permission on the app secret policy.

For production promotion later, use a separate production org and token:

| Control Plane item | Where | Notes |
| --- | --- | --- |
| Production org | `shakacode-open-source-examples-production` | Do not give the staging token access to this org. |
| Production app | `react-on-rails-starter-tanstack-production` | Promotion copies the staging image into this app. |
| Production app secret dictionary | `react-on-rails-starter-tanstack-production-secrets` | Create before the first promotion. Use production-only values. |
| Production service-account token | GitHub Environment secret `CPLN_TOKEN_PRODUCTION` | Keep this token in the protected `production` GitHub Environment only. |

Bootstrap production the same way before the first promotion, using the
production org and production-only secret values.

The demo PostgreSQL workload template creates app-scoped resources for
review/staging demos: `<app-name>-pg`, `<app-name>-pg-script`,
`<app-name>-pg-access`, `<app-name>-pg-vs`, and `<app-name>-pg-identity`.
Replace the placeholder password before serious staging testing. For real
production, prefer a managed database and update the `DATABASE_*` environment
values accordingly.

Review app setup intentionally does not run a `post_creation` database hook in
`.controlplane/controlplane.yml`. On a first deploy there is no app image yet,
so a hook such as `bundle exec rails db:prepare` would start a one-off runner
with `NO_IMAGE_AVAILABLE` and block the workflow. Database preparation belongs
in `.controlplane/release_script.sh`, which runs after the Docker image is
built and before `cpflow deploy-image` updates the workloads.

Public demo review/staging apps can opt into the demo account by setting
`ALLOW_DEMO_SEED=true` on the app GVC before deploy. The release script will
then run `bin/rails db:seed` after `db:prepare`, creating the verified
`demo@example.com / password` user. Leave `ALLOW_DEMO_SEED` unset for normal
production-style deploys; the default seed file is intentionally a no-op in
production unless the flag is explicitly set.

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

The renderer workload exposes port `3800` as `http2` because React on Rails Pro's
Node renderer speaks cleartext HTTP/2. The renderer entrypoint binds to
`0.0.0.0` automatically in production so Control Plane can route to the
workload; no GitHub variable is required for this.

## Local Validation

Run:

```sh
ruby /path/to/control-plane-flow/bin/cpflow github-flow-readiness
bin/test-cpflow-github-flow ruby /path/to/control-plane-flow/bin/cpflow
```

This repo is locked at runtime by the generated workflow wrapper GitHub ref, not
by the gem alone. The wrappers currently point their `uses:` refs at the
upstream `control-plane-flow` release tag `v5.0.4`. GitHub loads the reusable
workflow from that tag, and the upstream workflow checks out its matching shared
actions from the same workflow context. Downstream wrappers should not pass a
duplicate `control_plane_flow_ref` input.

Using a release tag is deliberate for this demo path: it makes stable upgrades
easy to audit and keeps the docs, workflow wrapper, and published gem version
understandable. If your organization requires immutable GitHub Action refs, pin
the wrappers to the full 40-character commit SHA behind the release tag with
`bin/pin-cpflow-github-ref`, update the examples in this doc, and keep
`CPFLOW_VERSION` unset unless it exactly matches the same released gem.

To move to a newer stable `cpflow` release when generated templates changed:

1. Install or bundle the released `cpflow` gem.
2. Run `cpflow generate-github-actions`.
3. Verify the generated wrappers point to the matching tag, such as `v5.0.4`.
4. Leave `CPFLOW_VERSION` unset, or set it to the same RubyGems version without
   the leading `v`. For prereleases, use dot syntax such as `5.0.0.rc.1`.
5. Run `bin/test-cpflow-github-flow`.

If the generated files are already current and only the upstream tag needs to
move, run:

```sh
bin/pin-cpflow-github-ref v5.0.4
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
`react-on-rails-starter-tanstack-review-pr-<PR number>`, and comment with the review URL.
That name follows the generated `<review-app-prefix>-<PR number>` convention; this repo's prefix intentionally ends in `-pr`.
