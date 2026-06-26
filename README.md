# Submission & Approvals WorkFlow — Procurement Request Approval Workflow

A two-sided workflow application where **Applicants** submit procurement requests
and **Reviewers** approve, reject, or return them for changes. The system's core
responsibility is **enforcing workflow state transitions** and maintaining a
**complete, immutable audit trail** of every status change.

| Layer    | Stack                                                                 |
| -------- | --------------------------------------------------------------------- |
| Backend  | NestJS · TypeScript · Prisma · PostgreSQL · JWT · class-validator     |
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind · TanStack Query · React Hook Form · Zod · Axios |
| Testing  | Jest · Supertest                                                      |
| Infra    | Docker · Docker Compose                                               |

---

## Live demo

| Surface        | URL                                  |
| -------------- | ------------------------------------ |
| Frontend (app) | `<ADD DEPLOYED FRONTEND URL HERE>`   |
| Backend (API)  | `<ADD DEPLOYED API URL HERE>`        |

Sign in with the seeded demo accounts below
(`applicant@example.com` / `reviewer@example.com`, password `Password123`).

> **Deployment status:** the project is fully containerised and runs end-to-end
> via `docker compose up -d --build` (verified). Fill in the two URLs above once
> the frontend (e.g. Vercel) and backend + database (e.g. Render / Railway / Fly)
> are deployed. Suggested setup: deploy the backend with its `Dockerfile` and a
> managed Postgres, set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`
> (the deployed frontend origin); deploy the frontend with
> `NEXT_PUBLIC_API_URL` pointing at the deployed API.

---

## Repository layout

```
pacra-work/
├── docker-compose.yml          # postgres + backend services
├── backend/                    # NestJS API
│   ├── prisma/                 # schema, migrations, seed
│   └── src/
│       ├── auth/  users/  applications/  workflow/  audit-log/
│       ├── common/             # guards · decorators · filters · exceptions
│       └── prisma/
└── frontend/                   # Next.js App Router app
    └── src/
        ├── app/                # login · applicant/* · reviewer/*
        ├── components/  features/  hooks/  lib/  services/  providers/  types/
        └── middleware.ts       # route protection
```

---

## Demo accounts (seeded)

| Role      | Email                   | Password      |
| --------- | ----------------------- | ------------- |
| Applicant | `applicant@example.com` | `Password123` |
| Reviewer  | `reviewer@example.com`  | `Password123` |

---

## Quick start

### Option A — Docker (Postgres + API)

```bash
# from the repo root
docker compose up -d --build
```

This starts **Postgres** and the **backend** (the backend container automatically
runs migrations + seed on boot). The API is available at <http://localhost:4000>.

> Postgres is published on host port **5434** (to avoid clashing with a local
> 5432 instance). Inside the Docker network the backend talks to `postgres:5432`.

Then run the frontend locally:

```bash
cd frontend
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                     # http://localhost:3000
```

### Option B — Backend locally (Postgres in Docker)

```bash
# 1. start only the database
docker compose up -d postgres

# 2. backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate          # apply migrations  (prisma migrate deploy)
npm run prisma:seed             # seed users + sample data
npm run start:dev               # http://localhost:4000

# 3. frontend (separate terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:3000
```

> `npm run prisma:migrate` maps to `prisma migrate deploy`. For a fresh dev
> database where you also want a new migration generated, use
> `npm run prisma:migrate:dev`.

---

## Tests

```bash
cd backend

