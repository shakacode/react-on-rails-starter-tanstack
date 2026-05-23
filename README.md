# React on Rails Starter TanStack

Flagship React on Rails + TanStack starter. It uses the RC releases of React on Rails Pro and Shakapacker with Rspack:

- `react_on_rails` / `react_on_rails_pro` `16.7.0.rc.0`
- `react-on-rails-pro` / `react-on-rails-pro-node-renderer` `16.7.0-rc.0`
- `shakapacker` / `shakapacker-rspack` `10.1.0-rc.1`
- Rails 8.1, React 19, TypeScript, pnpm, Rspack, React Server Components

## Quick Start

```sh
git clone git@github.com:shakacode/react-on-rails-starter-tanstack.git
cd react-on-rails-starter-tanstack
bin/setup
bin/dev
open http://localhost:3000
```

Run `bin/doctor` first when setup fails; it checks Ruby, Node, pnpm, Bun, and Postgres with actionable fix messages.

## Development

```sh
bundle exec rspec
pnpm test:playwright
bin/test
```

`bin/dev` starts Rails, Rspack, SolidQueue, the Pro Node renderer, and the RSC bundle watcher through `Procfile.dev`.

## Current Status

This repo is the public template seed. Phase 2 adds Rails 8 authentication, signup, email verification, resend throttles, development mail previews, and a verified-email dashboard gate.

The next phases add Projects CRUD and the TanStack Router/Query/Table authenticated surface described in [shakacode/react_on_rails#3364](https://github.com/shakacode/react_on_rails/pull/3364).

See [SPIKE.md](SPIKE.md) for the current AMBER RSC/Rspack compatibility note: Rspack builds are green, but interactive RSC client-reference plugin support is blocked upstream.

## Docs

- [Architecture](docs/01-architecture.md)
- [React on Rails + TanStack vs Inertia](docs/02-vs-inertia.md)
- [Customizing](docs/03-customizing.md)
- [Deploying](docs/04-deploying.md)
- [Troubleshooting](docs/05-troubleshooting.md)
- [Upgrading](UPGRADING.md)

## License

MIT
