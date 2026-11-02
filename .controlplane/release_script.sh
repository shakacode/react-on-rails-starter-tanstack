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
  # path comes up. Retry only that failure, and only before a migration starts,
  # so a failing migration stops the release on its first error.
  attempt=1
  max_attempts=5
  retry_delay="${DB_PREPARE_RETRY_DELAY_SECONDS:-10}"
  output_file=$(mktemp)
  status_file=$(mktemp)
  while :; do
    {
      SECRET_KEY_BASE="${SECRET_KEY_BASE:-precompile_placeholder}" ./bin/rails db:prepare 2>&1
      echo "$?" > "$status_file"
    } | tee "$output_file"
    [ "$(cat "$status_file")" = "0" ] && break
    if ! grep -q "server closed the connection unexpectedly" "$output_file" ||
      grep -q "migrating" "$output_file" ||
      [ "$attempt" -ge "$max_attempts" ]; then
      error_exit "Failed to run DB migrations"
    fi
    log "DB connection closed on attempt $attempt of $max_attempts; retrying in $retry_delay seconds"
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
