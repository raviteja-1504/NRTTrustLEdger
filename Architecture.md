# SchoolCRM — Multi-Tenant Architecture

**Version:** 1.1  
**Last updated:** May 2026

---

## 1. Vision

SchoolCRM is a **multi-tenant SaaS platform** that provides CRM + ERP capabilities to K-12 schools. One codebase, one deployment, N schools — each school gets its own branded subdomain (e.g. `meridian.schoolcrm.app`), isolated data, and role-based access for staff, teachers, accountants, admissions officers, and parents.

---

## 2. High-Level Architecture

```
                           ┌──────────────────────────────────────────────┐
                           │              CDN / Edge Routing              │
                           │  (CloudFront/Cloudflare + wildcard DNS)     │
                           └────────────────────┬─────────────────────────┘
                                                │
                           ┌────────────────────▼─────────────────────────┐
                           │            React SPA (Vite Build)            │
                           │  Static assets from CDN/S3 or static host    │
                           │  Tenant resolved from subdomain at runtime   │
                           └────────────────────┬─────────────────────────┘
                                                │ HTTPS (API calls)
                           ┌────────────────────▼─────────────────────────┐
                           │       Go Modular Monolith API (net/http)       │
                           │  Single EC2 for MVP; scale to ALB later      │
                           │                                               │
                           │  Middleware chain:                            │
                           │  requestID → logger → recover → cors →       │
                           │  tenantResolver → auth → rbac → handler      │
                           │                                               │
                           │  Start as one service; scale horizontally     │
                           │  only when traffic requires it.               │
                           └──┬──────────┬──────────┬──────────┬──────────┘
                              │          │          │          │
                    ┌─────────▼──┐  ┌────▼────┐  ┌─▼────────┐ │
                    │ PostgreSQL │  │  Redis   │  │    S3    │ │
                    │  RLS on    │  │ optional │  │  files   │ │
                    │ RDS/Aurora │  │ sessions │  │ receipts │ │
                    └────────────┘  └─────────┘  └──────────┘ │
                                                               │
                                                    ┌──────────▼────────┐
                                                    │ Background Jobs   │
                                                    │ River in API now  │
                                                    │ Lambda later for  │
                                                    │ bursty workloads  │
                                                    └───────────────────┘
```

---

## 3. Multi-Tenancy Model

### 3.1 Tenant Resolution
- **Subdomain-based:** `{school_short_code}.schoolcrm.app`
- DNS: wildcard `*.schoolcrm.app` → CDN/LB
- Middleware `tenantResolver` extracts subdomain → looks up `tenants.short_code` → sets `tenant_id` on request context
- SPA detects subdomain at boot, passes it to `TenantContext` for branding

### 3.2 Data Isolation — Single DB with Row-Level Security
- **Every tenant-scoped table** has a `tenant_id UUID NOT NULL` column
- PostgreSQL RLS policies enforce isolation:
  ```sql
  ALTER TABLE students ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON students
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
  ```
- Each request: `SET LOCAL app.current_tenant = '<tenant_id>'` before any query
- **Why not schema-per-tenant:** operational simplicity. RLS is simpler for migrations, backups, and monitoring. Revisit if a single tenant exceeds ~10M rows in their largest table.

### 3.3 Multi-Branch Schools
A school with multiple branches (e.g. "Meridian North", "Meridian South") is modeled as:

| Approach | Description |
|---|---|
| **Option A: Separate tenants** | Each branch = own tenant. Recommended for independent operations with separate staff, fees, and student bodies. A "group admin" identity can have memberships across all branch tenants (see §3.4). |
| **Option B: Branch-within-tenant** | Single tenant with a `branches` table. `class_sections`, `students`, and `staff` get a `branch_id FK`. Suitable when branches share fee structures, staff pool, and reporting. |

**Decision:** Start with **Option A** (separate tenants per branch). This is simpler, avoids cross-branch data complexity, and aligns with the identity/membership model. A group-level dashboard (phase 3) can aggregate across tenants.

