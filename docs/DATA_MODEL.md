# MBV Platform — Phase 1 Data Model (ERD)

> Phase 1 = **Training Operations Core**. Status: DRAFT v0.1 (2026-06-04).
> Localized text fields (e.g. names/descriptions) are stored per-locale `{ en, kn }` for Kannada + English.
> Designed so LMS, Finance, and Placement modules attach cleanly in later phases.

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    DISTRICT   ||--o{ CENTER            : contains
    CENTER     ||--o{ VENUE             : has
    CENTER     ||--o{ COHORT            : hosts
    PROGRAM    ||--o{ COURSE            : "is made of"
    PROGRAM    ||--o{ COHORT            : "instantiated as"
    COHORT     ||--o{ ENROLLMENT        : has
    PERSON     ||--o{ ENROLLMENT        : "enrolls (trainee)"
    COHORT     ||--o{ SESSION           : schedules
    COURSE     ||--o{ SESSION           : "delivered in"
    VENUE      ||--o{ SESSION           : "held at"
    PERSON     ||--o{ SESSION           : "trains (trainer)"
    SESSION    ||--o{ ATTENDANCE        : records
    PERSON     ||--o{ ATTENDANCE        : "marked for (trainee)"
    COHORT     ||--o{ TRAINER_ASSIGNMENT: "staffed by"
    PERSON     ||--o{ TRAINER_ASSIGNMENT: "assigned (trainer)"
    USER       ||--o| PERSON            : "profile of"
    USER       ||--o{ USER_ROLE         : has
    ROLE       ||--o{ USER_ROLE         : "assigned via"
    ROLE       ||--o{ ROLE_PERMISSION   : grants
    PERMISSION ||--o{ ROLE_PERMISSION   : "included in"
    PERSON     ||--o{ DOCUMENT          : owns
    PERSON     ||--o{ CONSENT_RECORD     : gives

    DISTRICT {
        uuid   id PK
        json   name "en/kn"
        string code
        string state "Karnataka"
    }
    CENTER {
        uuid   id PK
        uuid   districtId FK
        json   name
        string address
        string contactPhone
        string status
    }
    VENUE {
        uuid   id PK
        uuid   centerId FK
        string name
        int    capacity
    }
    PERSON {
        uuid   id PK
        uuid   userId FK "nullable"
        string firstName
        string lastName
        date   dateOfBirth
        string gender
        string phone
        string email
        string address
        uuid   districtId FK "nullable"
        string photoUrl
    }
    USER {
        uuid   id PK
        string email
        string phone
        string passwordHash "or authProvider"
        string locale "en|kn"
        string status
    }
    ROLE {
        uuid   id PK
        string name "Trainee|Trainer|Coordinator|CenterManager|Finance|Placement|Admin"
    }
    PERMISSION {
        uuid   id PK
        string key "e.g. attendance.mark"
    }
    USER_ROLE {
        uuid userId FK
        uuid roleId FK
    }
    ROLE_PERMISSION {
        uuid roleId FK
        uuid permissionId FK
    }
    PROGRAM {
        uuid   id PK
        json   name
        json   description
        string category
        int    durationWeeks
        string status
    }
    COURSE {
        uuid   id PK
        uuid   programId FK
        json   name
        json   description
        int    sequence
        int    hours
    }
    COHORT {
        uuid   id PK
        uuid   programId FK
        uuid   centerId FK
        uuid   coordinatorId FK "Person"
        string code
        date   startDate
        date   endDate
        int    capacity
        string status
    }
    ENROLLMENT {
        uuid   id PK
        uuid   personId FK "trainee"
        uuid   cohortId FK
        date   enrolledOn
        string status "enrolled|completed|dropped"
        string exitReason
    }
    SESSION {
        uuid   id PK
        uuid   cohortId FK
        uuid   courseId FK
        uuid   venueId FK
        uuid   trainerId FK "Person"
        date   sessionDate
        time   startTime
        time   endTime
        json   topic
        string status
    }
    ATTENDANCE {
        uuid   id PK
        uuid   sessionId FK
        uuid   personId FK "trainee"
        string status "present|absent|late|excused"
        uuid   markedById FK
        datetime markedAt
    }
    TRAINER_ASSIGNMENT {
        uuid   id PK
        uuid   personId FK "trainer"
        uuid   cohortId FK
        string role
    }
    DOCUMENT {
        uuid   id PK
        uuid   personId FK
        string type
        string url
        datetime uploadedAt
    }
    CONSENT_RECORD {
        uuid   id PK
        uuid   personId FK
        string consentType
        string version
        datetime grantedAt
        string ipAddress
    }
```

---

## Notes & design choices

- **User vs Person:** `User` = login/credentials; `Person` = the human (trainee/trainer/staff). A trainee may exist as a `Person` *without* a `User` login (staff enter their data), and get a login later. Trainers/staff always have a `User`.
- **Roles:** RBAC via `Role` + `Permission` (many-to-many through join tables). One person can hold multiple roles (e.g. a Trainer who is also a Center Manager).
- **District as first-class:** enables **district-wise reporting** across ~30–60 centers — valued by donors/government.
- **Localized fields** (`name`, `description`, `topic`): stored as `{ en, kn }` JSON so both languages are first-class; extensible to more languages later.
- **Attendance** is the highest-frequency action — indexed on `(sessionId, personId)`; bulk-mark per session.
- **Consent records** capture DPDP consent at admission (adult trainees, 18+).
- **Audit log** (cross-cutting, not shown) records sensitive mutations: who/what/when.
- **Bulk import:** CSV import paths for `Person`, `District`/`Center`, and `Enrollment` to onboard the greenfield org quickly.

---

## Attachment points for later phases

| Future module | Attaches to |
|---------------|-------------|
| **LMS (Moodle)** | `Course` ↔ Moodle course; `Enrollment` ↔ Moodle enrolment; completion/certificate ↔ `Person` |
| **Finance** | `Expense` → `Program` / `Cohort` / `Center` |
| **Placement & M&E** | `Placement`, `EmployerPartner` → `Person`; outcome surveys → `Enrollment` |
| **Admissions** | `Application` → becomes `Person` + `Enrollment` on selection |
