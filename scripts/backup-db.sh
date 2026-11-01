#!/usr/bin/env bash
# Back up the local Postgres database into ./backups (gitignored).
#
# Usage:  ./scripts/backup-db.sh
#
# Reads DATABASE_URL from .env. Uses pg_dump if on PATH, otherwise falls back to
# running pg_dump inside the `mbv-postgres` Docker container. Restore a dump with
# scripts/restore-db.sh. Cross-platform companion to backup-db.ps1 (Windows).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="$root/.env"
[ -f "$env_file" ] || { echo "ERROR: .env not found at $env_file" >&2; exit 1; }

# --- read DATABASE_URL from .env (strip quotes) ---
url="$(grep -E '^\s*DATABASE_URL\s*=' "$env_file" | head -1 | sed -E 's/^\s*DATABASE_URL\s*=\s*//; s/^"//; s/"$//')"
[ -n "$url" ] || { echo "ERROR: DATABASE_URL not found in .env" >&2; exit 1; }

# pg_dump rejects the ?schema=... query libpq doesn't understand — drop it.
clean_url="${url%%\?*}"

mkdir -p "$root/backups"
out="$root/backups/mbv-$(date +%Y%m%d-%H%M%S).sql"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$clean_url" > "$out"
else
  # Fallback: dump inside the Docker container. Parse user/db from the URL.
  creds="${clean_url#*://}"            # user:pass@host:port/db
  userpass="${creds%%@*}"             # user:pass
  dbuser="${userpass%%:*}"            # user
  dbname="${clean_url##*/}"           # db
  echo "pg_dump not found on PATH — using Docker container mbv-postgres…"
  docker exec mbv-postgres pg_dump -U "$dbuser" "$dbname" > "$out"
fi

size="$(wc -c < "$out" | tr -d ' ')"
echo "✅ Backed up to: $out  (${size} bytes)"
echo "   Copy this file somewhere off this machine for a true off-site backup."