### 3.4 Identity vs Membership (Multi-School Staff, Parents & Group Admins)
```
identities(id, email CITEXT UNIQUE, phone TEXT UNIQUE, password_hash, created_at)
    │
    ├── tenant_memberships(identity_id, tenant_id, role, scope JSONB, started_on, ended_on)
    │     → one parent can have memberships in multiple school tenants
    │     → one teacher can leave one tenant and join another
    │     → one group admin can have school_admin role in multiple branches
    │
    └── Login includes school_code. If identity has >1 role in same tenant → "Pick role" screen.
        JWT is always single-tenant: { tenant_id, membership_id, role, scope }
```

**Rule:** login identity is global; school access is tenant-local. A teacher changing schools does not move old attendance/marks history. The old tenant membership is ended, a new tenant membership is created, and historical records continue to point at the old tenant + actor.

### 3.5 Student Identity, Enrollments, and Transfers

Students are modeled as **tenant-local school records**. Even if a child moves from one client school to another, each school owns its own `students` row and its own academic/finance history.

```
students
  id, tenant_id, admission_no, name, dob, status
  -- no current grade/section columns

student_enrollments
  id, tenant_id, student_id, academic_year, class_section_id, roll_no,
  joined_on, left_on, status, promotion_source_enrollment_id

class_sections
  id, tenant_id, academic_year, grade, section, class_teacher_membership_id
```

**Why this shape:**
- Current grade/section is derived from the active `student_enrollments` row.
- Previous years are preserved because each academic year gets its own enrollment rows.
- Mid-year section changes are preserved by closing the old enrollment (`left_on`) and creating a new one.
- Attendance, marks, report cards, fee plans, invoices, and payments reference the enrollment/year they belong to.
- Cross-school transfers create a new tenant-local student record in the destination school. Old tenant data remains isolated unless the source school explicitly exports a transfer certificate or academic summary.

**Transfer model:** use `student_transfer_requests` for consented handoffs between client schools. The destination tenant can import a summary document or selected normalized data, but it never receives unrestricted read access to the source tenant's records.

---

## 4. Frontend Architecture

### 4.1 Stack
| Layer | Technology | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Strict types, ecosystem |
| Bundler | Vite 6 | Fastest dev DX |
| Routing | React Router v7 | Nested layouts, route guards |
| Styling | Tailwind CSS v4 | Utility-first, zero runtime |
| Components | shadcn/ui (Radix) | Accessible, owned source |
| Charts | Recharts | Declarative, composable |
| Animations | Motion (Framer) | Page transitions, staggered lists |
| DnD | React DnD | Admissions Kanban |
| State | React Context (Auth, Tenant) | Lightweight, no extra deps |
| API Client | Typed fetch wrapper | Zero deps, add React Query later |

### 4.2 Folder Structure
```
src/
├── lib/                          # Framework-agnostic core
│   ├── types.ts                  # User, Role, Permission, Tenant
│   ├── rbac.ts                   # Role→Permission map, authorize()
│   ├── auth/
│   │   ├── AuthContext.tsx        # currentUser, login/logout
│   │   ├── Can.tsx               # <Can permission="fees.write">
│   │   └── ProtectedRoute.tsx    # Route-level permission gate
│   ├── tenant/
│   │   └── TenantContext.tsx     # Branding, features, academic year
│   └── api/
│       └── client.ts             # fetch wrapper, auth headers
├── app/
│   ├── components/
│   │   ├── Layout.tsx            # Sidebar + topbar shell
│   │   ├── nav-config.ts        # RBAC-gated nav entries
│   │   ├── FormModal.tsx         # Shared modal for create flows
│   │   └── ui/                   # shadcn primitives
│   ├── pages/                    # One file per module
│   └── routes.tsx                # All routes with guard()
└── styles/
```

