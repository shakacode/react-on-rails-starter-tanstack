# Deploying

Production needs three process types:

```Procfile
web: bundle exec thrust bundle exec rails server -p ${PORT:-3000}
worker: bin/jobs
renderer: RAILS_ENV=${RAILS_ENV:-production} RENDERER_PORT=${RENDERER_PORT:-3800} node client/node-renderer.js
```

Set these environment variables in your host:

- `RAILS_MASTER_KEY`
- `DATABASE_URL`
- `RENDERER_PORT`
- mail provider credentials
- `SENTRY_DSN` if Sentry is enabled

Before deploying, run:

```sh
RAILS_ENV=production SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
```

Do not run development seeds in production. This template keeps `config/master.key` out of git; generate and store production secrets in your deployment environment.
