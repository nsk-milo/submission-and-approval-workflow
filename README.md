# PACRA — Procurement Request Approval Workflow

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

## A note on `POST /applications/:id/revise`

The spec's transition table includes `RETURNED_FOR_CHANGES → DRAFT` but lists no
endpoint that performs it, while also stating only `DRAFT` applications are
editable. To honour both, a small dedicated applicant action (`/revise`) moves a
returned request back to `DRAFT` (recording an audit entry) so it becomes editable
and can be resubmitted. It is the only addition beyond the documented endpoint
list and is enforced by the same state machine.