### 4.3 RBAC in Frontend
- **`<Can permission="…">`** — hides UI elements
- **`<ProtectedRoute>`** — redirects unauthorized direct-URL visits to `/403`
- **`authorize(user, perm, ctx)`** — attribute-aware (teacher scope, parent scope)
- Frontend is NOT the security boundary. Backend enforces everything.

### 4.4 Tenant Context in Frontend
- `TenantContext` provides: school name, logo, colors, academic year, feature flags, currency
- Feature flags (`tenant.features`) toggle entire modules (library, communications, parent portal)
- Changing a flag hides the module from nav, routes, and dashboard — zero code changes

### 4.5 API Data Strategy
To avoid making the frontend an "ugly API-calling machine":

| Strategy | How |
|---|---|
| **Dashboard data** | Single `GET /dashboard/summary` returns KPIs + revenue + enrollment in one payload. Cached server-side for 5 min. |
| **List pages** | Server-side pagination (`?page=1&pageSize=50`). Never fetch all students across the school at once. |
| **Class-first loading** | Grade cards and student-list modules default to Section A (`class_section_id` for Grade N-A). Admin can switch section or "All" after the first load. |
| **Attendance heatmap** | `GET /attendance/monthly/:studentId` returns pre-aggregated monthly stats, not raw records. |
| **Class-scoped loading** | Fees page: select class/section first → API only returns that class's students. |
| **Static data** | Class list, subjects, fee heads loaded once on app boot and cached in Context. |
| **React Query (future)** | `@tanstack/react-query` will handle caching, background refetch, optimistic updates. Deferred until backend is wired. |

---

## 5. Backend Architecture

### 5.1 Stack
| Layer | Technology |
|---|---|
| Language | Go 1.26 |
| Router | `net/http` ServeMux (Go 1.22+ method routing) |
| Database | PostgreSQL 15+ (RLS) |
| DB Access | sqlc (generated, type-safe) |
| Migrations | golang-migrate |
| Auth | JWT (HttpOnly cookies) + argon2id passwords |
| Cache/Sessions | Redis optional in MVP; add when rate-limits/session volume require it |
| Jobs | River (PG-backed queue) in the monolith; Lambda/EventBridge later for bursty or scheduled work |
| Storage | S3 |
| Deployment | Single EC2 + systemd for MVP; scale to ALB + multi-instance, then ECS Fargate when traffic justifies |
| Observability | OpenTelemetry + Prometheus + Loki |

### 5.2 Repository Layout
```
backend/
├── cmd/server/main.go
├── internal/
│   ├── auth/          # JWT, login, password hashing
│   ├── rbac/          # Role→Permission map (mirrors frontend)
│   ├── tenant/        # Subdomain parsing, RLS setup
│   ├── middleware/     # Request ID, logger, CORS, rate limit, audit
│   ├── handler/       # HTTP handlers per domain
│   ├── service/       # Business logic (pure, testable)
│   ├── repository/    # sqlc-generated DB access
│   ├── model/         # Domain structs
│   └── audit/         # Append-only audit writer
├── migrations/        # SQL migrations
├── queries/           # sqlc input files
└── config/            # Environment config
```

### 5.3 Authentication Flow
1. Admin creates user accounts via Settings → Roles & Permissions (or `POST /staff`)
2. Each user gets username (email) + temporary password
3. `POST /auth/login` → validates credentials → sets HttpOnly cookies (session JWT 15min + refresh 7d)
4. `GET /auth/me` → returns user + tenant + permissions → hydrates frontend AuthContext
5. For multi-tenant parents: login returns `memberships[]` → "Pick school" screen → `POST /auth/select-tenant`

