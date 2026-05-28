# React on Rails Starter TanStack

Flagship React on Rails + TanStack starter. The launch stack is Rspack-only and uses the current React on Rails Pro RC with Shakapacker's latest visible public Rspack artifacts:

- `react_on_rails` / `react_on_rails_pro` `16.7.0.rc.3`
- `react-on-rails-pro` / `react-on-rails-pro-node-renderer` `16.7.0-rc.3`
- `shakapacker` / `shakapacker-rspack` `10.1.0`
- Rails 8.1, React 19, TypeScript, pnpm, Rspack, Tailwind v4, shadcn/ui primitives, React Server Components

Shakapacker stays on `10.1.0` for this release because public `11.1.0` artifacts are not visible in the registries consumed by the starter. Treat Rspack as the supported bundler; Webpack is not part of the tested starter matrix unless a task explicitly asks to evaluate it.

## Quick Start

```sh
git clone git@github.com:shakacode/react-on-rails-starter-tanstack.git
cd react-on-rails-starter-tanstack
bin/setup
bin/dev
open http://localhost:3000
```

Run `bin/doctor` first when setup fails; it checks Ruby, Node, pnpm, Bun, and Postgres with actionable fix messages. The seed user is `demo@example.com / password`.

## Development

```sh
bundle exec rspec
pnpm run test:router-shim
pnpm test:playwright
pnpm run test:dev-modes
pnpm run test:hmr
bin/test
```

`bin/dev` starts Rails, Rspack, SolidQueue, the Pro Node renderer, and the RSC bundle watcher through `Procfile.dev`. This starter keeps Rspack development on live reload by default; run `SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard` or `pnpm run test:hmr` when you want to test HMR-specific behavior.

Use these alternate modes to smoke-test non-HMR paths:

```sh
bin/dev static --no-open-browser --route=dashboard
bin/dev prod --no-open-browser --route=dashboard
```

Both modes start the Node renderer because the authenticated TanStack dashboard is server-rendered by React on Rails Pro.

The authenticated `/dashboard` route is the TanStack surface:

- TanStack Router runs under a Rails-owned HTML shell and is prerendered by React on Rails Pro's Node renderer.
- TanStack Query loads independent metric cards and Rails JSON API data with CSRF-aware helpers.
- TanStack Table drives the projects list with server-backed filter, sort, pagination, and URL state.
- Project index/create/show/edit and nested settings routes stay inside the client-side dashboard experience, including direct full-page loads to `/projects...`.
- Classic Rails CRUD remains available at `/classic/projects` to demonstrate hybrid Rails UI coexistence.

TanStack Router and Query devtools are bundled but disabled by default in development. Enable them only when needed:

```js
localStorage.setItem("tanstack-devtools", "1")
```

## Current Status

This repo is the public template seed. Phase 2 adds Rails 8 authentication, signup, email verification, resend throttles, development mail previews, and a verified-email dashboard gate. Phase 3 adds Projects CRUD, scoped authorization, JSON API endpoints, metrics, factories, and demo seeds.

Phase 4 implements the TanStack Router/Query/Table authenticated surface described in [shakacode/react_on_rails#3364](https://github.com/shakacode/react_on_rails/pull/3364).

See [SPIKE.md](SPIKE.md) for the current AMBER RSC/Rspack compatibility note: Rspack builds and server-only RSC bundling are green, but interactive RSC client references are blocked until Rspack emits the React Server Components client/server manifests expected by the React on Rails RSC path.

## Docs

- [Architecture](docs/01-architecture.md)
- [React on Rails + TanStack vs Inertia](docs/02-vs-inertia.md)
- [Customizing](docs/03-customizing.md)
- [Deploying](docs/04-deploying.md)
- [Troubleshooting](docs/05-troubleshooting.md)
- [Tested Modes](docs/06-tested-modes.md)
- [Control Plane Handoff](docs/07-control-plane-handoff.md)
- [Upgrading](UPGRADING.md)

## License

MIT
