#!/usr/bin/env bash
# Shared helpers sourced by setup.sh / patch.sh / rollback.sh.
# Assumes the caller has already `cd`ed to the project root.

log()  { echo "==> $*"; }
warn() { echo "!!  $*" >&2; }
die()  { echo "*** $*" >&2; exit 1; }

# Insert-or-update a KEY=VALUE line in an env file, without disturbing
# anything else in it (a plain `>>` append would leave duplicate/stale
# lines behind on repeated runs).
set_env_var() {
  local key="$1" value="$2" file="$3"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

get_env_var() {
  local key="$1" file="$2"
  grep "^${key}=" "$file" 2>/dev/null | tail -1 | cut -d= -f2-
}

require_clean_git() {
  if [ -n "$(git status --porcelain)" ]; then
    die "Uncommitted local changes in $(pwd). Commit, stash, or discard them before deploying — a patch has to know exactly which commit is running."
  fi
}

require_file() {
  [ -f "$1" ] || die "$1 not found. $2"
}

# Polls a URL until it returns 2xx, or gives up after $2 seconds (default 30).
wait_healthy() {
  local url="$1" timeout="${2:-30}" waited=0
  while [ "$waited" -lt "$timeout" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

# Keeps the most recent N images for this project, removes older ones.
# Best-effort — never fails the script over cleanup.
prune_old_images() {
  local keep="${1:-5}"
  docker images "iron-ledger" --format '{{.Tag}}' \
    | grep -v '^latest$' \
    | sort -u \
    | tail -n "+$((keep + 1))" \
    | while read -r tag; do
        docker rmi "iron-ledger:${tag}" >/dev/null 2>&1 || true
      done
}