### 5.4 API Design Principles
| Principle | Implementation |
|---|---|
| **Paginated everything** | Max 100 items per page. Cursor-based for infinite scroll (audit logs). |
| **Envelope format** | `{ data, meta: { page, pageSize, total } }` for lists; `{ error: { code, message } }` for errors. |
| **Aggregation endpoints** | Dashboard summary, monthly attendance stats, revenue trends — pre-computed, cached in Redis. |
| **Idempotency** | `X-Idempotency-Key` on POST mutations. Prevents duplicate payments. |
| **Bulk operations** | Attendance bulk save (up to 200 entries), marks bulk entry — single transaction. |

---

## 6. Database Architecture

### 6.1 Core Tables
```
tenants           — id, name, short_code, branding, features, plan
identities        — id, email, phone, password_hash (global, no tenant)
tenant_memberships — identity_id, tenant_id, role, scope JSONB, started_on, ended_on

class_sections    — id, tenant_id, academic_year, grade, section, class_teacher_membership_id
students          — id, tenant_id, admission_no, name, dob, gender, status
student_enrollments — id, tenant_id, student_id, academic_year, class_section_id, roll_no,
                      joined_on, left_on, status
student_guardians — id, tenant_id, student_id, membership_id, relationship
subjects          — id, tenant_id, name, code
teacher_assignments — membership_id, class_section_id, subject_id, academic_year
student_transfer_requests — source_tenant_id, destination_tenant_id, source_student_id,
                            destination_student_id, status, requested_by, approved_by
```

### 6.2 Finance Tables (Per-Student Fee Structure)
```
fee_templates         — id, tenant_id, name, grade_band (e.g. "Grade 6-8 Standard")
fee_template_heads    — id, template_id, head_name, amount, frequency, optional BOOL

student_fee_plans     — id, tenant_id, student_id, enrollment_id, academic_year, template_id
student_fee_overrides — id, plan_id, head_name, override_amount (for optional add-ons)

fee_invoices          — id, tenant_id, student_id, enrollment_id, academic_year, total, status
fee_invoice_lines     — id, invoice_id, head_name, amount
fee_payments          — id, invoice_id, amount, method, reference, paid_on

fee_carry_forwards    — id, tenant_id, student_id, from_academic_year, to_academic_year,
                       source_invoice_id, target_invoice_id, amount, status

scholarships          — id, tenant_id, student_id, type, percent, amount, status,
                        approved_by, reason
```

**Per-student fee flexibility:** A student can have a base template (tuition, lab, etc.) + optional heads (karate, music, swimming) via `student_fee_overrides`. Scholarships reduce the invoice total. Previous year dues are not stored on `student_enrollments`; they are finance ledger/carry-forward rows derived from unpaid invoices and visible in the student's Finance tab.

### 6.3 Other Module Tables
- **Attendance:** `attendance_records (student_id, enrollment_id, class_section_id, date, status)`
- **Timetable:** `timetable_slots (class_section_id, day, period, subject_id, teacher_membership_id)`
- **Exams:** `exam_terms`, `exams`, `marks (exam_id, enrollment_id, student_id)`, `report_cards`
- **Library:** `books`, `book_loans` (visible only to super_admin + school_admin)
- **Admissions:** `admission_leads` (with `stage` including 'dropped' + `drop_reason`, 'enrolled' + `enrolled_student_id`). Enrollment is an atomic transaction: validate lead → create student → create/link parent account → update lead → write audit log. See `backend-spec.md` §7.6.1.
- **Staff/HR:** `staff`, `leave_requests`
- **Audit:** `audit_logs` (append-only, partitioned monthly, archived after 13 months)

---

## 7. Security Architecture

| Layer | Measure |
|---|---|
| **Transport** | TLS 1.2+ only, HSTS 1 year |
| **Auth** | HttpOnly + Secure + SameSite=Strict cookies. No localStorage for tokens. |
| **Passwords** | argon2id (64MB, 3 iter, 2 parallel) |
| **RBAC** | Backend enforces all permissions. Frontend is UX-only gate. |
| **RLS** | PostgreSQL row-level security per tenant. App user has no cross-tenant access. |
| **Input** | Parameterized queries (sqlc). No raw SQL. |
| **Rate Limiting** | 100 req/min/IP globally. 5 login attempts/15min per email. Redis sliding window. |
| **PII** | Column-level AES-GCM encryption for address, salary, phone. Keys in KMS. |
| **Audit** | Every write logged. Append-only table. No UPDATE/DELETE grants. |
| **File Uploads** | Presigned S3 URLs — server never touches user bytes. Max 10MB, whitelist MIME. |
| **CORS** | Per-tenant subdomain whitelist. Credentials allowed. |

