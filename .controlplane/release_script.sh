#!/bin/sh
set -e

log() {
  echo "[$(date +%Y-%m-%d:%H:%M:%S)]: $1"
}

error_exit() {
  log "$1" 1>&2
  exit 1
}

log "Running release_script.sh per controlplane.yml"

if [ -x ./bin/rails ]; then
  log "Run DB migrations"
  # A new workload's first database connection can be closed while its network
  # path comes up, so give db:prepare a few attempts before failing the release.
  attempt=1
  until SECRET_KEY_BASE="${SECRET_KEY_BASE:-precompile_placeholder}" ./bin/rails db:prepare; do
    [ "$attempt" -lt 5 ] || error_exit "Failed to run DB migrations"
    log "DB migrations failed on attempt $attempt of 5; retrying in 10 seconds"
    attempt=$((attempt + 1))
    sleep 10
  done

  if [ "${ALLOW_DEMO_SEED:-}" = "true" ]; then
    log "Seed demo account because ALLOW_DEMO_SEED=true"
    SECRET_KEY_BASE="${SECRET_KEY_BASE:-precompile_placeholder}" ./bin/rails db:seed || \
      error_exit "Failed to seed demo account"
  fi
else
  error_exit "./bin/rails does not exist or is not executable"
fi

log "Completed release_script.sh per controlplane.yml"
