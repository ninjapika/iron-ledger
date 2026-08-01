#!/usr/bin/env bash
# Reverts to a previous release. Defaults to whatever was live right before
# the current one; pass a specific commit/tag to go further back.
#
# Usage:
#   deploy/rollback.sh                        # back to the previous release
#   deploy/rollback.sh a1b2c3d                 # back to a specific commit
#   deploy/rollback.sh a1b2c3d --restore-db backups/pre-a1b2c3d-....sql
#                                              # also restore that patch's
#                                              # pre-migration DB snapshot —
#                                              # ONLY do this if you're sure;
#                                              # it discards any real data
#                                              # logged since that backup.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source deploy/lib.sh

require_file ".env" "Run deploy/setup.sh first."
require_file "deploy/.release-history" "No release history found — nothing to roll back from."

CURRENT=$(cat deploy/.current-release 2>/dev/null || echo "")
TARGET="${1:-}"
RESTORE_FLAG="${2:-}"
BACKUP_FILE="${3:-}"

if [ -z "$TARGET" ]; then
  # Most recent entry in the history that isn't the current one.
  TARGET=$(tac deploy/.release-history | awk -v cur="$CURRENT" '$0 != cur { print; exit }')
  [ -n "$TARGET" ] || die "No earlier release found in deploy/.release-history. Pass a commit/tag explicitly."
fi

log "Rolling back ${CURRENT:0:12} -> ${TARGET:0:12}"

if ! docker image inspect "iron-ledger:${TARGET}" >/dev/null 2>&1; then
  log "Image iron-ledger:${TARGET:0:12} isn't cached locally anymore — rebuilding from that commit."
  require_clean_git
  git checkout --quiet "$TARGET"
  docker build -t "iron-ledger:${TARGET}" .
fi

set_env_var IMAGE_TAG "$TARGET" .env
docker compose up -d app

if ! wait_healthy "http://127.0.0.1:3101/api/health" 20; then
  die "Rollback target ${TARGET:0:12} also failed its health check — this needs a manual look (docker compose logs app)."
fi

echo "$TARGET" >> deploy/.release-history
echo "$TARGET" > deploy/.current-release
log "Rolled back to ${TARGET:0:12}."

if [ "$RESTORE_FLAG" = "--restore-db" ]; then
  [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ] || die "Pass an existing backup file: deploy/rollback.sh $TARGET --restore-db deploy/backups/<file>.sql"
  warn "About to restore the database from $BACKUP_FILE."
  warn "This discards any real data logged after that backup was taken. Ctrl+C now to cancel."
  read -r -p "Type 'restore' to continue: " confirm
  [ "$confirm" = "restore" ] || die "Cancelled."
  docker compose exec -T postgres psql -U iron_ledger iron_ledger < "$BACKUP_FILE"
  log "Database restored from $BACKUP_FILE."
fi