---

## 8. Infrastructure & Deployment

```
┌────────────────────────────────────────────────────┐
│ CDN / Static Hosting                                │
│ React build + school subdomains                     │
└───────────────────────┬────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼────────────────────────────┐
│ Go API: one modular monolith service                │
│ Single EC2 + systemd + Caddy for MVP                │
│ Start with 1 instance for one school; scale to ALB  │
│ + multi-instance when uptime/traffic requires it.   │
└───────────────┬───────────────┬────────────────────┘
                │               │
        ┌───────▼──────┐  ┌─────▼──────┐
        │ PostgreSQL   │  │ S3         │
        │ RDS/Aurora   │  │ uploads    │
        │ RLS + PITR   │  │ receipts   │
        └──────────────┘  └────────────┘
```

| Need | Add |
|---|---|
| More traffic / high availability | ALB + second EC2 instance; then ECS Fargate when ops complexity is justified |
| Too many DB connections | RDS Proxy or PgBouncer |
| Bursty report generation / scheduled jobs | Lambda + EventBridge, or separate River worker |
| Heavy caching / rate limits / distributed sessions | Redis |
| Complex orchestration across many services | ECS services first; Kubernetes only much later |

- **Artifact:** Single static Go binary (~20MB), deployed to EC2 via systemd.
- **Reverse proxy:** Caddy or Nginx on the same EC2 for TLS termination.
- **Migrations:** Run `golang-migrate` as a controlled deployment step before new app versions serve traffic.
- **Feature rollout:** `tenants.features` JSONB — toggle modules per school without redeploying.
- **Scaling path:** Single EC2 → ALB + 2 EC2 → ECS Fargate → (much later) EKS.
- **Principle:** multi-tenant data design starts on day one; multi-service infrastructure waits until traffic justifies it.

---

## 9. Scaling Considerations

