# Setup & Multi-Machine Workflow

This project runs on Windows and macOS (Apple Silicon). The repo lives on GitHub
at **`ABR61/mbvkarnataka`** — all work is pushed there. Code syncs via git; the
local Postgres database and `.env` do **not** sync and are recreated per machine
(the database can be carried across with a backup file — see step 5).

---

## First-time setup on a new machine (macOS / Apple Silicon)

### 1. Prerequisites (install once)

```bash
# Homebrew (if not already installed):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node            # Node 24.x
brew install --cask docker   # Docker Desktop (Apple Silicon build)
brew install gh              # GitHub CLI
```

**Open Docker Desktop once** so its engine starts. Docker must be running before
the app — otherwise Postgres is unreachable and every page returns HTTP 500.

### 2. Clone the repo

```bash
gh auth login                       # sign in as ABR61
git clone https://github.com/ABR61/mbvkarnataka.git ngo-training-platform
cd ngo-training-platform
git checkout phase-1-training-ops   # the active working branch
```

If `gh` has more than one account signed in, make sure ABR61 is active before
pushing (`gh auth switch --hostname github.com --user ABR61`), or the push is
refused with HTTP 403.

### 3. Recreate `.env` (gitignored — not in the clone)

```bash
cp .env.example .env
npx auth secret              # generates AUTH_SECRET; paste the value into .env
```

`DATABASE_URL` in `.env.example` already matches `docker-compose.yml`, so no
change needed. `AUTH_SECRET` does not need to match the other machine for local dev.

### 4. Install deps and start the database

```bash
npm install                  # builds arch-native binaries (Prisma engine, etc.)
docker compose up -d         # Postgres on :5432 (native arm64 image)
```

### 5. Load data — pick ONE

**A. Bring the real data from the other machine (recommended).** On the old
machine run `./scripts/backup-db.sh` and copy the newest `backups/mbv-*.sql`
file across (USB / Google Drive — `backups/` is gitignored). On the new machine,
put it in a `backups/` folder inside the project, then:

```bash
./scripts/restore-db.sh backups/mbv-YYYYMMDD-HHMMSS.sql
npx prisma migrate deploy    # should report nothing to apply
```

Do **not** run `db:migrate` or `db:seed` before restoring — the backup already
contains the tables, and they would clash.

**B. Start fresh with sample data.**

```bash
npm run db:migrate           # apply migrations to the fresh DB
npm run db:seed              # load seed data
```

### 6. Run the site

```bash
npm run dev                  # -> http://localhost:3000
```

Open **http://localhost:3000** — use `localhost`, not the network IP, to avoid
Next.js's cross-origin dev-resource block. Admin login (seed data):
`admin@mbv.local` / `ChangeMe123!`.

> Do **not** copy `node_modules` between machines — it contains platform-specific
> native binaries. Always run `npm install` fresh.

---

## Day-to-day: switching between machines

Code moves through GitHub. The golden rule: **push before you leave a machine,
pull before you start on the other one.**

### When you FINISH on a machine (before switching)

```bash
git status                   # see what changed
git add -A
git commit -m "describe what you did"
git push                     # upload to GitHub
```

### When you START on the other machine

```bash
git pull                     # download the latest commits

# Then bring the environment up to date:
docker compose up -d         # ensure Postgres is running (start Docker Desktop first)
npm install                  # only if package.json changed since last pull
npm run db:migrate           # only if new migrations were added
npm run dev
```

A safe "always works" startup sequence on either machine:

```bash
docker compose up -d && npm install && npm run db:migrate && npm run dev
```

`npm install` and `npm run db:migrate` are no-ops when nothing changed, so running
them every time is harmless and avoids "works on one machine" surprises.

---

## Branches

- `main` — stable baseline
- `phase-1-training-ops` — active development

Keep doing the work on `phase-1-training-ops` (or feature branches off it) on both
machines. Because both machines push/pull the same branch, commit and push often
to avoid divergence.

### If `git push` is rejected (the other machine pushed first)

```bash
git pull --rebase            # replay your local commits on top of the remote
# resolve any conflicts, then:
git push
```

---

## Important: what does NOT sync between machines

| Item            | Why                                   | Action per machine                     |
| --------------- | ------------------------------------- | -------------------------------------- |
| `.env`          | gitignored (secrets)                  | Recreate from `.env.example`           |
| `node_modules/` | platform-native binaries              | `npm install`                          |
| `.next/`        | build cache                           | Regenerated by `npm run dev`           |
| Postgres data   | lives in a local Docker volume        | Restore a backup (step 5A), or `npm run db:seed` |
| `backups/`      | gitignored (contains personal data)   | Copy the newest `.sql` file across by hand |

Back up after each working session with `./scripts/backup-db.sh`, and keep a
copy of the newest file off the machine.

---

## Troubleshooting

- **Every page is HTTP 500 / blank, `ECONNREFUSED` on :5432** — Docker Desktop or
  the Postgres container isn't running. Start Docker Desktop, then
  `docker compose up -d`.
- **Cross-origin dev-resource warning** — you're using the `192.168.x.x` network
  URL. Use `http://localhost:3000` instead.
- **`npm run dev` fails after a pull** — run `npm install` (deps changed) and
  `npm run db:migrate` (schema changed).
