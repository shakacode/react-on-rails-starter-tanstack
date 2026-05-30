# Phase 0 Spike: Starter TanStack Stack Validation

## Verdict

AMBER: proceed with the RC scaffold on Rspack, with one explicit limitation.

The app was bootstrapped with `create-react-on-rails-app --rsc --rspack --package-manager pnpm` and the launch stack targets React on Rails Pro `16.7.0-rc.3` with Shakapacker `10.1.0`. Shakapacker stays on `10.1.0` because public `11.1.0` artifacts are not visible in the registries consumed by the starter. The Rails/Rspack/React on Rails Pro setup passes `react_on_rails:doctor` with zero warnings after local adjustments.

## Validation Goals

- TanStack Router under a Rails shell route.
- TanStack Query against Rails JSON endpoints with CSRF.
- shadcn/ui inside an RSC component on the public landing.
- All three together with React on Rails Pro RSC, streaming, and Rspack.

## What Worked

- Rails 8.1 app scaffolded with PostgreSQL and SolidQueue.
- React on Rails and React on Rails Pro launch stack: `16.7.0.rc.3`.
- Shakapacker launch stack: `10.1.0`.
- Rspack builds complete successfully with the limitation below.
- The `/dashboard` TanStack Router, Query, and Table surface prerenders through React on Rails Pro's Node renderer and hydrates under the Rails shell.
- `bundle exec rails react_on_rails:doctor` reports 50 checks passed, 0 warnings, 0 errors.
- `bin/doctor`, `bin/setup`, RSpec, and Playwright smoke tests pass locally.

## Rspack/RSC Limitation

The Rspack client, server, and server-only RSC bundles compile, but interactive client-component references inside RSC remain blocked. The Rspack build does not emit the React Server Components client/server manifests expected by the React on Rails RSC client-reference path.

Current stance:

- Keep Rspack as the bundler.
- Keep the React on Rails Pro `16.7.0-rc.3` and Shakapacker `10.1.0` launch stack.
- Keep the Rspack/RSC client boundary repro in `pnpm run repro:rspack-rsc`.
- Keep direct Rspack packages aligned with the Shakapacker Rspack 2 adapter: `@rspack/core` / `@rspack/cli` `2.0.4` and `@rspack/dev-server` `2.0.1`.

Impact:

- Rspack build is green.
- Server-only RSC bundle compilation is green.
- Interactive client-component references inside RSC remain blocked until the Rspack path can provide the required RSC manifests, or `react-on-rails-rsc` supports Rspack's plugin API directly.
- `/hello_server` is covered by `bin/test hello-server-rsc`, which treats a render as passing and also treats the current missing-manifest route failure as the expected Rspack/RSC limitation unless `REQUIRE_RSC_MANIFESTS=true` is set.

## Phase 4 Validation

The full TanStack Router + Query + Table surface is implemented on `/dashboard` with classic React on Rails Pro SSR. The Phase 0 AMBER status now applies only to interactive RSC client-reference support on Rspack, not to the authenticated TanStack dashboard.

## Webpack RSC Spike (resolves the AMBER limitation on Webpack)

Switching the bundler from Rspack to Webpack makes interactive RSC work: the Webpack build emits both RSC client-reference manifests (`public/packs/react-client-manifest.json` and `ssr-generated/react-server-client-manifest.json`), the Node renderer loads them, and `/hello_server` renders end-to-end with `REQUIRE_RSC_MANIFESTS=true`.

- Rspack remains the committed default in `config/shakapacker.yml` (fast local DX); Webpack is opt-in via `SHAKAPACKER_ASSETS_BUNDLER=webpack` or `bin/shakapacker --bundler webpack`, with configs in `config/webpack/`.
- The root cause of the Rspack gap is confirmed: `react-on-rails-rsc`'s `RSCWebpackPlugin` is hard-wired to Webpack internals (`webpack/lib/...`) that Rspack does not expose.
- Tradeoff: the Webpack build is ~3× slower (~8 s vs ~3 s). Bundle size is comparable.
- `/rsc-showcase` uses the Webpack bridge as the public RSC + TanStack
  centerpiece: a bare TanStack Router loader fetches a React on Rails Pro RSC
  payload from Rails and composes the Flight tree beside a client island. This
  is not TanStack Start parity; it keeps the starter on Rails + React on Rails
  Pro + bare `@tanstack/react-router`.
- **Adopted for deploy:** the full app (landing, classic CRUD, auth, TanStack dashboard SSR, `/hello_server`, `/rsc-showcase`, RSpec, Playwright, production boot) is verified on Webpack, and the Docker build (`.controlplane/Dockerfile`) is wired to build on Webpack via `ARG SHAKAPACKER_ASSETS_BUNDLER=webpack` (one-line revert to Rspack). A `config/swc.config.js` (automatic JSX runtime) was required for the Webpack path. Known upstream follow-up: the `/hello_server` client island does not hydrate under the strict production CSP because React's streaming inline scripts lack the nonce — a react-on-rails-pro issue, not a bundler one.
- Full details, evidence, full-app verification, deploy wiring, and the go/no-go: `docs/09-rsc-webpack-bundler-spike.md`.
