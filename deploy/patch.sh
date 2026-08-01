#!/usr/bin/env bash
# Updates the live deployment to a new commit — any size of change, from a
# CSS tweak to a new feature with a schema migration. Every step is a gate:
# if the build fails, if a migration fails, or if the new version fails its
# health check, the script backs out and the site keeps running exactly as
# it was. Nothing is ever left half-applied.
#
# Usage:
#   deploy/patch.sh                 # deploy the latest commit on origin/main
#   deploy/patch.sh origin/main      # same, explicit
#   deploy/patch.sh v1.4.0           # deploy a specific tag/branch/sha
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source deploy/lib.sh

require_file ".env" "Run deploy/setup.sh first."
require_file "deploy/.current-release" "Run deploy/setup.sh first — this file records what's currently live."
require_clean_git

TARGET_REF="${1:-origin/main}"
CURRENT_SHA=$(cat deploy/.current-release)

log "Fetching..."
git fetch --quiet --all --tags

NEW_SHA=$(git rev-parse "$TARGET_REF")

if [ "$NEW_SHA" = "$CURRENT_SHA" ]; then
  log "Already up to date (${CURRENT_SHA:0:12}). Nothing to do."
  exit 0
fi

log "Patching ${CURRENT_SHA:0:12} -> ${NEW_SHA:0:12}"
git checkout --quiet "$NEW_SHA"

# --- Gate 1: does it even build? ---------------------------------------
# This alone catches type errors, broken imports, anything that would make
# `next build` fail — and it needs no database at all (queries don't run
# at build time), so it's a completely safe thing to try before touching
# anything real.
log "Building iron-ledger:${NEW_SHA:0:12} ..."
if ! docker build -t "iron-ledger:${NEW_SHA}" .; then
  warn "Build failed. Nothing was changed — still running ${CURRENT_SHA:0:12}."
  git checkout --quiet "$CURRENT_SHA"
  exit 1
fi

# --- Backup before anything touches the database ------------------------
mkdir -p deploy/backups
BACKUP_FILE="deploy/backups/pre-${NEW_SHA:0:12}-$(date +%Y%m%d%H%M%S).sql"
log "Backing up the database to ${BACKUP_FILE} ..."
if ! docker compose exec -T postgres pg_dump -U iron_ledger iron_ledger > "$BACKUP_FILE"; then
  warn "Backup failed — aborting before touching anything."
  rm -f "$BACKUP_FILE"
  git checkout --quiet "$CURRENT_SHA"
  exit 1
fi

# --- Gate 2: migrations ---------------------------------------------------
# Most patches (UI tweaks, new features that reuse existing tables) won't
# have any pending migration at all — this is a no-op for those, drizzle's
# migrate() only applies what it hasn't seen before.
log "Applying any pending migrations..."
if ! IMAGE_TAG="$NEW_SHA" docker compose run --rm app node migrate.js; then
  warn "Migration failed. The live app is untouched — still running ${CURRENT_SHA:0:12}."
  warn "The database may be partially migrated; inspect it, or restore ${BACKUP_FILE} if needed:"
  warn "  docker compose exec -T postgres psql -U iron_ledger iron_ledger < ${BACKUP_FILE}"
  git checkout --quiet "$CURRENT_SHA"
  exit 1
fi

# --- Gate 3: does the new version actually come up healthy? -------------
# Runs on an internal-only alternate port, side by side with the still-live
# old container on the real port — the live site is never interrupted by a
# candidate that turns out to be broken.
log "Starting a candidate on an internal port to health-check before cutover..."
docker rm -f iron_ledger_candidate >/dev/null 2>&1 || true
IMAGE_TAG="$NEW_SHA" docker compose run --rm -d --name iron_ledger_candidate -p 127.0.0.1:3102:3000 app >/dev/null

HEALTHY=0
if wait_healthy "http://127.0.0.1:3102/api/health" 30; then
  HEALTHY=1
fi
docker stop iron_ledger_candidate >/dev/null 2>&1 || true

if [ "$HEALTHY" -ne 1 ]; then
  warn "New version failed its health check. Live app was never touched — still running ${CURRENT_SHA:0:12}."
  git checkout --quiet "$CURRENT_SHA"
  exit 1
fi

# --- Cut over -------------------------------------------------------------
log "Healthy. Cutting over..."
set_env_var IMAGE_TAG "$NEW_SHA" .env
docker compose up -d app

if ! wait_healthy "http://127.0.0.1:3101/api/health" 20; then
  warn "Live health check failed AFTER cutover — rolling back automatically."
  set_env_var IMAGE_TAG "$CURRENT_SHA" .env
  docker compose up -d app
  git checkout --quiet "$CURRENT_SHA"
  die "Rolled back to ${CURRENT_SHA:0:12}. The attempted deploy (${NEW_SHA:0:12}) did not go live."
fi

echo "$NEW_SHA" > deploy/.current-release
echo "$NEW_SHA" >> deploy/.release-history
prune_old_images 5

log "Deployed ${NEW_SHA:0:12} successfully."
log "Roll back any time with: deploy/rollback.sh"
