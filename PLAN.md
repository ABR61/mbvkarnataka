# MBV — Manava Bandhutva Vedike — Occupational Training Platform

> Organization: **Manava Bandhutva Vedike (MBV)** · Living planning document. Status: **DRAFT v0.2** · Last updated during planning session (2026-06-04).
> *Name spelling to confirm: "Manava Bandhutva Vedike" (ಮಾನವ ಬಂಧುತ್ವ ವೇದಿಕೆ).*
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

- **Phase 0 — Foundations:** repo, environments, auth/RBAC, consent model, core data model, CI/CD, i18n scaffold.
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

**Still open:**
1. **NGO / project name** — for repo, branding, and domain (folder is currently the placeholder `ngo-training-platform`).

---

## 13. Next Steps

1. Get the **NGO/project name** (last open item).
2. Finalize Phase 1 scope and a detailed **entity-relationship diagram (ERD)**.
3. Initialize the repo (Next.js + Prisma + Postgres + i18n + Auth.js).
4. Build Phase 0 foundations, then Phase 1.
