# Phase 0 Spike: Starter TanStack Stack Validation

## Verdict

AMBER: proceed with the RC scaffold on Rspack, with one explicit fallback.

The app was bootstrapped with `create-react-on-rails-app --rsc --rspack --package-manager pnpm` and is now pinned to the `16.7.0-rc.1` React on Rails release candidate. The Rails/Rspack/React on Rails Pro setup passes `react_on_rails:doctor` with zero warnings after local adjustments.

## Validation Goals

- TanStack Router under a Rails shell route.
- TanStack Query against Rails JSON endpoints with CSRF.
- shadcn/ui inside an RSC component on the public landing.
- All three together with React on Rails Pro RSC, streaming, and Rspack.

## What Worked

- Rails 8.1 app scaffolded with PostgreSQL and SolidQueue.
- React on Rails and React on Rails Pro pinned to `16.7.0.rc.1`.
- Shakapacker pinned to `10.1.0.rc.2`.
- Rspack builds complete successfully after the fallback below.
- The `/dashboard` TanStack Router, Query, and Table surface prerenders through React on Rails Pro's Node renderer and hydrates under the Rails shell.
- `bundle exec rails react_on_rails:doctor` reports 50 checks passed, 0 warnings, 0 errors.
- `bin/doctor`, `bin/setup`, RSpec, and Playwright smoke tests pass locally.

## Fallback Applied

`react-on-rails-rsc` currently calls `contextModuleFactory.resolveDependencies` inside `RSCWebpackPlugin`. Rspack does not expose that Webpack API, so `bin/shakapacker` fails when the plugin is added to client/server bundles.

Fallback:

- Keep Rspack as the bundler.
- Keep the React on Rails and Shakapacker RC releases.
- Skip `RSCWebpackPlugin` only when `config.assets_bundler == "rspack"`.
- Keep direct Rspack packages aligned with the Shakapacker Rspack 2 adapter: `@rspack/core` / `@rspack/cli` `2.0.4` and `@rspack/dev-server` `2.0.1`.

Impact:

- Rspack build is green.
- Server-only RSC bundle compilation is green.
- Interactive client-component references inside RSC remain blocked until `react-on-rails-rsc` supports Rspack's plugin API.

## Phase 4 Validation

The full TanStack Router + Query + Table surface is implemented on `/dashboard` with classic React on Rails Pro SSR. The Phase 0 AMBER status now applies only to interactive RSC client-reference support on Rspack, not to the authenticated TanStack dashboard.
