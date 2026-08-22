# Restore the local Postgres database from a backup dump produced by scripts/backup-db.ps1.
#
# Usage:
#   ./scripts/restore-db.ps1                 # restore the newest dump in ./backups
#   ./scripts/restore-db.ps1 -File path.sql  # restore a specific dump
#
# Reads the connection details from DATABASE_URL in .env. Finds psql on PATH,
# falling back to the portable install at C:\Users\amogh\tools\pg16.
# WARNING: this DROPs and recreates the target schema — all current data is replaced.

param(
  [string]$File
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# --- locate psql ---
$psql = (Get-Command psql.exe -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $fallback = "C:\Users\amogh\tools\pg16\pgsql\bin\psql.exe"
  if (Test-Path $fallback) { $psql = $fallback }
  else { throw "psql not found on PATH or at $fallback" }
}

# --- parse DATABASE_URL from .env ---
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }
$line = (Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1)
if (-not $line) { throw 'DATABASE_URL not found in .env' }
$url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"')
# postgresql://user:pass@host:port/db?...
if ($url -notmatch '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)') {
  throw "Could not parse DATABASE_URL: $url"
}
$dbUser = $Matches[1]; $dbPass = $Matches[2]; $dbHost = $Matches[3]; $dbPort = $Matches[4]; $dbName = $Matches[5]

# --- pick the dump file ---
if (-not $File) {
  $latest = Get-ChildItem (Join-Path $root 'backups\mbv-*.sql') -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime | Select-Object -Last 1
  if (-not $latest) { throw 'No dump found in ./backups (mbv-*.sql). Pass -File explicitly.' }
  $File = $latest.FullName
}
if (-not (Test-Path $File)) { throw "Dump file not found: $File" }

Write-Host "Restoring '$dbName' on ${dbHost}:${dbPort} from:`n  $File" -ForegroundColor Yellow
Write-Host "This REPLACES all current data. Ctrl+C within 5s to abort..." -ForegroundColor Red
Start-Sleep -Seconds 5

$env:PGPASSWORD = $dbPass
# Reset the public schema so the restore is clean, then load the dump.
& $psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 `
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
& $psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -f $File
if ($LASTEXITCODE -ne 0) { throw "psql restore failed (exit $LASTEXITCODE)" }
Write-Host "Restore complete." -ForegroundColor Green
