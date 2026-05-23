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

Fix: restart `bin/dev` after changing `config/shakapacker.yml`. This starter uses Rspack live reload with HMR disabled because the current RC stack can omit the injected hot-dev-server chunk from React on Rails auto component script output.

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
