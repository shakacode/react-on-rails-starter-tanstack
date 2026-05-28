# AGENTS.md

Working notes for AI agents and maintainers working in this repository.

This file indexes the canonical patterns that are already present in the
starter. It should not be read as a promise that every item from the original
starter spec is complete. When this file, docs, and code disagree, inspect the
code first and then update the docs or this file in the same change.

## 1. Current App Shape

- This is a Rails 8 starter using React on Rails Pro, TanStack Router, TanStack
  Query, TanStack Table, Rspack, pnpm, TypeScript, React 19, Tailwind v4, and
  shadcn/ui primitives.
- Rspack is the active Shakapacker bundler. Use `config/shakapacker.yml` and
  `config/rspack/` as the source of truth for bundling behavior.
- `/dashboard`, `/settings...`, and `/projects...` are Rails routes that render
  the TanStack dashboard shell through `DashboardController#show`.
- `/classic/projects` remains a classic Rails CRUD surface to demonstrate a
  hybrid Rails UI coexisting with the TanStack surface.
- `/hello_server` demonstrates streaming RSC. The current Rspack/RSC client
  reference manifest limitation is intentional and documented in `SPIKE.md`.
- The root path `/` is the Rails landing page today. Do not describe it as the
  final RSC landing unless the implementation changes.

## 2. Rails Controller Patterns

Canonical examples:

- `app/controllers/registrations_controller.rb` for signup flow with session
  creation, email verification token generation, and async mail delivery.
- `app/controllers/projects_controller.rb` for classic Rails CRUD scoped to
  `Current.user`.
- `app/controllers/api/projects_controller.rb` for JSON endpoints scoped to
  `Current.user`, server-side filtering/sorting/pagination, JSON validation
  errors, and `404` handling.
- `app/controllers/dashboard_controller.rb` for passing Rails-owned paths,
  current-user props, initial location, and API links into the TanStack shell.

Reference marker IDs: `signup-controller`, `controller`,
`json-api-controller`, `dashboard-props-controller`.

Rules:

- In authenticated controllers, inherit from `AuthenticatedController` unless
  the action must allow guests.
- Scope user-owned records through `Current.user`. Do not fetch project records
  globally and then authorize in memory.
- Use Rails strong params with `params.expect(...)`, matching the existing
  controllers.
- For full-page authenticated TanStack routes, add Rails `get` routes to
  `dashboard#show` and add the matching client route in `DashboardApp.tsx`.
- Keep classic Rails CRUD routes under the `classic` scope unless the goal is
  explicitly to change the primary TanStack UX.

## 3. Authentication And Verification

Canonical examples:

- `app/controllers/concerns/authentication.rb` for Rails session auth.
- `app/controllers/concerns/verified_authentication.rb` for verified-email
  gating.
- `app/controllers/email_verifications_controller.rb` for verification and
  resend behavior.
- `app/controllers/passwords_controller.rb` for password reset.
- `app/controllers/settings_controller.rb` for profile updates from the
  TanStack dashboard.

Reference marker IDs: `session-authentication`, `verified-authentication`,
`email-verification-controller`, `password-reset-controller`,
`settings-profile-controller`.

Rules:

- Keep dashboard and project data behind verified authentication.
- Preserve the demo user contract from the README: `demo@example.com` /
  `password`.
- When a profile email change makes the user unverified, test both the server
  redirect/gate and the client-facing dashboard behavior.

## 4. Rails Form Patterns

Canonical examples:

- `app/views/sessions/new.html.erb` for an auth form with flash messages,
  autocomplete, and semantic labels.
- `app/views/projects/_form.html.erb` for model-backed classic Rails forms with
  inline validation messages and `aria-describedby`.

Reference marker ID: `form`.

Rules:

- Use `form_with` and Rails validation errors instead of duplicating validation
  logic in views.
- Keep form error summaries in an `aria-live` region when errors appear after a
  submit.
- Set labels, autocomplete, length limits, and required attributes where the
  model or browser can enforce them.
- Keep the existing `auth-*` CSS conventions for classic Rails auth/project
  pages unless a change intentionally replaces that design system.

## 5. Rails JSON API And TanStack Query

Canonical examples:

- `app/controllers/api/projects_controller.rb` for project API responses.
- `app/javascript/lib/apiFetch.ts` for CSRF-aware JSON requests.
- `app/javascript/lib/queryClient.ts` for shared TanStack Query defaults.
- `app/javascript/src/Dashboard/ror_components/DashboardApp.tsx` for query keys,
  mutations, invalidation, loading states, and error states.

Reference marker IDs: `json-api-controller`, `csrf-json-fetch`,
`query-client-defaults`.

Rules:

- Use `apiFetch` for browser requests back to Rails so CSRF headers and
  same-origin credentials stay consistent.
- Keep API responses explicit. Avoid returning Active Record objects directly.
- Include focused request specs for API behavior and Playwright coverage for
  the user-facing workflow when changing dashboard data flows.
- Keep URL state and server-backed table state in sync for filter, sort, and
  pagination behavior.

## 6. Mailer Patterns

Canonical examples:

- `app/mailers/email_verification_mailer.rb` for verification email delivery.
- `app/mailers/welcome_mailer.rb` for the signup welcome email.
- `test/mailers/previews/*` for local mail previews.

Reference marker IDs: `mailer`, `mailer-preview`.

Rules:

- Use `deliver_later` from request/controller flows unless a test explicitly
  verifies synchronous delivery.
- Add or update previews when adding user-facing emails.
- Include request/system coverage for flows where the email token gates access.
- Keep mail enqueue failures observable without breaking the successful signup
  path, matching `RegistrationsController#deliver_signup_emails`.

## 7. TanStack Table Pattern

Canonical example:

- `ProjectsTable` in `app/javascript/src/Dashboard/ror_components/DashboardApp.tsx`.

Reference marker ID: `tanstack-table`.

Rules:

- Let Rails own persistence, filtering, sorting, and pagination. Let TanStack
  Table own table rendering and interaction state.
- Store table state in URL search params when users should be able to reload,
  share, or navigate back to a filtered view.
- Keep query keys stable and include every server-side state input in the key.
- Include explicit loading, error, empty, and success UI states.
- Prefer router links over raw anchors for navigation inside the TanStack
  dashboard.

## 8. TanStack Router And React On Rails Pro SSR

Canonical example:

- `DashboardApp` in `app/javascript/src/Dashboard/ror_components/DashboardApp.tsx`.

Reference marker IDs: `dashboard-props-controller`, `tanstack-route`.

Rules:

- The Rails view `app/views/dashboard/show.html.erb` renders `DashboardApp`
  with `react_component(..., prerender: !Rails.env.test?)`.
- Keep `railsContext` required for the dashboard render function. The server
  branch uses `serverRenderTanStackAppAsync`; the client branch hydrates with
  the dehydrated router state.
- Preserve the initial Rails path/search handoff from `DashboardController#show`
  so direct full-page loads to `/projects...` land in TanStack routes.
- Use `app/javascript/lib/tanstackRouterStoreShim.ts` only as compatibility
  glue for the current Pro/TanStack Router API mismatch. Remove it only after
  the upstream issue is fixed and tests prove it is unnecessary.

## 9. Rspack, Dev Modes, And RSC

Canonical examples:

- `config/shakapacker.yml`
- `config/rspack/clientWebpackConfig.js`
- `config/rspack/serverWebpackConfig.js`
- `config/rspack/rscWebpackConfig.js`
- `config/rspack/development.js`
- `Procfile.dev`
- `Procfile.dev-static-assets`
- `Procfile.dev-prod-assets`
- `script/dev-mode-smoke.mjs`
- `script/rspack-rsc-client-boundary-repro.mjs`

Reference marker IDs: `shakapacker-rspack-config`,
`rspack-client-config`, `rspack-server-config`, `rspack-rsc-config`,
`rspack-dev-config`, `rspack-live-reload-procfile`,
`rspack-static-assets-procfile`, `rspack-production-assets-procfile`,
`dev-mode-smoke`, `rspack-rsc-repro`.

Rules:

- Keep this starter on Rspack unless the task explicitly asks to evaluate
  Webpack.
- Default development mode is live reload. HMR is tested through
  `SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard`
  and `pnpm run test:hmr`.