npm run test          # unit tests  — WorkflowStateMachine (16 specs)
npm run test:e2e      # API tests via Supertest (requires Postgres + seed)
```

The e2e suite verifies the full contract end-to-end:
login · create · submit · approve · **unauthorized approval → 403** ·
**illegal transition → 400** · reviewer-cannot-edit → 403 · audit trail ordering.

---

## REST API

All endpoints (except `POST /auth/login`) require `Authorization: Bearer <token>`.

### Auth
| Method | Path          | Role | Notes                              |
| ------ | ------------- | ---- | ---------------------------------- |
| POST   | `/auth/login` | —    | Returns `{ accessToken, user }`    |

### Applicant
| Method | Path                          | Notes                                   |
| ------ | ----------------------------- | --------------------------------------- |
| POST   | `/applications`               | Create a DRAFT                          |
| GET    | `/applications/my`            | My applications                         |
| GET    | `/applications/:id`           | Detail + audit trail (owner only)       |
| PUT    | `/applications/:id`           | Edit (DRAFT only, owner only)           |
| POST   | `/applications/:id/submit`    | DRAFT → SUBMITTED                        |
| POST   | `/applications/:id/revise`    | RETURNED_FOR_CHANGES → DRAFT *(see note)* |

### Reviewer
| Method | Path                                    | Notes                                  |
| ------ | --------------------------------------- | -------------------------------------- |
| GET    | `/reviewer/applications`                | Queue (`?status=` filter, `?search=`)  |
| GET    | `/reviewer/applications/:id`            | Detail + audit trail                   |
| POST   | `/reviewer/applications/:id/approve`    | → APPROVED                             |
| POST   | `/reviewer/applications/:id/reject`     | → REJECTED (comment **required**)     |
| POST   | `/reviewer/applications/:id/return`     | → RETURNED_FOR_CHANGES (comment **required**) |

### Error envelope
```jsonc
// 400 validation       { "statusCode": 400, "message": "Validation failed", "errors": { "amount": ["amount must be greater than 0"] } }
// 400 illegal transition{ "statusCode": 400, "message": "Illegal status transition" }
// 403 forbidden        { "statusCode": 403, "message": "Forbidden" }
// 404 not found        { "statusCode": 404, "message": "Application not found" }
```

---

## Workflow state machine

```
DRAFT                ──submit──▶ SUBMITTED
SUBMITTED            ──────────▶ UNDER_REVIEW | APPROVED | REJECTED | RETURNED_FOR_CHANGES
UNDER_REVIEW         ──────────▶ APPROVED | REJECTED | RETURNED_FOR_CHANGES
RETURNED_FOR_CHANGES ──revise──▶ DRAFT
APPROVED / REJECTED  ─ terminal ─
```

Rules enforced centrally:
- **Reject** and **Return for changes** require a comment.
- Reviewer-only targets (`UNDER_REVIEW`, `APPROVED`, `REJECTED`, `RETURNED_FOR_CHANGES`)
  cannot be reached by an applicant.
- Any disallowed status change is rejected with **HTTP 400**; any role violation
  with **HTTP 403**.

---

## Architecture decisions

### 1. State machine design
All transition logic lives in a single injectable `WorkflowStateMachine`
([backend/src/workflow/workflow.state-machine.ts](backend/src/workflow/workflow.state-machine.ts)).
A static adjacency map declares the legal edges; `assertTransition()` validates
the edge, the actor's role, and any mandatory comment, throwing the correct HTTP
exception. **No controller mutates `status` directly** — every change funnels
through `ApplicationsService.performTransition`, which calls the state machine and
then writes the new status **and** its audit record inside one Prisma transaction.
This keeps the rules in one auditable, unit-testable place and makes it impossible
to change a status without producing an audit entry.

### 2. Authorization strategy
Two complementary layers:
- **Coarse (role) — guards.** `JwtAuthGuard` validates the bearer token and
  populates `request.user`; `RolesGuard` enforces `@Roles(...)` metadata at the
  controller level. Applicant and reviewer endpoints live on separate controllers
  (`/applications` vs `/reviewer/applications`), so a reviewer simply has no edit
  route and an applicant has no approve route → **403**.
- **Fine (ownership / state) — service.** Per-record checks ("is this the owner?",
  "is it still a DRAFT?") run in the service because they need the entity. The
  state machine adds a third check (reviewer-only transition targets) so the rule
  is enforced even if a guard were ever misconfigured. **Defense in depth.**

On the frontend, `middleware.ts` gates `/applicant/*` and `/reviewer/*` using a
role cookie set at login (the middleware runs on the edge and can't read
`localStorage`, hence cookies). The server is always the source of truth — the
middleware is a UX guard, not the security boundary.

### 3. Prisma modeling choices
- Three entities — `User`, `Application`, `AuditLog` — with `User 1:N Application`,
  `Application 1:N AuditLog`, and `User 1:N AuditLog`.
- `amount` is `Decimal(14,2)` rather than a float, because it represents money and
  must not accumulate binary rounding error. (Prisma serializes `Decimal` as a
  string over JSON; the frontend formats it.)
- Enums (`Role`, `Category`, `ApplicationStatus`) are modeled as **Postgres enums**
  for integrity at the database level.
- `AuditLog` is treated as **append-only** — the service exposes only `create` and
  read paths, so history is immutable by construction. `oldStatus` is nullable to
  represent the initial "created" event. Indexes on `status`, `createdById`, and
  `applicationId` support the queue filter and detail queries.

### 4. Frontend architecture
- **App Router** with role-segmented route groups (`app/applicant`, `app/reviewer`),
  each with its own layout/header.
- **Server state** is owned by **TanStack Query** (`hooks/`); mutations invalidate
  the relevant query keys so the UI stays consistent after every workflow action.
- **Layering:** `services/` wraps Axios calls, `hooks/` wraps Query, `features/`
  holds composed domain UI (form, review modals), `components/ui/` holds shadcn-style
  primitives. A single Axios instance attaches the token and redirects to `/login`
  on 401.
- **Forms** use React Hook Form + Zod, mirroring the backend DTO rules
  (title required, category required, amount > 0) for instant client-side feedback,
  with the backend remaining authoritative.

---

## Trade-offs & what I'd add with more time

These are conscious cuts made to keep the scope focused on the core requirement —
**enforcing workflow transitions with a complete audit trail** — rather than gaps I
didn't notice.

**Auth & sessions**
- The JWT is stored in `localStorage` and a parallel **role cookie** is set purely so
  edge `middleware.ts` can gate routes (the edge can't read `localStorage`). This is
  pragmatic but not ideal — an **httpOnly, secure, SameSite cookie** holding the token
  would be safer against XSS. There are also no refresh tokens or token revocation; a
  token is valid until it expires.
- No registration / password-reset / rate-limiting on `/auth/login`. Users come from
  the seed only.

**Authorization**
- Role + ownership checks are correct but spread across guards, the service, and the
  state machine (defense in depth, but three places). A single policy/CASL layer would
  centralise "who can do what to which record."

**Data & audit**
- `AuditLog` is append-only *by convention* (the service exposes only create/read).
  With more time I'd enforce immutability at the DB level (revoke `UPDATE`/`DELETE`,
  or a trigger) so it's tamper-evident, not just tamper-discouraged.
- No pagination on the reviewer queue or audit trail — fine for a demo dataset, would
  not scale. The queue filters/search run as DB queries but return all matches.
- No soft-delete; `onDelete: Cascade` means deleting a user removes their applications
  and audit history. For a real audit system I'd never hard-delete.

**Frontend**
- No optimistic updates — mutations refetch via TanStack Query invalidation, which is
  simpler and always-consistent but shows a brief loading state.
- Minimal accessibility passes and no end-to-end (Playwright) tests; correctness is
  covered by backend unit + e2e tests, not UI tests.
- No file attachments on requests, no email/notification on status change, no
  reviewer assignment (any reviewer can action any request).

**Ops**
- The frontend isn't containerised (runs locally / on Vercel); only Postgres + backend
  are in `docker-compose.yml`. No CI pipeline or healthcheck on the API itself.

If I prioritised, the top three would be: **(1)** httpOnly cookie auth, **(2)**
DB-enforced audit immutability, **(3)** pagination on the queue and audit trail.

---

## AI tools used

**Full transparency: this project was built end-to-end in a single session with
[Claude Code](https://claude.com/claude-code)** (Anthropic's agentic CLI), running the
Opus model. The starting directory was empty; the backend, frontend, Docker setup,
tests, and this README were all generated through that session. A summary of the build
session is checked in at [sessions/session.md](sessions/session.md).

How it was used, concretely:
- **Scaffolding & implementation** — generating the NestJS modules (auth, applications,
  workflow, audit-log), the Prisma schema + migration + seed, and the Next.js App
  Router structure, then iterating on them.
- **The core logic** — the `WorkflowStateMachine`, the transaction that pairs every
  status change with an audit row, and the guard/service/state-machine authorization
  layering were designed and written with the assistant.
- **Tests** — the 16 unit specs for the state machine and the 13 Supertest e2e specs
  were written with Claude and run to green.
- **Debugging** — resolving the Prisma musl/Alpine engine target for Docker, the
  React 19 / Next 15 peer-dependency pins, and the Postgres host-port clash (5434).
- **Documentation** — this README and the session notes.

Every generated step was reviewed and verified by running it — builds, the full test
suite, `curl` smoke tests against the workflow, and the Docker container booting and
serving — before being accepted (see the verification table in
[sessions/session.md](sessions/session.md)). The design decisions documented above
reflect choices I made and directed, not unreviewed output.

---

## A note on `POST /applications/:id/revise`

The spec's transition table includes `RETURNED_FOR_CHANGES → DRAFT` but lists no
endpoint that performs it, while also stating only `DRAFT` applications are
editable. To honour both, a small dedicated applicant action (`/revise`) moves a
returned request back to `DRAFT` (recording an audit entry) so it becomes editable
and can be resubmitted. It is the only addition beyond the documented endpoint
list and is enforced by the same state machine.
