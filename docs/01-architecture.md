# Architecture

This starter began from `create-react-on-rails-app --rsc --rspack` and is currently pinned to React on Rails `16.7.0-rc.3`.

- Rails owns the public routes, auth routes, API routes, and the HTML shells.
- Shakapacker uses Rspack for client, server, and RSC bundles.
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

## Rspack Notes

Rspack is the active bundler in `config/shakapacker.yml`. Development keeps `experiments.lazyCompilation = false`, uses live reload instead of HMR for this RC stack, omits Rspack React Refresh, and gates TanStack devtools behind `localStorage["tanstack-devtools"] = "1"` to avoid dev-server overlay requests from optional chunks.

The public React Server Components path still carries the Phase 0 AMBER note: `react-on-rails-rsc`'s client-reference plugin depends on Webpack APIs that Rspack does not currently expose. The starter keeps Rspack builds green and skips that plugin only for Rspack builds.
