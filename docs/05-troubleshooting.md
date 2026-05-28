# Troubleshooting

## `bin/doctor` Fails

Run `bin/doctor` first. Each failed check prints the problem, likely cause, and a concrete fix command.

## Postgres Is Not Running

Symptom: `pg_isready failed` or `could not connect to server`.

Fix:

```sh
brew services start postgresql@18
bin/doctor
```

## Port 3000 Is Already In Use

Symptom: `Rails port 3000 is already in use`.

Fix:

```sh
PORT=3001 bin/dev
```

For a persistent worktree-specific override:

```sh
cp .env.example .env
# edit PORT=3001
```

## Node Renderer Port Is Already In Use

Symptom: `Node renderer port 3800 is already in use`.

Fix:

```sh
RENDERER_PORT=3801 bin/dev
```

## pnpm Blocks Native Builds

Symptom: `ERR_PNPM_IGNORED_BUILDS`.

Fix:

```sh
pnpm approve-builds --all
pnpm install
```

This starter already approves the native build scripts currently needed by Rspack and SWC in `pnpm-workspace.yaml`.

## Missing Demo Data

Symptom: the dashboard boots but the projects table or metric cards have no demo records.

Fix:

```sh
bin/rails db:seed
```

The seed user is `demo@example.com / password`. Production seeds are a no-op.

## TanStack Devtools Do Not Appear

Symptom: TanStack Router or Query devtools are not visible in development.

Fix: enable them explicitly in the browser console and reload.

```js
localStorage.setItem("tanstack-devtools", "1")
```

The devtools are off by default because optional devtools chunks can trigger noisy dev-server overlay requests in the current Rspack RC stack.

## Dashboard Stays In Loading State

Symptom: the SSR dashboard shell renders, but metric cards and the projects table keep showing loading placeholders in development.

Fix: restart `bin/dev` after changing `config/shakapacker.yml`. This starter defaults to Rspack live reload for deterministic SSR smoke tests. To exercise HMR and React Fast Refresh without editing configuration, run `SHAKAPACKER_DEV_SERVER_HMR=true bin/dev --no-open-browser --route=dashboard` or `pnpm run test:hmr`. If the dashboard still hangs, check the browser network panel for missing hot-update or hot-dev-server chunks.

## Browser Reports Content Security Policy Violations

Symptom: the browser console reports `Content Security Policy` violations after changing packs, inline scripts, RSC streaming, or dev-server wiring.

Fix: keep scripts nonce-backed through Rails and React on Rails helpers. The checked-in policy allows same-origin production assets and adds development-only localhost HTTP/WebSocket sources for the Rspack dev server. Do not add the React on Rails Pro Node renderer URL to browser CSP; the browser talks to Rails, while Rails talks to the renderer server-side.

Run the focused browser regression after CSP changes:

```sh
pnpm exec playwright test test/playwright/csp.spec.ts
```

## Dashboard 500s In Static Or Production-Assets Mode

Symptom: `/dashboard` raises a React on Rails server rendering error with `Connection refused - connect(2) for 127.0.0.1:3800`.

Fix: ensure the mode's Procfile starts `client/node-renderer.js` on the same `RENDERER_PORT` used by `config/initializers/react_on_rails_pro.rb`. The checked-in static and production-assets Procfiles include this renderer process.

The CI smoke for this is:

```sh
pnpm run test:dev-modes
```

## Verification Email Does Not Arrive In Development

Symptom: signup succeeds, but no external email arrives.

Fix: open the local mail preview.

```sh
open http://localhost:3000/letter_opener
```

Development uses `letter_opener_web`, so verification and welcome emails stay local.

## Verification Resend Returns 429

Symptom: `POST /email_verifications` returns `Too many requests`.

Fix: wait for the throttle window to clear. The starter limits verification sends to 5 per IP per hour and 3 per email per hour.

## RAILS_MASTER_KEY Is Missing In Production

Symptom: production boot fails while reading encrypted credentials.

Fix: set `RAILS_MASTER_KEY` in the host environment. Do not commit `config/master.key`.
