# Phase 0 Spike: Starter TanStack Stack Validation

## Verdict

GREEN: proceed with the RC scaffold on Rspack.

`react-on-rails-rsc@19.0.5-rc.2` adds the Rspack plugin path needed by this
starter. The default Rspack build now emits both React Server Components
client-reference manifests:

- `public/packs/react-client-manifest.json`
- `ssr-generated/react-server-client-manifest.json`

The remaining limitation is separate from the bundler: `/hello_server`'s client
island still waits on the upstream React on Rails Pro streaming CSP nonce fix in
strict production CSP mode. See `docs/11-rsc-csp-nonce-spike.md`.

The app was bootstrapped with `create-react-on-rails-app --rsc --rspack --package-manager pnpm` and the current release stack targets React on Rails Pro `17.0.0-rc.3` with Shakapacker `10.1.0`. Shakapacker stays on `10.1.0` because public `11.1.0` artifacts are not visible in the registries consumed by the starter. The Rails/Rspack/React on Rails Pro setup passes `react_on_rails:doctor` with the expected warning that both Rspack and Webpack configs are present.

## Validation Goals

- TanStack Router under a Rails shell route.
- TanStack Query against Rails JSON endpoints with CSRF.
- shadcn/ui inside an RSC component on the public landing.
- All three together with React on Rails Pro RSC, streaming, and Rspack.

## What Worked

- Rails 8.1 app scaffolded with PostgreSQL and SolidQueue.
- React on Rails and React on Rails Pro release stack: `17.0.0.rc.3`.
- Shakapacker launch stack: `10.1.0`.
- Rspack builds complete successfully and emit the RSC client-reference
  manifests with `react-on-rails-rsc@19.0.5-rc.2`.
- The `/dashboard` TanStack Router, Query, and Table surface prerenders through React on Rails Pro's Node renderer and hydrates under the Rails shell.
- `bundle exec rails react_on_rails:doctor` reports 50 checks passed, 1 warning, 0 errors.
- `bin/doctor`, `bin/setup`, RSpec, and Playwright smoke tests pass locally.

## Rspack/RSC Status

The Rspack client, server, and server-only RSC bundles compile, and interactive
client-component references inside RSC are no longer blocked by missing
manifests. `pnpm run repro:rspack-rsc` now reports `"status": "ready"` with both
manifests present.

Current stance:

- Keep Rspack as the bundler.
- Keep the React on Rails Pro `17.0.0-rc.3` and Shakapacker `10.1.0` release stack.
- Keep the Rspack/RSC client boundary repro in `pnpm run repro:rspack-rsc`.
- Keep direct Rspack packages aligned with the Shakapacker Rspack 2 adapter: `@rspack/core` / `@rspack/cli` `2.0.4` and `@rspack/dev-server` `2.0.1`.
- Keep `react-on-rails-rsc` on `19.0.5-rc.7` or newer when requiring Rspack RSC
  client-reference manifests.

Impact:

- Rspack build is green.
- Server-only RSC bundle compilation is green.
- Rspack client/server RSC manifest generation is green.
- `/hello_server` is covered by `bin/test hello-server-rsc`; use
  `REQUIRE_RSC_MANIFESTS=true pnpm run repro:rspack-rsc` when intentionally
  requiring manifest generation in a focused check.

## Phase 4 Validation

The full TanStack Router + Query + Table surface is implemented on `/dashboard`
with classic React on Rails Pro SSR. Public RSC composition is implemented on
`/rsc-showcase` with a bare TanStack Router loader fetching a Pro RSC payload on
the default Rspack bundler.

## Webpack RSC Spike (historical bridge)

Before `react-on-rails-rsc@19.0.5-rc.2`, switching the bundler from Rspack to
Webpack made interactive RSC work: the Webpack build emitted both RSC
client-reference manifests, the Node renderer loaded them, and `/hello_server`
rendered end-to-end with `REQUIRE_RSC_MANIFESTS=true`.

- Rspack remains the committed default in `config/shakapacker.yml` and
  `.controlplane/Dockerfile`. Webpack is opt-in via
  `SHAKAPACKER_ASSETS_BUNDLER=webpack` or `bin/shakapacker --bundler webpack`,
  with configs in `config/webpack/`.
- The original root cause of the Rspack gap is resolved by
  `react-on-rails-rsc`'s `RSCRspackPlugin`.
- Tradeoff: the Webpack build is ~3× slower (~8 s vs ~3 s). Bundle size is comparable.
- `/rsc-showcase` remains the public RSC + TanStack centerpiece: a bare
  TanStack Router loader fetches a React on Rails Pro RSC payload from Rails and
  composes the Flight tree beside a client island. This is not TanStack Start
  parity; it keeps the starter on Rails + React on Rails Pro + bare
  `@tanstack/react-router`.
- The full app was previously verified on Webpack as a bridge. That bridge now
  remains as an opt-in comparison path. A `config/swc.config.js` (automatic JSX
  runtime) remains for the Webpack path.
- Full details, evidence, full-app verification, deploy wiring, and the go/no-go: `docs/09-rsc-webpack-bundler-spike.md`.
