# Phase 0 Spike: Starter TanStack Stack Validation

## Verdict

AMBER: proceed with the RC scaffold on Rspack, with one explicit fallback.

The app bootstraps with `create-react-on-rails-app@16.7.0-rc.0 --rsc --rspack --package-manager pnpm`, and the Rails/Rspack/React on Rails Pro setup passes `react_on_rails:doctor` with zero warnings after local adjustments.

## Validation Goals

- TanStack Router under a Rails shell route.
- TanStack Query against Rails JSON endpoints with CSRF.
- shadcn/ui inside an RSC component on the public landing.
- All three together with React on Rails Pro RSC, streaming, and Rspack.

## What Worked

- Rails 8.1 app scaffolded with PostgreSQL and SolidQueue.
- React on Rails and React on Rails Pro pinned to `16.7.0.rc.0`.
- Shakapacker pinned to `10.1.0.rc.1`.
- Rspack builds complete successfully after the fallback below.
- `bundle exec rails react_on_rails:doctor` reports 50 checks passed, 0 warnings, 0 errors.
- `bin/doctor`, `bin/setup`, RSpec, and Playwright smoke tests pass locally.

## Fallback Applied

`react-on-rails-rsc` currently calls `contextModuleFactory.resolveDependencies` inside `RSCWebpackPlugin`. Rspack does not expose that Webpack API, so `bin/shakapacker` fails when the plugin is added to client/server bundles.

Fallback:

- Keep Rspack as the bundler.
- Keep the React on Rails and Shakapacker RC releases.
- Skip `RSCWebpackPlugin` only when `config.assets_bundler == "rspack"`.
- Pin direct Rspack packages to the generator-compatible `1.7.x` line while keeping `shakapacker-rspack@10.1.0-rc.1` installed for RC coverage.

Impact:

- Rspack build is green.
- Server-only RSC bundle compilation is green.
- Interactive client-component references inside RSC remain blocked until `react-on-rails-rsc` supports Rspack's plugin API.

## Not Yet Validated

The full TanStack Router + Query + Table surface is Phase 4 work. The current repo is Phase 1 bootstrap plus the RSC/Rspack compatibility spike outcome.
