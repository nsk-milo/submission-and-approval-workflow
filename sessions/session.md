# Session Summary — PACRA Procurement Request Approval Workflow

> Build session for a full-stack, two-sided workflow application: **Applicants**
> submit procurement requests; **Reviewers** approve / reject / return them. The
> system's core job is enforcing workflow state transitions and keeping a
> complete, immutable audit trail.

---

## 1. Starting point

- Working directory `/home/kashman/projects/js-projects/pacra-work` was **empty** (not a git repo).
- Tooling available: Node v23.5, npm 10.9, Docker 29.6 + Compose v5.2.
- Built from scratch as a monorepo: `backend/` (NestJS) + `frontend/` (Next.js) + root Docker/README.

---

## 2. Backend — NestJS + Prisma + PostgreSQL (`backend/`)

### Structure (matches the required architecture)
```
src/
├── auth/          # JWT login, bcrypt, passport-jwt strategy
├── users/         # user lookup service
├── applications/  # applicant + reviewer controllers, service, DTOs
├── workflow/      # WorkflowStateMachine (transition rules)
├── audit-log/     # append-only audit service
├── common/        # guards · decorators · filters · exceptions
└── prisma/        # PrismaService (global module)
```

### Key design points
- **`WorkflowStateMachine`** (`workflow/workflow.state-machine.ts`) is the single
  source of truth. Static adjacency map of legal edges; `assertTransition()`
  validates the edge, the actor's role, and mandatory comments — throwing the
  right HTTP error (400 illegal / 400 comment-required / 403 role).
- **No controller mutates `status` directly.** Everything funnels through
  `ApplicationsService.performTransition`, which calls the state machine then
  writes the new status **and** the audit record inside one Prisma transaction →
  every status change is guaranteed legal *and* audited.
- **Authorization is defense-in-depth:** coarse role checks via
  `JwtAuthGuard` + `RolesGuard` (+ separate `/applications` vs
  `/reviewer/applications` controllers), fine-grained ownership/state checks in
  the service, plus reviewer-only transition targets in the state machine.
- **Global exception filter** emits the documented error envelopes
  (400 validation w/ `errors`, 400 illegal transition, 403 Forbidden, 404 Not found).
- **AuditLog is append-only** (service exposes only create + read) → immutable trail.

### Data model (Prisma)
- `User 1:N Application`, `Application 1:N AuditLog`, `User 1:N AuditLog`.
- Enums (`Role`, `Category`, `ApplicationStatus`) as native Postgres enums.
- `amount` is `Decimal(14,2)` (money — no float rounding).
- `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` for the Alpine runtime.
- Migration (`20260625210442_init`) + seed (two required users + sample apps & audit rows).

### Workflow
```
DRAFT ─submit→ SUBMITTED ─→ UNDER_REVIEW | APPROVED | REJECTED | RETURNED_FOR_CHANGES
UNDER_REVIEW ─→ APPROVED | REJECTED | RETURNED_FOR_CHANGES
RETURNED_FOR_CHANGES ─revise→ DRAFT
APPROVED / REJECTED = terminal
```

---

## 3. Frontend — Next.js 15 App Router (`frontend/`)

### Structure
```
src/
├── app/
│   ├── login/                         # role-based redirect
│   ├── applicant/  (page, applications/new, [id], [id]/edit)
│   └── reviewer/   (page, applications/[id])
├── components/   (ui/* shadcn-style primitives, status-badge, audit-timeline, app-header)
├── features/     (applications/application-form + schema, reviewer/review-actions)
├── hooks/        (use-auth, use-applications, use-reviewer — TanStack Query)
├── lib/          (api/axios, auth/cookies, utils, workflow)
├── services/     (auth.service, applications.service)
├── providers/    (query-provider)
├── types/        (shared TS types)
└── middleware.ts (route protection)
```

### Highlights
- **Route protection** via `middleware.ts` reading a role cookie set at login
  (edge can't read localStorage). Unauth → `/login`; cross-role → own dashboard.
- **TanStack Query** owns server state; mutations invalidate keys to keep UI fresh.
- **React Hook Form + Zod** mirror the backend DTO rules (title required, category
  required, amount > 0); backend stays authoritative.
- Axios instance attaches the bearer token and redirects to `/login` on 401.
- Reviewer reject/return use **modal dialogs with required comments**.
- Applicant dashboard + reviewer queue (status-filter chips + title search),
  status badges, and a chronological audit timeline on detail pages.

---

## 4. Infrastructure & docs

- Root **`docker-compose.yml`**: `postgres` (healthcheck) + `backend`
  (multi-stage `Dockerfile`, entrypoint runs migrate deploy → seed → start).
- OpenSSL + the musl Prisma engine added so Prisma works on `node:22-alpine`.
- **`README.md`**: setup (Docker & local), demo accounts, full REST API table,
  error envelopes, state-machine diagram, and the four architecture decisions.

---

## 5. Verification (all green)

| Check | Result |
| --- | --- |
| Backend `npm run build` | ✅ compiles |
| Backend unit tests (WorkflowStateMachine) | ✅ **16/16** |
| Backend e2e tests (Supertest, live DB) | ✅ **13/13** |
| Frontend `npm run build` | ✅ 8 routes + middleware |
| curl smoke: login → create → submit → approve | ✅ APPROVED |
| Applicant approves (expect 403) | ✅ 403 |
| Re-approve APPROVED (illegal, expect 400) | ✅ "Illegal status transition" |
| Audit trail order on detail | ✅ created → submitted → approved |
| Middleware redirects (unauth / cross-role / same-role) | ✅ 307 / 307 / 200 |
| Docker image build + container migrate+seed+serve | ✅ login over HTTP confirmed |

---

## 6. Decisions & deviations to remember

1. **Postgres host port = `5434`** (not 5432) — another Postgres already owned
   5432 on this machine. Reflected in `backend/.env`, `.env.example`, compose, README.
   (Inside Docker the backend still talks to `postgres:5432`.)
2. **Added `POST /applications/:id/revise`** (`RETURNED_FOR_CHANGES → DRAFT`) — the
   only endpoint beyond the documented list. The spec defines that transition but
   no endpoint for it while requiring DRAFT-only editing; `/revise` reconciles the
   two and is enforced by the same state machine. Documented in the README.
3. **Prisma pinned to 5.22** — an IDE Prisma 7 language server flags `url = env(...)`
   as unsupported; that's a false positive for our pinned version (migrations run fine).
4. React pinned to **stable 19.0.0** + Next **15.1.6** (initial RC pin caused peer
   conflicts).

---

## 7. How to run

```bash
# Option A: Docker for DB + API
docker compose up -d --build           # API on :4000, Postgres on host :5434
cd frontend && npm install && npm run dev   # http://localhost:3000

# Option B: local backend
docker compose up -d postgres
cd backend && cp .env.example .env && npm install
npm run prisma:migrate && npm run prisma:seed && npm run start:dev

# Tests
cd backend && npm run test && npm run test:e2e
```

Demo accounts — `applicant@example.com` / `reviewer@example.com`, password `Password123`.