| Concern | Approach |
|---|---|
| **Large student counts** | Load by `class_section_id` first. Default page size 50; max 100. Use cursor pagination for very large lists and audit logs. |
| **Grade pages** | Clicking Grade N defaults to Grade N-A. The API receives a `class_section_id`; "All sections" is an explicit user action. |
| **Huge attendance heatmaps** | Pre-aggregated monthly stats endpoint. Client receives summary, not 30 * N raw records. |
| **Timetable conflicts** | Service-layer validation (teacher can't be in two places at once). Not a DB constraint — resolved in Go with clear error messages. |
| **Fee data volume** | Per-student fee plans are denormalized at invoice creation. Invoice is the immutable record. |
| **Academic-year history** | Never overwrite grade/section on `students`; create/close `student_enrollments` rows per academic year and section move. |
| **Cross-tenant transfers** | Old tenant keeps old records. Destination tenant creates a new student record and imports only approved transfer data. |
| **Audit log volume** | Partitioned by month. Cold partitions archived to S3 after 13 months. Export endpoint supports monthly/yearly downloads. |
| **Multi-tenant DB growth** | Monitor per-tenant row counts. If any tenant exceeds 10M rows in a hot table, consider schema-per-tenant migration. |

---

## 10. MVP Scope vs Future Phases

### MVP (Phase 1)
- Login (admin creates credentials)
- Dashboard (admin-only, analytics summary)
- Students + Student Profile
- Attendance (pagination for large sections)
- Timetable (view + admin edit)
- Exams & Grades
- Fees (class/section dropdown, collect payments, send reminders)
- Fee Structure (per-student plans with optional heads)
- Scholarships
- Expenses (simplified monthly view)
- Admissions (Kanban + drop leads + enrollment confirmation with student creation + audit)
- Library (admin-only)
- Staff Directory
- Audit Logs (with monthly/yearly export)
- Settings (General + Roles & Permissions)
- ~~Analytics page~~ — removed; Dashboard is the sole analytics surface

### Deferred (Phase 2+)
- Communications (SMS, Email, WhatsApp broadcasts)
- Notice Board, Events & Calendar
- Parent Portal (read-only child view, pay online)
- Report card PDF generation + WhatsApp delivery
- Substitute teacher model
- Multi-branch group dashboard
- PWA (offline, push notifications)
- Predictive admission scoring

---

## 11. Key Design Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Single DB + RLS (not schema-per-tenant) | Simpler ops, migrations, backups. Good up to ~10M rows/table/tenant. |
| D2 | Subdomain-based tenant resolution | Clean URL per school. Wildcard DNS + middleware. |
| D3 | Admin creates account credentials | No self-registration. School admin manages memberships via Settings. |
| D4 | Per-student fee structure (not just per-grade) | Real-world: students pick optional activities. Base template + overrides. |
| D5 | Communications hidden in MVP | Requires SMS/email vendor integration. Ship CRM first, add comms later. |
| D6 | Dashboard restricted to admin roles | Teachers/accountants land on their primary page directly. |
| D7 | Separate tenants for branches | Simpler than branch-within-tenant. Group dashboard later. |
| D8 | Previous year dues tracked in finance carry-forward rows | Students may carry forward unpaid balances from prior academic years, but dues are not stored on `student_enrollments`. |
| D9 | Search bar = page navigator | With mock data, full-text search isn't possible. Role-based page nav is more useful. |
| D10 | No notification bell | No 1-1 messaging system. Audit logs serve the tracking purpose. |
| D11 | Enrollment = atomic transaction | Lead→Enrolled triggers: create student + link/create parent + audit log. All in one DB transaction. Rollback on failure. |
| D12 | No separate Analytics page | Dashboard already shows analytics for admins. Separate page was redundant. |
| D13 | Single EC2 for MVP, no Kubernetes | One modular monolith on EC2 + systemd + Caddy. Scale to ALB + multi-EC2, then ECS Fargate when traffic justifies. |
| D14 | Student current class comes from enrollment | `students` stores identity/profile within a tenant; `student_enrollments` stores year + class/section history. |
| D15 | Cross-school transfer creates a new tenant-local student | Historical data remains in the source tenant; destination receives only approved exported/imported records. |
| D16 | `net/http` ServeMux (no frameworks) | Go 1.22+ has method-based routing. No Gin, Echo, or Chi — fewer deps, easier testing. |
| D17 | `slog` for structured logging | Standard library, JSON in prod, text in dev. No logrus/zap. |
| D18 | Fee payments applied FIFO (oldest first) | Previous year dues settle before current year invoices. See `go-backend-standards.md` §9. |
| D19 | Table-driven tests + mock interfaces | Mandatory test pattern. Mock interfaces defined in `*_test.go`. See `go-backend-standards.md` §7. |

---

## 12. Open Product Decisions

1. **Transfer consent:** when a student moves between two client schools, should the source school admin approve the transfer, or should parent consent be mandatory too?
2. **Transfer depth:** should the destination school receive only a PDF/summary, or also normalized marks, attendance, and fee-clearance rows?
3. **Retention:** how many years must each school retain academic, fee, and audit history?
4. **Global student registry:** MVP avoids a global student person record. Revisit only if cross-school transfers become frequent enough to justify the privacy and consent complexity.
5. **Academic-year rollover:** confirm the exact promotion date and whether every school follows the same academic-year calendar.

---

_This document is the single source of truth for SchoolCRM's architecture. Update it when architectural decisions change._
