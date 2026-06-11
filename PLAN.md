# MBV — Manava Bandhutva Vedike — Occupational Training Platform

> Organization: **Manava Bandhutva Vedike (MBV)** · Living planning document. Status: **v0.4** · Phase 0 + **Phase 1 feature-complete** (2026-06-11). Remaining: tests, CI, PR — see §14.
> This is the shared spec we build from. Update it as decisions evolve.

---

## 1. Vision

A single web platform for an NGO that runs **free occupational training programs for youth (18+) in Karnataka, India**. It serves the public (marketing + admissions), trainees (learning), and staff (operations, finance, impact), with the explicit goal of moving youth from training into **employment** — and proving that impact to funders.

---

## 2. Context & Constraints

| Topic | Decision |
|-------|----------|
| **Geography** | Karnataka, India — **~30–60 centers across ~31 districts** (1–2 per district) |
| **Languages** | **Kannada + English** (bilingual) |
| **Scale** | 5,000–50,000 trainees/year (multi-center, multi-district) |
| **Delivery** | **Blended** (in-person + online) |
| **Budget** | Effectively unlimited — favor best-of-breed managed services; still prioritize maintainability |
| **Existing systems** | None (greenfield) — needs bulk import + data-entry to onboard |
| **Maintained by** | **In-house team** post-launch — build for good DX, docs, tests, CI/CD |
| **Devices** | Web, responsive — works equally on phone and desktop (no native app for now) |
| **Trainees** | **18+** (no minors → no parental-consent flows) |
| **Compliance** | India **DPDP Act 2023** (adult data); India data residency |

---

## 3. Users & Roles (RBAC)

- **Visitor / Applicant** — browses programs, applies
- **Trainee** — enrolled learner: schedule, attendance, courses, certificates
- **Trainer / Instructor** — delivers sessions, marks attendance, manages content
- **Program Coordinator** — runs cohorts, scheduling, trainee records
- **Center Manager** — oversees a center's operations
- **Finance Staff** — program budgets & expenses
- **Placement Officer** — employer partners, job placements, outcomes
- **Admin** — users, roles, configuration, reporting
- **Employer Partner** *(later)* — posts jobs, views candidates
- **Donor / Funder** *(later)* — impact dashboards

---

## 4. Platform Surfaces

1. **Public marketing site** — programs, impact stories, apply, news (SEO-critical, bilingual)
2. **Learner portal** — trainees
3. **Staff back-office** — coordinators, center managers, trainers, finance, placement, admin
4. **Partner/Donor portals** *(later phases)*

All four share one codebase, one database, one auth system, gated by role.

---

## 5. Module Map

