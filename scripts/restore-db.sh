#!/usr/bin/env bash
# Restore a Postgres dump created by backup-db.sh into the local database.
#
# Usage:  ./scripts/restore-db.sh backups/mbv-YYYYMMDD-HHMMSS.sql
#
# DESTRUCTIVE: this overwrites the current database contents. Reads DATABASE_URL
# from .env. Uses psql if on PATH, otherwise the `mbv-postgres` Docker container.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dump="${1:-}"
[ -n "$dump" ] || { echo "Usage: $0 <dump.sql>" >&2; exit 1; }
[ -f "$dump" ] || { echo "ERROR: dump file not found: $dump" >&2; exit 1; }

env_file="$root/.env"
[ -f "$env_file" ] || { echo "ERROR: .env not found at $env_file" >&2; exit 1; }
url="$(grep -E '^\s*DATABASE_URL\s*=' "$env_file" | head -1 | sed -E 's/^\s*DATABASE_URL\s*=\s*//; s/^"//; s/"$//')"
clean_url="${url%%\?*}"
dbname="${clean_url##*/}"

printf 'This will OVERWRITE the "%s" database with %s. Continue? [y/N] ' "$dbname" "$dump"
read -r reply
case "$reply" in [yY]*) ;; *) echo "Aborted."; exit 0 ;; esac

if command -v psql >/dev/null 2>&1; then
  psql "$clean_url" < "$dump"
else
  creds="${clean_url#*://}"
  dbuser="${creds%%:*}"
  echo "psql not found on PATH — using Docker container mbv-postgres…"
  docker exec -i mbv-postgres psql -U "$dbuser" "$dbname" < "$dump"
fi

echo "✅ Restored $dbname from $dump"
