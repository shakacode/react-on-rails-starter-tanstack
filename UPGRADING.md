# Upgrading

This repository is a template. After you fork or clone it, your product code is
your application, not an extension point that this upstream repo controls. Treat
new template releases as reviewed examples to diff and selectively adopt.

## Ownership Contract

You own your app:

- `app/` after your product starts diverging from the starter.
- `db/migrate/` for your application migrations.
- Your custom Rails routes and controller behavior.
- Your custom models, policies, jobs, mailers, and React screens.
- Any product-specific copy, design system choices, seed data, and deployment
  secrets.

Pull from upstream as the starter evolves:

- `bin/` scripts and local development workflows.
- `config/initializers/`, with review for app-specific behavior.
- `package.json`, `pnpm-lock.yaml`, `Gemfile`, and `Gemfile.lock` defaults.
- `.github/workflows/` CI, deploy, and review-app patterns.
- `config/shakapacker.yml` and `config/rspack/` build defaults.
- `docs/` templates and operational notes that still apply to your app.

Review `app/`, `config/routes.rb`, and database changes manually. Those files
often contain examples worth copying, but they are also where your app is most
likely to diverge.

## How To Upgrade

1. Add this starter as an upstream remote if your fork does not already have
   one:

   ```sh
   git remote add starter git@github.com:shakacode/react-on-rails-starter-tanstack.git
   git fetch starter --tags
   ```

2. Compare your current baseline with the latest template tag:

   ```sh
   git diff <your-current-template-tag>..2026.Q2 -- bin config .github docs package.json pnpm-lock.yaml Gemfile Gemfile.lock
   ```

3. Apply the changes that still fit your app. Prefer small commits grouped by
   concern: dependencies, build config, CI, docs, and app examples.

4. For application files, inspect the diff instead of applying it wholesale:

   ```sh
   git diff <your-current-template-tag>..2026.Q2 -- app db config/routes.rb
   ```

5. Run the checks that match the surface you adopted. For a broad upgrade, use:

   ```sh
   bin/test release
   ```

The planned `bin/upgrade-check` helper is post-launch tooling and is not part of
the 2026-06-03 launch contract. Until then, use tag diffs and focused commits.

## Stability Expectations

This starter is pre-1.0. Template-level changes ship per quarter; breaking
changes require a major bump. Your downstream app code is yours; we never break
that.

The starter can change examples, recommended dependencies, CI workflows,
Rspack/Shakapacker defaults, docs, and development scripts. Those changes are
template changes. They are not migrations that run against your product code.

When an upstream change affects application examples, copy the idea only if it
still fits your product. Your app should not need to stay file-for-file
identical to this template.

## What's Tagged For The 2026-06-03 Launch

Use `2026.Q2` as the first public launch baseline. That tag represents the
starter state for the 2026-06-03 Hacker News launch: Rails 8, React on Rails
Pro, Rspack, Shakapacker, TanStack Router/Query/Table, the authenticated
TanStack dashboard, the classic Rails CRUD coexistence path, and the current
`/hello_server` RSC reference route.

For new apps, start from `2026.Q2` rather than an arbitrary commit on `main`.
For existing forks, diff from the tag you originally adopted to `2026.Q2`, then
pull only the template pieces that improve your app.
