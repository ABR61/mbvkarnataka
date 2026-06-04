# MBV — Manava Bandhutva Vedike — Occupational Training Platform

Web platform for **Manava Bandhutva Vedike (MBV)**, an NGO running free occupational
training programs for youth (18+) across Karnataka, India.

> 📋 Product plan: [`PLAN.md`](./PLAN.md) · Data model: [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md)

## Stack

| Layer | Technology |
|-------|-----------|
| Web/App | Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 |
| Database | PostgreSQL + Prisma 7 |
| Auth | Auth.js v5 (Credentials + RBAC) |
| i18n | next-intl v4 — **Kannada + English** |
| LMS (later) | Moodle integration |
| Hosting | AWS Mumbai (`ap-south-1`) |

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for local PostgreSQL)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
#    .env is already provided for local dev. Generate a real secret:
npx auth secret        # writes AUTH_SECRET into .env

# 4. Create the database schema
npm run db:migrate     # prisma migrate dev

# 5. Seed roles, permissions, an admin user, sample districts
npm run db:seed        # admin@mbv.local / ChangeMe123!

# 6. Run the dev server
npm run dev            # http://localhost:3000  (redirects to /en)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:push` | Push schema without a migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed baseline data |

## Project structure

```
src/
  app/
    [locale]/          # Localized routes (en, kn)
      layout.tsx       # Root layout + NextIntlClientProvider
      page.tsx         # Landing page
    api/auth/[...nextauth]/route.ts   # Auth.js handlers
  i18n/                # next-intl routing, request, navigation config
  messages/            # en.json, kn.json translation catalogs
  lib/prisma.ts        # Prisma client singleton
  auth.ts              # Auth.js configuration
  proxy.ts             # Next 16 "proxy" (locale routing middleware)
prisma/
  schema.prisma        # Phase 1 data model + Auth.js models
  seed.ts              # Baseline seed
docs/DATA_MODEL.md     # ERD
PLAN.md                # Product & architecture plan
```

## Roadmap

Phase 1 (current): **Training Operations Core** — programs, courses, cohorts,
sessions, scheduling, attendance, trainee/trainer records, bulk import.
See [`PLAN.md`](./PLAN.md) for all phases.