- Static dev mode must not inject the Rspack dev-server client into watched
  static assets.
- Production-assets mode must run with optimized assets and the React on Rails
  Pro Node renderer.
- Treat interactive RSC client references as blocked until the Rspack manifest
  gap is fixed upstream. Keep `pnpm run repro:rspack-rsc` available as the
  small repro.

## 10. Tailwind v4 And shadcn/ui

Canonical examples:

- `app/javascript/src/styles/tailwind.css` for Tailwind v4 CSS-first config,
  theme variables, dark-mode variant, and explicit source paths.
- `postcss.config.mjs` and `config/rspack/commonWebpackConfig.js` for the
  PostCSS loader integration in the Rspack pipeline.
- `components.json` for the shadcn/ui CLI setup.
- `app/javascript/src/components/ui/*` for generated shadcn primitives.
- `app/javascript/src/lib/utils.ts` for the shared `cn` helper.
- `app/javascript/src/Dashboard/ror_components/DashboardApp.tsx` for the
  authenticated dashboard surface using shadcn `Card`, `Table`, `Button`,
  `Input`, `Label`, `Dialog`, `Badge`, `Alert`, and `Sonner` primitives.

Rules:

- Keep Tailwind source discovery explicit with
  `@import "tailwindcss" source(none);` and targeted `@source` entries. Broad
  source discovery can watch generated Rspack output and cause rebuild loops.
- Use `bunx shadcn add ...` for new shadcn primitives, then commit the generated
  component file and any package/lockfile updates.
- The authenticated TanStack dashboard is the shadcn/Tailwind reference surface.
  Classic Rails auth, project CRUD, and error views still use the `auth-*`
  Rails CSS conventions unless a later task explicitly migrates them.
- Do not reskin unrelated Rails views as part of scaffold-only work. Treat those
  as separate UI migration changes.
- Re-run `bin/shakapacker`, dashboard Playwright coverage, `bin/test dev-modes`,
  and `bin/test hmr` after changing Tailwind, PostCSS, or shared UI primitives.

## 11. Commands

Setup and daily development:

```sh
bin/setup
bin/dev
SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard
bin/dev static --no-open-browser --route=dashboard
bin/dev prod --no-open-browser --route=dashboard
```

Core checks:

```sh
bundle exec rspec
pnpm run test:router-shim
pnpm test:playwright
pnpm run test:dev-modes
pnpm run test:hmr
pnpm run repro:rspack-rsc
bin/test
```

Useful release-impacting checks:

```sh
bundle exec rails react_on_rails:doctor
pnpm peers check
bundle exec rubocop
pnpm audit --audit-level moderate
RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 REACT_ON_RAILS_STARTER_TANSTACK_DATABASE_PASSWORD=dummy bin/rails assets:precompile
```

Use `docs/06-tested-modes.md` as the detailed source for dev-mode coverage and
known limitations.

## 12. Test Expectations

- Rails model/request/system specs live under `spec/`.
- Playwright browser specs live under `test/playwright/`.
- Router compatibility smoke coverage lives in
  `script/test-tanstack-router-store-shim.mjs`.
- Dev-mode smoke coverage lives in `script/dev-mode-smoke.mjs`.
- Rspack/RSC upstream repro coverage lives in
  `script/rspack-rsc-client-boundary-repro.mjs`.

When changing behavior:

- Add the narrowest test that catches the regression.
- Use request specs for Rails API/controller behavior.
- Use Playwright when the contract is hydration, routing, browser navigation,
  forms, or authenticated dashboard UI.
- Run the relevant dev-mode smoke when changing Rspack, React on Rails Pro
  rendering, TanStack Router hydration, Procfiles, or Node renderer setup.

## 13. Documentation Discipline

- Keep `README.md` concise and current.
- Keep deeper operational detail in `docs/`.
- Update `SPIKE.md` when the Rspack/RSC status changes.
- Do not claim unfinished spec work is complete. In particular, verify before
  claiming a full app-wide shadcn/Tailwind reskin, a full pattern catalog,
  production deployment, Sentry wiring, a dark-mode toggle, or complete RSC
  interactivity.
- If you add a `REFERENCE PATTERN` marker in code, add or update the matching
  entry in this file.
