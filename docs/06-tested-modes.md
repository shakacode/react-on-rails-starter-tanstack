# Tested Modes

This starter keeps the TanStack dashboard on Rspack, the React on Rails Pro RC,
and the latest verified Shakapacker/Rspack release line. The tables below track the local and CI coverage
expected before changing build, rendering, or routing behavior.

## Entrypoints

| Tier | Command | Coverage | When to use |
| --- | --- | --- | --- |
| Smoke | `bin/test smoke` | React on Rails doctor, TypeScript, router shim, RSpec, and the Playwright health smoke. | Fast local pre-push check. |
| CI core | `bin/ci` or `bin/test ci` | RuboCop, peer checks, Ruby/JS security audits, smoke tier. | Default CI core job and local confidence before opening a PR. |
| Full | `bin/test all` | Quality checks, smoke tier, and the full Playwright browser suite. | Browser-facing app changes and dashboard data-flow changes. |
| Release-impacting | `bin/test release` | Full tier plus security checks, dev-mode, HMR, production precompile, and Rspack/RSC repro checks. | Build, rendering, routing, Rspack, React on Rails Pro, or Node renderer changes. This is intentionally slower than the default tier. |

## Coverage Matrix

| Mode | Command | Coverage | Expected result |
| --- | --- | --- | --- |
| React on Rails doctor | `bin/test doctor` or `bundle exec rails react_on_rails:doctor` | CI core | Verifies the Rails/Rspack/React on Rails configuration, including Pro SSR paths. |
| Quality checks | `bin/test quality` | CI core | Runs RuboCop and package peer-dependency validation. |
| Security checks | `bin/test security` | CI core | Runs bundler-audit, Brakeman, and pnpm audit. |
| Router shim | `bin/test router-shim` or `pnpm run test:router-shim` | CI core | Verifies the TanStack Router compatibility shim maps Pro's expected `router.__store.setState` API onto the current `router.stores` shape. |
| Rails specs | `bin/test rspec` or `bundle exec rspec` | CI core | Runs model, request, and system specs, including authenticated project and verification flows. |
| Playwright smoke | `bin/test playwright-smoke` | CI core | Boots Rails in `RAILS_ENV=test` and checks the `/up` browser smoke. This is not a substitute for the dashboard suite. |
| Playwright full | `bin/test playwright` or `pnpm test:playwright` | CI | Builds test packs with Rspack, boots Rails in `RAILS_ENV=test`, and exercises dashboard hydration, direct `/projects...` loads, client navigation, profile update, and project create/edit flows. |
| Live reload dev | `bin/test dev-modes` or `node script/dev-mode-smoke.mjs dev` | CI | Boots Rails, Rspack dev server, SolidQueue, Node renderer, server bundle watcher, and RSC bundle watcher. The default config uses `hmr: false` and `live_reload: true`. |
| Static assets dev | `bin/test dev-modes` or `node script/dev-mode-smoke.mjs static` | CI | Runs `bin/dev static`, starts Rails, Rspack watch mode, SolidQueue, and the Node renderer, then logs in and checks `/dashboard`, client navigation, and direct `/projects/new`. |
| Production-assets dev | `bin/test dev-modes` or `node script/dev-mode-smoke.mjs prod` | CI | Runs `bin/dev prod`, precompiles optimized Rspack bundles, starts Rails, SolidQueue, and the Node renderer, then checks the same authenticated TanStack routes. |
| HMR dev | `bin/test hmr` or `SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard` | CI | Boots the same default dev stack with `hmr: true` and `live_reload: false`, then verifies the authenticated TanStack routes hydrate and navigate. This smoke does not assert state-preserving hot updates. |
| Rspack/RSC client boundary repro | `bin/test rsc-repro` or `pnpm run repro:rspack-rsc` | CI status, upstream repro | Builds Rspack bundles and verifies the generated `HelloServer` RSC example still contains a `'use client'` boundary. Today this reports `blocked` because Rspack does not emit the RSC client/server manifests used by interactive client references. Set `REQUIRE_RSC_MANIFESTS=true` only when intentionally checking whether the upstream blocker has been fixed. |
| Production precompile | `bin/test release` or `RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD=dummy bin/rails assets:precompile` | Release-impacting checks | Confirms production Rspack client, server, and RSC bundles compile. The expected Pro license warning is non-fatal. |

## Notes

- Use `demo@example.com / password` for authenticated browser checks.
- `bin/dev`, `bin/dev static`, and `bin/dev prod` must start `client/node-renderer.js`; otherwise prerendered TanStack routes fail with a Node renderer connection error.
- The CI `core` job calls `bin/ci`, which runs quality, security, and smoke checks.
  Full Playwright, dev modes, HMR, and Rspack/RSC repro checks run as separate
  CI jobs so their failures are easier to read.
- The Rspack/RSC manifest gap is tracked upstream in [shakacode/react_on_rails#1828](https://github.com/shakacode/react_on_rails/issues/1828).
- The React on Rails Pro TanStack Router private-store compatibility issue is tracked in [shakacode/react_on_rails#3375](https://github.com/shakacode/react_on_rails/issues/3375).
