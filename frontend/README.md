# JOBI Frontend

React 19 + TypeScript + Vite, pale green and white. Talks to the JOBI Nest backend (`/api/v1`).

## Run it

```bash
npm install
cp .env.example .env        # BACKEND_URL defaults to http://localhost:3000
npm run dev                 # http://localhost:5173
```

Start the backend first (`npm run start:dev` in the backend folder, after `npm run db:seed`).
In development Vite proxies `/api` to the backend, so no CORS setup is needed.

**Production:** set `VITE_API_URL=https://your-api-host/api/v1` before `npm run build`, serve `dist/`
(with a fallback to `index.html` for client-side routes), and set the backend's `CORS_ORIGIN` to your site's origin.

## What each role gets

| Role | Pages |
|---|---|
| Everyone | Sign in, register, verify email (6-digit code, resend with cooldown), forgot/reset password, notifications, profile |
| Job seeker | Find jobs (search, category, type, remote), job detail with a dynamic apply form built from the employer's questions, my applications (details, withdraw), saved jobs, resume (summary, experience, education, certifications, skills), interviews |
| Employer | My jobs (create, edit, publish, close, delete), application form builder, applicants (filter, review, change status), applicant detail with resume and answers, schedule interviews, company profile, branches, documents, verification request |
| Admin | Company review queue (approve/reject company and documents), users (search, create, edit role/status, delete), job categories / types / skills, audit log |

## How it syncs with the backend

- `src/lib/api.ts` is the only place that talks HTTP. It adds the Bearer token, unwraps Nest's error format
  (string or array of validation messages) and signs the user out on any 401.
- `src/lib/types.ts` mirrors the backend response shapes.
- Roles come from the backend (`/auth/me`); the UI hides what a role can't use and the backend still enforces it.
- Forms drop empty optional fields before sending, because the backend rejects empty strings for URL/date fields.
- Business rules are shown, not duplicated: e.g. employers can only publish after approval, so "Published now" appears
  only once their company is approved, and the backend re-checks it.

## Notes

- There is no file-upload endpoint in the backend, so documents, CV files and file answers are entered as links.
- Resume entries (experience, education, certifications) can be added and removed; to change one, remove and re-add it.
- Clearing an optional field on an existing record isn't supported yet (empty values are not sent).
- Fonts load from Google Fonts with system fallbacks.

Scripts: `dev` · `build` · `preview` · `typecheck`
