# Architecture

This starter begins from `create-react-on-rails-app --rsc --rspack` and is launched on the React on Rails Pro `17.0.0-rc.0` RC stack with Shakapacker `10.1.0`.

Shakapacker remains on `10.1.0` because public `11.1.0` artifacts are not visible in the registries this starter consumes. Rspack remains the checked-in local default, while Webpack is the deploy/RSC bridge until upstream Rspack RSC manifest support lands.

- Rails owns the public routes, auth routes, API routes, and the HTML shells.
- Shakapacker uses Rspack for the default local client, server, and RSC bundles.
- The Webpack bridge uses `SHAKAPACKER_ASSETS_BUNDLER=webpack` and
  `config/webpack/` to emit the RSC client-reference manifests required by the
  deployed RSC demo.
- React on Rails Pro provides the Node renderer, TanStack SSR integration, and RSC streaming path.
- SolidQueue is installed by Rails and runs as a separate worker process in development and production.

## Authentication

Rails 8 authentication provides sessions, password reset, signup, and email verification. The verification lifecycle stores only a SHA-256 token digest, expires links after 24 hours, clears the digest after successful verification, and rotates the DB-backed session on success.

Rack::Attack limits verification email sends per IP and per email address. Development mail is available through `/letter_opener`.

## Projects

Projects are scoped to the verified current user. The default project URLs (`/projects`, `/projects/new`, `/projects/:id`, and `/projects/:id/edit`) render the TanStack dashboard shell, so refreshes and deep links stay in the React on Rails + TanStack experience. The classic Rails CRUD controller remains available under `/classic/projects` as the coexistence/reference path for server-side validations, inline errors, scoped lookup, and archive-on-destroy.

The JSON API under `/api/projects` supports status filtering, sorting, pagination, scoped show, create, update, and independent metrics for the dashboard cards.

## Authenticated Dashboard

`/dashboard` is a Rails route that renders `DashboardApp` through `react_component` with React on Rails Pro prerendering enabled. The Rails view keeps the HTML shell and no-JavaScript fallback, while TanStack Router owns the authenticated client-side surface after hydration.

The dashboard uses:

- TanStack Router for `/dashboard`, `/projects`, `/settings/*`, `/projects/new`, `/projects/:id`, and `/projects/:id/edit` client routes.
- TanStack Query for Rails JSON API reads and mutations.
- TanStack Table for server-backed project filtering, sorting, pagination, and URL state.
- A CSRF-aware `apiFetch` helper for mutating JSON requests back to Rails.

The Node renderer receives Fetch API globals from `client/node-renderer.js` so TanStack Router can build and serialize its SSR state. ExecJS fallback rendering is disabled because TanStack SSR is async.

## RSC Showcase

`/rsc-showcase` is the public RSC + TanStack route. Rails serves the shell
through `RscShowcaseController#show`, and a bare TanStack Router loader in
`RscShowcaseApp` fetches a React on Rails Pro RSC payload from the Rails
`rsc_payload_route`. The route decodes the Flight stream in the browser and
composes the server-streamed RSC tree beside an ordinary client island.

This is intentionally not TanStack Start. The route keeps this starter on
Rails, React on Rails Pro, and bare `@tanstack/react-router`; it does not add
Vite, file-based routing, Hotwire, or Stimulus.

## Rspack Notes

Rspack is the active bundler in `config/shakapacker.yml`. Development disables client lazy compilation at the config top level and at `experiments.lazyCompilation`, uses live reload by default for this RC stack, and gates TanStack devtools behind `localStorage["tanstack-devtools"] = "1"` to avoid dev-server overlay requests from optional chunks. Explicit HMR mode enables React Fast Refresh through Shakapacker's Rspack wiring, while static and production-assets dev modes remain free of Rspack dev-server clients.

The public React Server Components path still carries the Phase 0 AMBER note on
Rspack. The starter keeps Rspack client, server, and server-only RSC bundles
green, but interactive RSC client references remain blocked because the Rspack
build does not emit the React client/server manifests expected by the React on
Rails RSC client-reference path. The Webpack bridge resolves that bundler gap
for deploy and is documented in
[RSC Webpack Bundler Spike](09-rsc-webpack-bundler-spike.md).
