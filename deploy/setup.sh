#!/usr/bin/env bash
# One-time first deploy. After this, use deploy/patch.sh for every update —
# it's the same underlying pieces (build, migrate, health-check, cut over)
# but with an automatic rollback if any step comes back wrong.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source deploy/lib.sh

require_file ".env" "Copy .env.example to .env and fill in POSTGRES_PASSWORD and SESSION_SECRET first (see server.md Part 2, step 2)."
require_clean_git

if ! command -v docker >/dev/null; then
  die "docker isn't installed. Install Docker + the compose plugin first."
fi

SHA=$(git rev-parse HEAD)
log "Building iron-ledger:${SHA} ..."
docker build -t "iron-ledger:${SHA}" .

set_env_var IMAGE_TAG "$SHA" .env

log "Starting Postgres..."
docker compose up -d postgres

log "Applying database schema..."
IMAGE_TAG="$SHA" docker compose run --rm app node migrate.js

log "Starting the app..."
docker compose up -d app

log "Waiting for it to come up..."
if ! wait_healthy "http://127.0.0.1:3101/api/health" 30; then
  die "App didn't become healthy within 30s. Check 'docker compose logs app'."
fi

mkdir -p deploy/backups
echo "$SHA" > deploy/.current-release
echo "$SHA" >> deploy/.release-history

log "Deployed ${SHA}."
log ""
log "Next steps:"
log "  1. Seed the exercise catalog (one-time, see server.md Part 2 step 4)."
log "  2. Set up Nginx + HTTPS (server.md Part 2 step 5)."
log "  3. Visit your subdomain and go through the signup wizard once."
log ""
log "From here on, use deploy/patch.sh to update and deploy/rollback.sh to undo — see server.md Part 3."
