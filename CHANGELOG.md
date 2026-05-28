# Changelog

All notable changes to this starter. We follow Keep a Changelog. Pre-1.0
releases are tagged by quarter (`2026.Q2`, etc.).

## Unreleased

## 2026-06-03 - Public launch

- Initial public release for the `2026.Q2` starter tag.
- Ships Rails 8.1, React 19, React on Rails Pro, Rspack, Shakapacker, pnpm,
  TanStack Router, TanStack Query, and TanStack Table.
- Adds shadcn/ui and Tailwind v4 starter defaults through
  [#62](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/62).
- Includes signup, email verification, password reset, settings, a live demo at
  `starter.reactonrails.com`, and the `/hello_server` RSC reference route.

## 2026-05-27 - Launch hardening

- Updated the stack to React on Rails / Pro `16.7.0.rc.3` and the verified
  Shakapacker `10.1.0` release line in
  [#43](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/43).
- Added `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, and reference-pattern markers
  so agents and maintainers can follow the same Rails, TanStack, Rspack, and
  testing conventions
  ([#43](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/43),
  [#59](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/59)).
- Hardened CI/test tiers, Playwright auth helpers, production SSL assumptions,
  password/session specs, and API status filtering in
  [#43](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/43).
- Reskinned static Rails error pages in
  [#57](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/57).

## 2026-05-27 - shadcn/ui and Tailwind v4 scaffold

- Added Tailwind v4, shadcn/ui component defaults, `components.json`, and shared
  UI primitives in
  [#62](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/62).
- Wired the Tailwind pack stylesheet into the Rails layout while keeping Rspack
  as the active Shakapacker bundler.
- Cleaned static Rspack output before static dev mode so stale dev-server
  clients do not leak into watched assets.

## 2026-05-24 - Phase 0: Rspack/RSC spike resolution

- Documented the Phase 0 AMBER result: proceed on Rspack, with the interactive
  RSC client-reference manifest path tracked as an upstream limitation in
  [SPIKE.md](SPIKE.md).
- Added `docs/06-tested-modes.md`, `script/dev-mode-smoke.mjs`,
  `script/test-tanstack-router-store-shim.mjs`, and
  `script/rspack-rsc-client-boundary-repro.mjs` in
  [#9](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/9).
- Confirmed the TanStack dashboard is not blocked by the Phase 0 Rspack/RSC
  limitation; the AMBER status now applies only to interactive RSC client
  references on Rspack.

## 2026-05-23 - Phase 4: TanStack surface

- Added the authenticated `DashboardApp` shell with TanStack Router routes for
  `/dashboard`, `/projects...`, and `/settings...`.
- Added TanStack Query data flows against Rails JSON endpoints with CSRF-aware
  `apiFetch`, shared query defaults, mutations, invalidation, and explicit
  loading/error states.
- Added TanStack Table project filtering, sorting, and pagination with URL
  search state and Rails-owned server-side persistence.
- Added Playwright coverage for dashboard hydration, route navigation, profile
  updates, and project create/edit workflows.

## 2026-05-23 - Phase 3: Projects CRUD and JSON API

- Added the `Project` model, migrations, factories, validations, demo seeds, and
  request/system coverage in
  [#5](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/5).
- Added classic Rails project CRUD under `/classic/projects` so a Rails UI can
  coexist with the TanStack dashboard.
- Added `Api::ProjectsController` with per-user scoping, JSON responses,
  validation errors, sorting, filtering, pagination, and metrics.

## 2026-05-23 - Phase 2: Auth and email verification

- Added Rails session authentication, signup, password reset, email
  verification, DB-backed sessions, and verified-email dashboard gating in
  [#4](https://github.com/shakacode/react-on-rails-starter-tanstack/pull/4).
- Added welcome and email verification mailers, local previews, and resend
  throttles.
- Added request, model, and system coverage for signup, verification, password
  reset, and authenticated routing.

## 2026-05-22 - Phase 1: Bootstrap

- Bootstrapped the Rails 8.1 PostgreSQL app with React 19, TypeScript, pnpm,
  RSpec, Playwright, and initial CI.
- Added `react_on_rails`, `react_on_rails_pro`, Rspack, Shakapacker, and React
  Server Components scaffolding.
- Pinned the initial React on Rails release candidates and completed the Phase 1
  bootstrap baseline.
