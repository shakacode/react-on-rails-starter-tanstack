# React on Rails Starter TanStack

Rails 8 starter for teams that want Rails to own authentication, HTML
entrypoints, persistence, and deployment while React on Rails Pro renders a
TanStack Router, Query, and Table app on Rspack.

**Live demo:** [rails-1w9hq69n5eeyr.cpln.app](https://rails-1w9hq69n5eeyr.cpln.app/)
with `demo@example.com` / `password`.

![Rendering mode drawer](docs/images/rendering-mode-drawer.png)

## What It Shows

- Rspack is the Shakapacker bundler. Use `config/shakapacker.yml` and
  `config/rspack/` as the source of truth.
- `/` is the Rails landing page today.
- `/dashboard`, `/settings...`, and `/projects...` are Rails full-page routes
  that render the React on Rails Pro + TanStack dashboard shell.
- TanStack Query reads and mutates Rails JSON APIs, and TanStack Table drives
  the projects list with server-side filtering, sorting, pagination, and URL
  state.
- `/classic/projects` remains a classic Rails CRUD surface to show a hybrid
  Rails UI coexisting with the TanStack surface.
- The dashboard includes a rendering-mode drawer and links to sibling React on
  Rails Pro demo apps.
- `/hello_server` demonstrates streaming React Server Components. Interactive
  RSC client references remain limited by the documented Rspack manifest gap;
  see [SPIKE.md](SPIKE.md).

Current pinned line: React on Rails / Pro `16.7.0.rc.3`, Shakapacker /
Shakapacker Rspack `10.1.0`, React `19.0.6`, Rails `8.1.x`, TypeScript, and
pnpm.

## Setup

```sh
bin/setup
bin/dev
SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard
bin/dev static --no-open-browser --route=dashboard
bin/dev prod --no-open-browser --route=dashboard
```

`bin/dev` starts Rails, Rspack, Solid Queue, the React on Rails Pro Node
renderer, and the RSC bundle watcher. Development defaults to live reload; use
the HMR command only when testing HMR behavior.

## Checks

```sh
bundle exec rspec
pnpm run test:router-shim
pnpm test:playwright
pnpm run test:dev-modes
pnpm run test:hmr
pnpm run repro:rspack-rsc
bin/test
```

Release-impacting changes may also need:

```sh
bundle exec rails react_on_rails:doctor
pnpm peers check
bundle exec rubocop
pnpm audit --audit-level moderate
RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD=dummy bin/rails assets:precompile
```

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
