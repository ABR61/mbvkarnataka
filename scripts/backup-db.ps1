# Back up the local Postgres database (and .env) into ./backups (gitignored).
#
# Usage:
#   ./scripts/backup-db.ps1
#
# Reads the connection details from DATABASE_URL in .env. Finds pg_dump on PATH,
# falling back to the portable install at C:\Users\amogh\tools\pg16.
# Restore a dump with scripts/restore-db.ps1.

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# --- locate pg_dump ---
$pgDump = (Get-Command pg_dump.exe -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $fallback = "C:\Users\amogh\tools\pg16\pgsql\bin\pg_dump.exe"
  if (Test-Path $fallback) { $pgDump = $fallback }
  else { throw "pg_dump not found on PATH or at $fallback" }
}

# --- parse DATABASE_URL from .env ---
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }
$line = (Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1)
if (-not $line) { throw 'DATABASE_URL not found in .env' }
$url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"')
if ($url -notmatch '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)') {
  throw "Could not parse DATABASE_URL: $url"
}
$dbUser = $Matches[1]; $dbPass = $Matches[2]; $dbHost = $Matches[3]; $dbPort = $Matches[4]; $dbName = $Matches[5]

# --- ensure backups dir ---
$backups = Join-Path $root 'backups'
New-Item -ItemType Directory -Path $backups -Force | Out-Null

$stamp = (Get-Date).ToString('yyyyMMdd-HHmmss')
$dumpFile = Join-Path $backups "mbv-$stamp.sql"

$env:PGPASSWORD = $dbPass
& $pgDump -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $dumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }

# Also snapshot .env (secrets) alongside the dump — both stay gitignored under backups/.
Copy-Item $envFile (Join-Path $backups ".env.backup-$stamp") -Force

$kb = [math]::Round((Get-Item $dumpFile).Length / 1KB, 1)
Write-Host "Backed up '$dbName' -> $dumpFile ($kb KB)" -ForegroundColor Green
Write-Host "Copied .env -> backups\.env.backup-$stamp" -ForegroundColor Green
Write-Host "Reminder: copy the backups\ folder off this machine for a real off-box backup." -ForegroundColor Yellow
