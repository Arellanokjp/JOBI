# JOBI Backend

NestJS 12 + Prisma 7 (MySQL/MariaDB) API for a job marketplace with three roles:
**JOB_SEEKER**, **EMPLOYER** and **ADMIN**. All routes live under `/api/v1`.

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, EMAIL_*
npx prisma migrate deploy   # or `npx prisma db push` for a fresh dev database
npm run db:seed             # creates the 3 roles (+ first admin if SEED_ADMIN_* is set)
npm run start:dev
```

**The seed step is required**: registration looks roles up by name and fails without them.

Requires Node ≥ 22.12 to run. The test suite needs Node ≥ 24.9 (Jest loads Nest 12's ESM-only
packages natively there). Run `npm test` (unit) and `npm run test:e2e` (API tests with a mocked database).

## How it works

### Accounts
1. `POST /auth/register/job-seeker` or `/auth/register/employer` → account is `PENDING`, a 6-digit OTP is emailed.
2. `POST /auth/email/verify-otp` → email verified and the account becomes `ACTIVE`
   (suspended/inactive accounts are never re-activated by verifying).
3. `POST /auth/login` → JWT. The role is always re-read from the database, so role changes apply immediately.
4. Password reset: `POST /auth/password-recovery/request` then `/confirm` (`email`, `otp`, `newPassword`).
   The request endpoint answers identically whether or not the email exists.

OTPs: 10 min expiry, 5 wrong attempts lock a code, 60 s resend cooldown, 5 per hour.

### Employer onboarding
`create company` → (optional branches/documents) → `POST /company-verification` →
admin `PATCH /company-verification/:id/review` (`APPROVED` | `REJECTED` + reason).
Employers can create **draft** jobs immediately but can only **publish** once the company is `APPROVED`.
An employer owns exactly one company; every employer-side query is scoped through `companies.owner_user_id`.

### Hiring flow
- Job seekers see only open jobs (`PUBLISHED`, not deleted, deadline not passed). Employers see their company's jobs; admins see all.
- `POST /applications` (job seeker) – one application per job; answers to the job's form go in `responses[]`
  and every required field must be answered. Withdrawing (`DELETE /applications/:id`) keeps the record and
  re-applying reactivates it. Employers/admins change `status`; both sides receive notifications.
- Employers may read a candidate's resume only when it is attached to an application for one of their jobs.
- Interviews: employers schedule (VIDEO needs `meeting_url`, IN_PERSON needs `location`); internal `notes` are never shown to candidates.

### Application form answers by field type
`TEXT/TEXTAREA/SELECT/RADIO` → `response_text` · `MULTISELECT` → `response_text` as JSON array string ·
`CHECKBOX` → `"true"|"false"` · `NUMBER` → `response_number` · `DATE` → `response_date` · `FILE` → `file_url`.

## Permissions at a glance

| Area | JOB_SEEKER | EMPLOYER | ADMIN |
|---|---|---|---|
| `/job-categories`, `/job-types`, `/skills` | read | read | full |
| `/companies` | approved companies (public fields) | own | all |
| `/company-branches`, `/company-documents` | – | own company | all (+ document review) |
| `/company-verification` | – | request / view own | review |
| `/jobs` | open jobs | own company: full CRUD | all |
| `/application-forms`, `/application-fields` | read (open jobs) | manage for own jobs | all |
| `/applications`, `/application-responses` | own | applications to own jobs (status changes) | all |
| `/resumes`, `/education`, `/experience`, `/certifications`, `/resume-skills` | own: full CRUD | read applicants' | read |
| `/saved-jobs` | own | – | – |
| `/interviews` | own (read) | own jobs: full | all |
| `/notifications` | own | own | own + send to any user |
| `/admin` (user management) | – | – | full |
| `/audit-logs` | – | – | read-only |

Soft delete (`deleted_at`) is used wherever the schema has the column; other tables use hard delete and
return `409` if other records still reference the row. Unique-constraint and foreign-key violations also map to `409`.

## Status values
The schema stores these as plain strings; they are defined in `src/common/constants.ts`
(company/document: `PENDING|APPROVED|REJECTED`; job: `DRAFT|PUBLISHED|CLOSED`; application:
`SUBMITTED|UNDER_REVIEW|SHORTLISTED|INTERVIEW_SCHEDULED|OFFERED|HIRED|REJECTED|WITHDRAWN`).

## Scripts
`start:dev` · `build` · `start:prod` · `db:generate` · `db:seed` · `test` · `test:e2e` · `lint`
