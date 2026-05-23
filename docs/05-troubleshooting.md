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

Symptom: the app boots but future dashboard work has no demo records.

Fix:

```sh
bin/rails db:seed
```

## RAILS_MASTER_KEY Is Missing In Production

Symptom: production boot fails while reading encrypted credentials.

Fix: set `RAILS_MASTER_KEY` in the host environment. Do not commit `config/master.key`.