| Module | Scope | Phase |
|--------|-------|-------|
| **Identity & RBAC** | Auth, roles, permissions, consent records | 0 |
| **Training Operations Core** | Programs, courses, cohorts/batches, sessions, scheduling, **attendance**, trainee & trainer records, districts/centers/venues, bulk import | 1 |
| **Public site + Admissions** | Marketing pages, online application, applicant pipeline | 2 |
| **LMS (Moodle integration)** | Course content, assessments, progress, **certificates (NGO's own format)** — SSO + API sync | 3 |
| **Finance** | Program budgets, expense tracking, vendor payments, grant accounting | 4 |
| **Placement & M&E** | Job placements, **employer/partner management**, income/impact follow-up, **district-wise** donor dashboards | 5 |
| **Communications** | Email + SMS (DLT-compliant) notifications | cross-cutting |
| **Reporting & Audit** | Dashboards, exports, audit logs | cross-cutting |

---

## 6. Architecture & Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Web/App** | Next.js (App Router, TypeScript) + Tailwind | One codebase: SSR marketing (SEO) + app portals; responsive |
| **Backend** | Structured monolith (Next.js server + service layer) | Simple to start; extract services later if scale demands |
| **Database** | PostgreSQL + Prisma | Deeply relational domain (attendance, enrollment, finance); strong reporting |
| **Auth/RBAC** | Auth.js (self-hosted) | Many roles; keeps user data in our DB (DPDP-friendly); no per-seat fees |
| **i18n** | next-intl | Kannada + English UI + translatable content fields |
| **LMS** | **Moodle** (managed or self-hosted by in-house team), SSO via OIDC/SAML, sync via Moodle Web Services API | Mature, multilingual, free, fits blended delivery |
| **Object storage** | AWS S3 (Mumbai) | Course media, trainee documents |
| **Email / SMS** | AWS SES / Indian DLT-compliant SMS (e.g. MSG91) | Reminders, admissions, attendance alerts |
| **Hosting** | **AWS Mumbai (ap-south-1)** — app on containers, RDS Postgres, S3 | Data residency + low latency |
| **CI/CD** | GitHub Actions | Automated build/test/deploy; in-house team friendly |
| **Analytics (later)** | Metabase | Ad-hoc reporting for staff/donors |

### LMS integration approach
- Our app is the **system of record** for people, cohorts, and enrollment.
- Moodle handles **course delivery, assessments**; certificates use the **NGO's own template** (generated by our app or Moodle, with verification).
- **Single sign-on** so trainees log in once; enrollment is **provisioned to Moodle** automatically; **progress/completion synced back** for reporting and certificates.

---

## 7. Internationalization (Kannada + English)

- UI strings via next-intl; **content fields are translatable** (e.g. program/course descriptions stored per-locale).
- **Kannada** + **English**; architecture allows adding more languages later without rework.
- Moodle provides its own multilingual content support.

---

## 8. Compliance & Data Protection (India)

- **DPDP Act 2023:** explicit consent, purpose limitation, data-principal rights (access/correction/erasure), breach handling.
- **Adult trainees (18+):** standard consent at admission; no behavioral tracking / targeted advertising.
- **Data residency:** all personal data hosted in India region.
- **Audit logs** for sensitive actions; **encryption** at rest and in transit; role-scoped access to PII.
- *Future (if donations added):* 80G receipts, and **FCRA** rules if foreign funds are involved.

---

## 9. Phased Roadmap

- **Phase 0 — Foundations:** ✅ **DONE** — repo, Next.js 16 + Tailwind 4, Docker Postgres, Auth.js v5 (Credentials), RBAC + full Phase 1 schema, i18n scaffold (en + kn), seed (admin user, sample districts). *Remaining hardening rolled into Phase 1 Slice 0 below.*
- **Phase 1 — Training Operations Core** *(first build):* programs, courses, cohorts, session scheduling, trainer assignment, districts/centers/venues, **attendance**, trainee/trainer records, **bulk CSV import**, admin data-entry.
- **Phase 2 — Public site + online admissions:** marketing pages, application form, applicant → trainee pipeline.
- **Phase 3 — LMS:** Moodle integration, SSO, content, assessments, progress, **certificates (NGO format)**.
- **Phase 4 — Finance:** program budgets, expense tracking, vendor payments, grant accounting, reports.
- **Phase 5 — Placement & M&E:** job placements, employer/partner management, income/impact follow-up, district-wise donor dashboards.

---

## 10. Core Data Model — Phase 1 (high level)

- **User** — login, role(s), locale, consent records
- **Person** — trainee/trainer/staff profile (PII, documents)
- **District** — Karnataka district (geographic grouping for centers & reporting)
- **Center** — physical training location (belongs to a District)
- **Venue/Room** — within a center
- **Program** — a training offering (bilingual)
- **Course** — unit within a program
- **Cohort/Batch** — instance of a program at a center, with intake dates
- **Enrollment** — Person ↔ Cohort
- **Session** — a scheduled class (course, cohort, venue, trainer, time)
- **Attendance** — Person ↔ Session (status)
- **Trainer assignment** — Person ↔ Cohort/Session
- **Role / Permission** — RBAC

*Designed so LMS (course↔Moodle), Finance (expense↔program/cohort), and Placement (outcome↔person) attach cleanly later.*

---

## 11. Non-functional Requirements

- **Security:** encryption in transit/at rest, least-privilege RBAC, audit logging, secrets management.
- **Performance:** handle multi-center/multi-district concurrency at 5k–50k trainees/yr; paginated, reporting-friendly queries.
- **Accessibility:** WCAG-minded; usable on low-end phones and slower connections.
- **Reliability:** automated backups, staging + production environments, monitoring/alerting.
- **Maintainability:** typed code, tests, documentation, clear module boundaries — handed to an in-house team.

---

## 12. Resolved Decisions & Remaining

**Resolved:**
- Languages: **Kannada + English** (bilingual).
- Maintained by: **in-house team** post-launch.
- Certificates: **NGO's own format** (no NSQF/PMKVY alignment).
- Trainees: **18+** (no minor / parental-consent flows).
- Centers: **1–2 per district across Karnataka** (~30–60 centers; **District** is a first-class entity).

- **NGO / project name:** **Manava Bandhutva Vedike (MBV)** (was the last open item).
- **Document upload / S3:** **Deferred** — keep the `Document` model; no upload UI in Phase 1 (add when admissions/LMS need it).
- **Data layer:** **Server Components for reads + Server Actions for mutations** (permission + zod + audit baked into each action).
- **UI components:** **Hand-rolled minimal Tailwind components** for Phase 1; revisit a library if the surface grows.

**Still open:** *(none)*

---

## 13. Phase 1 — Training Operations Core: Detailed Build Plan

The data model already exists in [`prisma/schema.prisma`](../prisma/schema.prisma), so Phase 1 is an **application-layer** build. Work is sliced **vertically** — each slice is independently shippable and demoable. Order is dependency-driven: each slice unblocks the next.

### In scope
Auth UI + RBAC enforcement · back-office app shell · master-data CRUD (districts, centers, venues, programs, courses) · people (trainees/trainers/staff) + consent · cohorts + enrollment · sessions + attendance · bulk CSV import · audit logging · baseline tests + CI.

### Out of scope (later phases)
Public marketing site & online admissions (P2) · Moodle/LMS & certificates (P3) · finance (P4) · placement & donor dashboards (P5) · email/SMS comms · S3 document upload *(model kept, UI deferred — see open item 1)*.

### Conventions established in Phase 1 (reused everywhere after)
- **Localized fields** are `{ en, kn }` JSON — one typed helper (`localized(field, locale)`) + one bilingual form input component.
- **Validation**: `zod` (already a dependency) schemas shared by server actions and client forms.
- **Mutations** go through server actions that (a) check permission, (b) validate, (c) write an `AuditLog` row.
- **Lists**: server-paginated + searchable, one shared table pattern.

---

### Slice 0 — Harden the foundation *(prereq for all RBAC)* ✅ DONE (2026-06-11)
Fixed gaps found in the current scaffold.
- ✅ Roles + permissions now resolved at sign-in and cached on the JWT, exposed via `session.user.{id, roles, permissions}` ([`src/auth.ts`](../src/auth.ts)); `Session` type augmented in [`src/types/next-auth.d.ts`](../src/types/next-auth.d.ts).
- ✅ Single source of truth for RBAC in [`src/lib/rbac.ts`](../src/lib/rbac.ts) (typed `PERMISSIONS`, `ROLES`, `ROLE_PERMISSIONS` matrix) — imported by both the seed and the auth layer. Seed now applies the matrix idempotently (Admin 8 · CenterManager 6 · Coordinator 4 · Trainer 2 · Finance 1 · Placement 1 · Trainee 0).
- ✅ All **31 Karnataka districts** (en + kn) seeded from [`src/lib/karnataka-districts.ts`](../src/lib/karnataka-districts.ts).
- ✅ `requirePermission(key)` / `requireAuth()` server guards in [`src/lib/auth-guards.ts`](../src/lib/auth-guards.ts) + `<Can permission>` UI gate in [`src/components/Can.tsx`](../src/components/Can.tsx).
- ✅ **AC met:** migrate + seed run clean, build + `tsc` pass, DB matrix verified.
- *Deferred to Slice 1:* `requirePermission` currently redirects anonymous users to the Auth.js default sign-in and throws on forbidden — Slice 1 swaps in a branded localized sign-in + a 403 page.

### Slice 1 — Auth UI + app shell ✅ DONE (2026-06-11)
- ✅ Bilingual **sign-in** page ([`/[locale]/sign-in`](../src/app/[locale]/sign-in/page.tsx)) with a client form (`useActionState`, pending + inline error states) backed by Auth.js `signIn` server actions ([`src/app/actions/auth.ts`](../src/app/actions/auth.ts)); **sign-out** via a form action in the topbar.
- ✅ Back-office layout ([`/[locale]/admin/layout.tsx`](../src/app/[locale]/admin/layout.tsx)) with permission-gated sidebar (`<Can>`), user menu, **locale switcher**, and a dashboard landing showing the user's roles.
- ✅ **AC met (verified via HTTP):** anon `/en/admin` → 307 to `/en/sign-in`; admin credentials login → 302 to dashboard with session cookie; authenticated dashboard renders; bad password → rejected with no session; renders in en + kn.
- **Decision:** route protection lives in the **admin layout (Server Component)**, not the proxy — Next 16 docs state the proxy is for optimistic checks only, and importing the Prisma-backed auth into the edge proxy is unsafe. The layout runs on every `/admin/**` request and is the real authorization boundary.

### Slice 2 — Master data: Geography + Curriculum ✅ DONE (2026-06-11)
- ✅ **Districts** (read/edit — seeded), **Centers** CRUD, **Venues** CRUD (geography, gated by `center.manage`).
- ✅ **Programs** CRUD, **Courses** CRUD (ordered by `sequence`; curriculum, gated by `cohort.manage`).
- ✅ Reusable primitives shipped: `localized()`/`toLocalized()`/`toLocalizedOrNull()`, `writeAudit()`, `FormState`/`zodFieldErrors()`, `BilingualField` (incl. multiline), `Pagination`, `SearchBox`, `DeleteButton`. Server-action shape = permission → zod → prisma → audit → revalidate → redirect.
- ✅ **AC met (verified via live HTTP):** Centers full CRUD + Program create exercised end-to-end through the real server-action runtime (localized `{en,kn}` persisted, audit rows written); all list pages render with bilingual search + pagination; en + kn both render.
- *Note:* a sample Program ("Tailoring and Garment Making") remains in the dev DB from verification.

### Slice 3 — People + consent ✅ DONE (2026-06-11)
- ✅ Added `Person.kind` (TRAINEE/TRAINER/STAFF) discriminator (migration `add_person_kind`). Shared `PersonFields` form + `validation/person.ts` (incl. `parseDateOfBirth` enforcing the 18+ rule).
- ✅ **Trainees** (`/admin/trainees`, `trainee.manage`): full CRUD; create captures an explicit **DPDP `ConsentRecord`** (required consent checkbox + client IP).
- ✅ **Trainers** (`/admin/trainers`, `trainer.manage`): full CRUD; create **provisions a `User` login + Trainer role + Person atomically** (transaction, bcrypt, email-uniqueness); delete removes the linked login.
- ✅ **AC met (verified via live HTTP):** trainee created with consent record; trainer created with login — **the new trainer signs in successfully**, sees only permitted nav (Attendance, not Centers), and is denied `/admin/centers` server-side.
- *Note:* sample trainee (Asha Kumari) + trainer (`ravi@mbv.local` / `TrainerPass1`) remain in the dev DB from verification. Forbidden access currently throws a 500 — a branded 403 page is a later refinement.

### Slice 4 — Cohorts + Enrollment ✅ DONE (2026-06-11)
- ✅ **Cohort** CRUD (program + center + coordinator + dates + capacity + status; unique `code`), gated by `cohort.manage`. Create lands on the cohort's manage page.
- ✅ Rich **manage page**: cohort fields + **enrollment** (enroll/unenroll with **capacity + duplicate guards**) + **trainer assignment** (assign/unassign with role). Inline `useActionState` forms surface guard errors without navigation.
- ✅ **AC met (verified via live HTTP):** created a cohort (capacity 2), enrolled 2 trainees, **3rd enroll blocked (capacity)**, **re-enroll blocked (duplicate)**, trainer assigned as "lead"; audit rows for cohort/enrollment/assignment.
- *Note:* a sample cohort `TLR-2026-01` + test trainees (Alpha/Beta/Gamma) + "Test Center" remain in the dev DB from verification.

### Slice 5 — Sessions + Attendance *(the operational core)* ✅ DONE (2026-06-11)
- ✅ **Session** CRUD per cohort (course, venue, trainer, date, start/end time, bilingual topic, status), gated by `session.manage`.
- ✅ **Attendance** roster: bulk-mark PRESENT/ABSENT/LATE/EXCUSED in one save (upsert → editable/re-savable), records `markedBy`/`markedAt`, "mark all present" helper; gated by `attendance.mark`. Uses `useActionState` for pending state + consistency.
- ✅ **Per-trainee attendance %** (PRESENT+LATE / total sessions) on the cohort manage page.
- ✅ **AC met (verified on the production build):** scheduled a session, bulk-marked 2 trainees in one POST (markedBy set), re-marked to confirm upsert (no duplicate rows), saw `1/1 (100%)` on the cohort page.
- *Verification note:* the headless curl harness reliably drives `useActionState` forms (full encrypted payload) but not `$ACTION_ID`-only direct-action forms on the prod server — which is partly why `markAttendance` was made a `useActionState` action.

### Slice 6 — Bulk CSV import ✅ DONE (2026-06-11)
- ✅ Reusable import infra: `lib/csv.ts` parser, `ImportForm` (paste CSV → **dry-run preview** → commit valid rows only, per-row result table, template download).
- ✅ **Trainee import** (`trainee.manage`): per-row validation (firstName, gender, DOB 18+, email, districtCode); commit creates each valid `Person(TRAINEE)` + a DPDP `ConsentRecord` (`v1-bulk`).
- ✅ **Enrollment import** (`cohort.manage`): cohort-by-code + trainee-by-phone matching; unknown-cohort / trainee-not-found / ambiguous / duplicate (incl. in-batch) / capacity guards.
- ✅ **AC met (verified on production build):** a 104-row trainee CSV (100 valid + 4 invalid) previewed as **100/104, nothing written**, then committed **exactly 100** (+100 consent records, 0 invalid inserted). Enrollment: 5 rows → 2 committed, rest correctly rejected.

### Cross-cutting (every slice)
- ✅ `AuditLog` write on every create/update/delete (incl. bulk imports).
- ✅ en/kn UI strings kept in sync in [`src/messages`](../src/messages).
- ⬜ **Tests**: unit (zod schemas, RBAC helper), integration (server actions against a test DB), smoke e2e — *not yet written; see follow-ups*.
- ⬜ **CI** (GitHub Actions): lint · typecheck · `prisma validate` · build · test — *not yet set up*.

---

## 14. Status & follow-ups

**Phase 1 (Training Operations Core) — feature-complete (2026-06-11).** All six slices built on `phase-1-training-ops`, each verified against a live/production server. The back-office covers auth+RBAC, geography & curriculum, people (+consent) & trainers (+logins), cohorts/enrollment, sessions/attendance, and bulk CSV import — fully bilingual (en/kn), audit-logged, permission-gated.

**Remaining before calling Phase 1 "done-done":**
1. ✅ **Unit tests** (Vitest) — 41 tests over CSV/RBAC/localized/forms/validation.
2. ✅ **CI** (GitHub Actions) — `verify` job (ci → generate → validate → lint → typecheck → test → build) + `integration` job (postgres service → migrate deploy → integration tests).
3. ✅ **403 page** — `requirePermission` now calls `forbidden()`; bilingual `[locale]/forbidden.tsx`.
4. ✅ **Integration tests** — 6 tests vs a migrated test DB (unique enrollment/trainer/district-code; cascade deletes for cohort/person/session).
5. ✅ **e2e smoke** — HTTP-level suite (anon redirect, sign-in render, admin login → dashboard, bad-password reject) + CI `e2e` job (build → start → run). Browser-driven e2e (Playwright) still optional.
6. **Enrollment import** trainee matching by phone is ambiguity-prone (ambiguous matches already error) — could add an optional stable key (Person id / email).
7. Open the PR for `phase-1-training-ops` → `main` (**no git remote yet** — needs a GitHub repo created + push authorized).

**Test pyramid:** 41 unit + 6 integration (DB) + 4 e2e (HTTP). CI: `verify` · `integration` · `e2e`.

---

## 15. Phase 2 — Public site + online admissions: Build Plan

Goal: let the public discover programs and **apply online without an account**, and let staff run the **applicant → trainee pipeline**. Reuses the Phase-1 primitives (localized fields, server actions, audit, RBAC). New data: `Application`. New permission: `application.manage` (Admin, CenterManager, Coordinator).

**Conventions / decisions:**
- Public marketing pages live in a `(public)` route group under `/[locale]` with their own header/footer; SEO metadata (title/description) per page. Bilingual.
- The apply form is **unauthenticated** (a public server action — zod-validated, honeypot for basic spam defense, captures DPDP consent + IP on the `Application`). No rate-limiting in the MVP (noted).
- Conversion: an accepted application becomes a `Person(TRAINEE)` (+ a real `ConsentRecord`) and, optionally, an `Enrollment` into a chosen cohort.

### Slice 2.1 — Application model + public programs browsing ✅ DONE (2026-06-11)
- ✅ `Application` model + `ApplicationStatus` + migration; `application.manage` permission (Admin/CenterManager/Coordinator) + seed.
- ✅ `(public)` route group with header/footer; public **programs listing** + **program detail** (bilingual, SEO, Apply CTA). Both `force-dynamic` (DB-free build).

### Slice 2.2 — Online application ✅ DONE (2026-06-11)
- ✅ Public **apply** form (`?program=` prefill) + unauthenticated `createApplication` (honeypot, zod, required DPDP consent + IP); inline thank-you. Verified: anon submit creates `Application(SUBMITTED)`.

### Slice 2.3 — Applicant pipeline (back-office) ✅ DONE (2026-06-11)
- ✅ Applications list (status-filter chips) + detail (gated `application.manage`): status transitions + review note; **convert** → `Person(TRAINEE)` + `ConsentRecord` (+ optional `Enrollment`, capacity-guarded), status CONVERTED, `personId` linked. Verified end-to-end on the production build.

**Phase 2 complete.** Cross-cutting done: `Public`/`Apply`/`Applications` i18n (en + kn), audit on staff mutations, unit tests for application validation. *Optional follow-ups:* richer marketing pages (impact stories, news). *(Done in polish:* featured programs on home; public-pages e2e smoke — 8 e2e, 45 unit.*)*

---

## 16. Phase 3 — LMS (Moodle) + Certificates: Build Plan

> **Verification caveat:** the Moodle pieces (SSO, course/enrolment sync) need a **live, configured Moodle** to test end-to-end — not available in this dev environment. So Phase 3 leads with **certificates** (fully buildable + verifiable here), then builds the Moodle client **config-gated** with unit-tested request shaping; live Moodle verification is deferred to a real instance.

### Slice 3.1 — Certificates (NGO's own format) — *verifiable now*
- `Certificate` model (one per enrollment): snapshot of person + program names, unique `serialNumber` + `verifyCode`, issuedAt/by.
- **Issue** from the cohort manage page (gate `cohort.manage`): creates the certificate and marks the `Enrollment` COMPLETED. Printable certificate page.
- **Public verification** page (`/[locale]/verify/[code]`): anyone (e.g. an employer) confirms a certificate is genuine.

### Slice 3.2 — Moodle client + course mapping + enrolment provisioning — *config-gated*
- Env config (`MOODLE_URL`, `MOODLE_TOKEN`); typed Moodle Web Services client (`src/lib/moodle.ts`) with **unit-tested URL/payload building**; graceful "not configured" state.
- Attach points: `Course.moodleCourseId`, `Enrollment.moodleEnrolled`. Admin "sync enrolment to Moodle" action. (Live-verify on a real Moodle.)

### Slice 3.3 — Progress sync + SSO — *needs live Moodle*
- Pull completion/grades from Moodle into `Enrollment`; SSO (OIDC/SAML or token) so trainees log in once. Scaffold + document; verify against a real instance.
