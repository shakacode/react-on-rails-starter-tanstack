# Tested Modes

This starter keeps the TanStack dashboard on Rspack and the React on Rails / Shakapacker RC releases. The table below tracks the local and CI coverage expected before changing build, rendering, or routing behavior.

| Mode | Command | Coverage | Expected result |
| --- | --- | --- | --- |
| Test assets | `pnpm test:playwright` | CI | Builds test packs with Rspack, boots Rails in `RAILS_ENV=test`, and exercises dashboard hydration, direct `/projects...` loads, client navigation, profile update, and project create/edit flows. |
| Router shim | `pnpm run test:router-shim` | CI | Verifies the TanStack Router compatibility shim maps Pro's expected `router.__store.setState` API onto the current `router.stores` shape. |
| Live reload dev | `bin/dev --no-open-browser --route=dashboard` | Manual | Boots Rails, Rspack dev server, SolidQueue, Node renderer, server bundle watcher, and RSC bundle watcher. The default config uses `hmr: false` and `live_reload: true`. |
| HMR dev | Set `dev_server.hmr: true` and `dev_server.live_reload: false`, then run `bin/dev --no-open-browser --route=dashboard` | Manual | HMR updates the hydrated dashboard without a full browser reload. Keep this as an opt-in check because the starter's deterministic default is live reload. |
| Static assets dev | `pnpm run test:dev-modes` or `node script/dev-mode-smoke.mjs static` | CI | Runs `bin/dev static`, starts Rails, Rspack watch mode, SolidQueue, and the Node renderer, then logs in and checks `/dashboard`, client navigation, and direct `/projects/new`. |
| Production-assets dev | `pnpm run test:dev-modes` or `node script/dev-mode-smoke.mjs prod` | CI | Runs `bin/dev prod`, precompiles optimized Rspack bundles, starts Rails, SolidQueue, and the Node renderer, then checks the same authenticated TanStack routes. |
| Production precompile | `RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD=dummy bin/rails assets:precompile` | Manual before release-impacting changes | Confirms production Rspack client, server, and RSC bundles compile. The expected Pro license warning is non-fatal. |
| Rspack/RSC client boundary repro | `pnpm run repro:rspack-rsc` | Manual, upstream repro | Builds Rspack bundles and verifies the generated `HelloServer` RSC example still contains a `'use client'` boundary. Today this reports `blocked` because Rspack does not emit the RSC client/server manifests used by interactive client references. |

## Notes

- Use `demo@example.com / password` for authenticated browser checks.
- `bin/dev static` and `bin/dev prod` must start `client/node-renderer.js`; otherwise prerendered TanStack routes fail with a Node renderer connection error.
- The Rspack/RSC manifest gap is tracked upstream in [shakacode/react_on_rails#1828](https://github.com/shakacode/react_on_rails/issues/1828).
- The React on Rails Pro TanStack Router private-store compatibility issue is tracked in [shakacode/react_on_rails#3375](https://github.com/shakacode/react_on_rails/issues/3375).
