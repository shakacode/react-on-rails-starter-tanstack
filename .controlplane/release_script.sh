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
  # path comes up. Retry only connection failures, so a failing migration stops
  # the release on its first error.
  attempt=1
  max_attempts=5
  retry_delay="${DB_PREPARE_RETRY_DELAY_SECONDS:-10}"
  while :; do
    if output=$(SECRET_KEY_BASE="${SECRET_KEY_BASE:-precompile_placeholder}" ./bin/rails db:prepare 2>&1); then
      printf '%s\n' "$output"
      break
    fi
    printf '%s\n' "$output" 1>&2
    case "$output" in
      *PG::ConnectionBad*|*ActiveRecord::ConnectionNotEstablished*) ;;
      *) error_exit "Failed to run DB migrations" ;;
    esac
    [ "$attempt" -lt "$max_attempts" ] || error_exit "Failed to run DB migrations"
    log "DB connection failed on attempt $attempt of $max_attempts; retrying in $retry_delay seconds"
    attempt=$((attempt + 1))
    sleep "$retry_delay"
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
