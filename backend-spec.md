# SchoolCRM — Backend Specification (Go)

**Status:** Draft v1 — aligned with the React frontend as of iteration 1.
**Owner:** SchoolCRM engineering.
**Stack:** Go 1.26 · `net/http` ServeMux · PostgreSQL 15+ · sqlc · golang-migrate · JWT (HttpOnly cookies) · Redis optional · S3 · Single EC2 (MVP).

**Companion docs:** `Architecture.md` (system overview), `go-backend-standards.md` (Go coding standards, testing, design patterns, fee FIFO logic).

---

## 1. Goals & Non-Goals

**Goals**
1. Secure, multi-tenant API powering the existing React SPA.
2. Strict RBAC with backend-enforced permissions (mirroring `src/lib/rbac.ts`).
3. Row-level tenant isolation in PostgreSQL.
4. Full audit trail for every write action.
5. Simple MVP operations — one modular monolith service first, horizontally scalable later.

**Non-Goals (v1)**
- Real-time websockets (polling/SSE where needed).
- Offline-first sync (PWA caches UI only).
- Embedded ML — predictive admission scoring consumes an external model endpoint.

---

## 2. High-Level Architecture

```
 ┌─────────────────┐   HTTPS   ┌──────────────────────────┐   pooled   ┌────────────┐
 │  React SPA      │  ───────▶ │  Go Modular Monolith API │  ───────▶ │ PostgreSQL │
 │  (Vite build)   │  ◀─────── │  Single EC2 (MVP)        │           │  (RLS on)  │
 └─────────────────┘  cookie   └────────────┬─────────────┘           └────────────┘
          ▲                                 │
          │ static                          ├──▶ Redis optional (rate-limit, sessions)
          │                                 ├──▶ S3 (attachments, receipts, report cards)
 ┌────────┴────────┐                        ├──▶ SMTP / SMS provider (notifications)
 │  CDN / S3       │                        └──▶ Payment Gateway (Razorpay/Stripe)
 └─────────────────┘
```

All tenants resolved by **subdomain** (`meridian.schoolcrm.app`) → mapped to `tenant_id` via middleware.
Cross-cutting middlewares (in order): `requestID → logger → recover → cors → rateLimit → tenantResolver → auth → rbac → handler`.

Kubernetes is intentionally not part of the MVP. The first production shape is one API service connected to managed PostgreSQL and S3. Lambda/EventBridge can be added later for report generation, reminders, and other bursty background work.

---

## 3. Repository Layout

```
backend/
├── cmd/
│   └── server/main.go
├── internal/
│   ├── auth/              # JWT issue/verify, login, refresh, password hash (argon2id)
│   ├── rbac/              # Role→Permission map (mirror of frontend rbac.ts)
│   ├── tenant/            # subdomain parsing, tenant resolver middleware
│   ├── middleware/        # requestID, logger, recover, cors, ratelimit, audit
│   ├── handler/           # HTTP handlers (one file per domain)
│   ├── service/           # business logic (pure, testable)
│   ├── repository/        # sqlc-generated DB access
│   ├── model/             # shared domain structs
│   ├── validator/         # struct validation using go-playground/validator
│   └── audit/             # audit-log writer
├── migrations/            # 0001_initial.up.sql, etc.
├── queries/               # sqlc input files (*.sql)
├── sqlc.yaml
├── config/                # envconfig loader
├── pkg/                   # response helpers, errors, pagination
└── go.mod
```

---

## 4. Canonical JSON Envelope

**Success**
```json
{ "data": <payload>, "meta": { "page": 1, "pageSize": 20, "total": 142 } }
```

**Error**
```json
{ "error": { "code": "FORBIDDEN", "message": "Permission denied", "details": {} } }
```

Error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE`, `RATE_LIMITED`, `INTERNAL`.

**Standard headers**
- Request: `Cookie: session=...` (HttpOnly, Secure, SameSite=Strict). Optional `X-Idempotency-Key` on POST.
- Response: `X-Request-ID`, `X-RateLimit-Remaining`.

---

## 5. Authentication

### 5.1 User Provisioning
There is **no self-registration**. The school admin creates all user accounts:
1. Admin calls `POST /memberships` with `{ email, phone?, name, role, scope? }`.
2. Backend creates or reuses a global `identity`, then creates a tenant-local `tenant_membership`.
3. Backend generates a temporary password or setup link if the identity is new.
4. On first login, user is forced to change their temporary password.
5. Parent memberships are created when a student is enrolled; parent receives credentials via SMS/email.

### 5.2 Login Flow
1. `POST /auth/login` → body `{ email, password }`
   → Backend validates against global `identities`.
   → If the identity has one active membership, backend sets cookies `session` (15 min access JWT) + `refresh` (7 d refresh JWT, also HttpOnly).
   → If the identity has multiple active memberships in this tenant (e.g. teacher + parent), response includes `memberships[]`. Frontend shows "Pick role" screen. User calls `POST /auth/select-membership` with `{ membership_id }` to finalize.
   → If the identity has memberships in multiple tenants (e.g. group admin), the login body must include `school_code` to resolve the tenant. If omitted, return `memberships[]` grouped by tenant.
2. `POST /auth/refresh` → rotates refresh token (old token revoked via Redis deny-list).
3. `POST /auth/logout` → clears both cookies and revokes refresh JTI.
4. `GET  /auth/me` → current user + permissions + tenant.

### 5.3 JWT Claims
```json
{
  "sub": "identity_uuid",
  "tenant_id": "tenant_uuid",
  "membership_id": "tenant_membership_uuid",
  "role": "school_admin",
  "scope": { "class_section_ids": [], "student_ids": [] },
  "jti": "token_id",
  "iat": 1730000000,
  "exp": 1730000900
}
```

### 5.4 Password Storage
- Algorithm: **argon2id** with memory=64MB, iterations=3, parallelism=2.
- Passwords never logged. Reset flow via time-limited one-time token sent by email.

---

## 6. RBAC (mirror of `src/lib/rbac.ts`)

### 6.1 Roles
| Role | Description |
|---|---|
| `super_admin` | Full cross-tenant access (platform ops). |
| `school_admin` | Full access within own tenant. |
| `teacher` | Own class sections only (`scope.class_section_ids`, derived from tenant assignments). |
| `accountant` | Finance domain only. |
| `admissions_officer` | Admissions domain only. |
| `parent` | Read-only for linked children (`student_guardians`, denormalized to `scope.student_ids`). |

### 6.2 Permission Matrix (excerpt — complete list lives in `internal/rbac/map.go`)

> Legend: `✔` = full (read + write where applicable); `R` = read-only; blank = denied.
> Sub-resource permissions (e.g. `students.fees.read`) gate individual **tabs/fields** on a parent resource. They let, for example, a teacher see a student's profile name & marks without seeing fees or documents.

| Permission | super | school_admin | teacher | accountant | admissions | parent |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `dashboard.read`                | ✔ | ✔ |   |   |   |   |
| `students.read`                 | ✔ | ✔ | ✔ | ✔ | ✔ |   |
| `students.write`                | ✔ | ✔ |   |   |   |   |
| `students.fees.read` (sub)      | ✔ | ✔ |   | ✔ | ✔ | R |
| `students.documents.read` (sub) | ✔ | ✔ |   | ✔ | ✔ | R |
| `students.marks.read` (sub)     | ✔ | ✔ | ✔ |   |   | R |
| `students.marks.write` (sub)    | ✔ | ✔ | ✔ (scoped) |   |   |   |
| `students.attendance.read` (sub)| ✔ | ✔ | ✔ |   |   | R |
| `admissions.*`                  | ✔ | ✔ |   |   | ✔ |   |
| `attendance.read`               | ✔ | ✔ | ✔ |   |   |   |
| `attendance.write`              | ✔ | ✔ | ✔ (scoped) |   |   |   |
| `timetable.read`                | ✔ | ✔ | ✔ |   |   |   |
| `timetable.write`               | ✔ | ✔ |   |   |   |   |
| `exams.*`                       | ✔ | ✔ | ✔ (scoped write) |   |   |   |
| `fees.read`                     | ✔ | ✔ |   | ✔ | R |   |
| `fees.write`                    | ✔ | ✔ |   | ✔ |   |   |
| `fee_structure.*`               | ✔ | ✔ |   | ✔ |   |   |
| `scholarships.*`                | ✔ | ✔ |   | ✔ |   |   |
| `expenses.*`                    | ✔ | ✔ |   | ✔ |   |   |
| `library.*`                     | ✔ | ✔ | R |   |   |   |
| `staff.*`                       | ✔ | ✔ |   |   |   |   |
| `communications.*`              | ✔ | ✔ |   |   | ✔ |   |
| `notices.*`                     | ✔ | ✔ | R |   |   | R |
| `events.*`                      | ✔ | ✔ | R |   |   | R |
| `reports.read`                  | ✔ | ✔ |   | ✔ | ✔ |   |
| `audit.read`                    | ✔ | ✔ |   |   |   |   |
| `settings.*`                    | ✔ | ✔ |   |   |   |   |
| `parent_portal.read`            |   |   |   |   |   | ✔ |

**Change log vs. previous draft:**
- Teacher **lost** `communications.*` (broadcasts remain an admin responsibility).
- Teacher `attendance.write` / `exams.write` / `students.marks.write` are **scoped** (see §6.3).
- Accountant + Admissions officer **gained** `students.fees.read` and `students.documents.read` (needed for fee collection / admission quotes).
- Admissions officer **gained** read-only `fees.read` (quote generation only — cannot collect payments; that stays with accountant).
- All roles that can see children's data gained the relevant `students.*.read` sub-resource perms.

### 6.3 Scoped Rules (Attribute-Based, beyond flat permissions)

Enforced by `authorize(user, permission, ctx)` in the service layer **and** mirrored as row-level filters in SQL queries. The frontend calls the equivalent `can(permission, ctx)`.

**Teacher scope is minted into the JWT from `tenant_memberships.scope` plus assignment tables:**
```json
{
  "class_section_ids": ["<class_section_uuid>", ...],          // sections they are class teacher of
  "assignments":       [{"class_section_id": "...", "subject": "Math"}, ...]  // subjects they teach
}
```

**Rules:**
| Permission | Rule |
|---|---|
| `attendance.write` | Teacher must have `ctx.class_section_id IN scope.class_section_ids` (is class teacher / in-charge of that section). Without a `class_section_id` in the request, deny. |
| `students.marks.write`, `exams.write` | Teacher must have `{class_section_id, subject} IN scope.assignments`. Subject-match is required; a Math teacher cannot enter English marks. |
| `parent_portal.*`, `students.*.read` (when fetching a specific student) | Parent must be linked to the student through `student_guardians`; `scope.student_ids` is a denormalized JWT convenience. |
| Accountant on `students.write` | Always denied: can **read** personal details for billing but cannot alter the student record. |
| Admissions officer on `fees.write` | Always denied: can **quote** fees (read) but cannot collect. |

### 6.4 Substitute-Teacher Model (phase 2)

When a class teacher is absent, attendance still needs to be recorded. Two backend-supported flows:

**Flow A — Admin covers (default, no new code):**
School admin already has unrestricted `attendance.write`. They take attendance for the absent teacher's class. No schema change.

**Flow B — Substitution record (planned):**
```sql
CREATE TABLE attendance_substitutions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  class_section_id UUID NOT NULL REFERENCES class_sections(id),
  substitute_teacher_membership_id UUID NOT NULL REFERENCES tenant_memberships(id),
  effective_date DATE NOT NULL,
  reason TEXT,
  created_by_membership_id UUID REFERENCES tenant_memberships(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, class_section_id, effective_date)
);
```

Authorization extension for teachers:
```
attendance.write passes if (class_section_id ∈ scope.class_section_ids)
                OR  exists(attendance_substitutions
                           WHERE substitute_teacher_membership_id = user.membership_id
                             AND class_section_id    = ctx.class_section_id
                             AND effective_date      = ctx.date)
```

API (phase-2):
| POST | `/admin/substitutions` | `staff.write` | `{ class_section_id, substitute_teacher_membership_id, effective_date, reason }` |
| DELETE | `/admin/substitutions/:id` | `staff.write` | revoke |
| GET | `/admin/substitutions?date=YYYY-MM-DD` | `staff.read` | admin dashboard list |

### 6.5 Class-Teacher & Subject-Assignment Management

These relationships are managed by the school admin via the Staff Directory UI and are enforced by §6.3.

**Tables (adds on `class_sections` + a new `teacher_assignments`):**
```sql
ALTER TABLE class_sections
  ADD COLUMN class_teacher_membership_id UUID REFERENCES tenant_memberships(id);

CREATE TABLE teacher_assignments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  teacher_membership_id UUID NOT NULL REFERENCES tenant_memberships(id),
  class_section_id UUID NOT NULL REFERENCES class_sections(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  academic_year TEXT NOT NULL,
  UNIQUE (tenant_id, teacher_membership_id, class_section_id, subject_id, academic_year)
);
CREATE INDEX ON teacher_assignments (tenant_id, teacher_membership_id);
CREATE INDEX ON teacher_assignments (tenant_id, class_section_id, subject_id);
```

`tenant_memberships.scope` is **denormalised from these tables** when the JWT is minted, so `authorize()` never needs a DB round-trip. Re-mint (rotate refresh) whenever assignments change.

API:
| PUT  | `/staff/:id/assignments` | `staff.write` | replaces the set of `{class_section_id, subject_id}` for a teacher |
| PUT  | `/classes/:id/class-teacher` | `staff.write` | `{ teacher_membership_id }` |

### 6.6 Row-Level Security (PostgreSQL)
Every tenant-scoped table has:
```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON students
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```
The connection sets `SET LOCAL app.current_tenant = '<tenant_id>'` per request.

### 6.7 Multi-School Identities, Staff Moves, and Parent Links

Real-world cases to support from day one:

1. **Multiple children in the same school** — one parent identity, one tenant membership, multiple `student_guardians` rows.
2. **Children in different schools (tenants)** — one identity, multiple tenant memberships.
3. **Teacher changes school** — one identity, old membership ended, new tenant membership created.
4. **Group admin** — one identity, school_admin memberships in multiple tenants.

Identity is split from tenant-membership:

```sql
-- Global identity (no tenant column)
identities(id UUID PK, email CITEXT UNIQUE, phone TEXT UNIQUE, password_hash, created_at)

-- Per-tenant membership — many of these per identity
tenant_memberships(
  id UUID PK,
  identity_id UUID REFERENCES identities(id),
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}',
  started_on DATE,
  ended_on DATE,
  status TEXT,
  created_at
)
```

Login flow updates:
1. `POST /auth/login` validates against `identities.password_hash`.
2. Server returns `memberships[]`. If exactly one, it issues the session JWT immediately for that tenant. Otherwise the frontend shows a **"Pick school"** screen, then `POST /auth/select-tenant` issues the JWT.
3. JWT carries `tenant_id` + `membership_id` + role + scope.

Switching schools = new token, new cookie, new `app.current_tenant` for RLS. A user never sees two schools' data mixed in one response.

**Decision:** use `identities + tenant_memberships` in v1 instead of starting with a single-tenant `users` table. It is slightly more schema work now, but avoids a painful auth migration when teachers, parents, or group admins span schools.

Parent-child access is stored relationally:
```sql
student_guardians(
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL REFERENCES students(id),
  guardian_membership_id UUID NOT NULL REFERENCES tenant_memberships(id),
  relationship TEXT,
  is_primary BOOL DEFAULT false,
  UNIQUE (tenant_id, student_id, guardian_membership_id)
)
```

---

## 7. Database Schema (PostgreSQL)

> All tables include `id UUID PK`, `tenant_id UUID NOT NULL`, `created_at`, `updated_at`, `deleted_at` (soft delete). Foreign keys omitted from the narrative for brevity — see migrations.

### 7.1 Core

```sql
-- Tenants, global identities, and per-school memberships
tenants(id, name, short_code UNIQUE, logo_url, primary_color, accent_color,
        locale, currency, timezone, academic_year, features JSONB, plan TEXT)

identities(id, email CITEXT UNIQUE, phone TEXT UNIQUE, password_hash, name,
           avatar_url, email_verified_at, phone_verified_at, last_login_at)

tenant_memberships(id, identity_id FK identities, tenant_id FK tenants,
                   role TEXT, scope JSONB, status TEXT,
                   started_on DATE, ended_on DATE,
                   UNIQUE(identity_id, tenant_id, role, started_on))

-- Academics
class_sections(id, tenant_id, academic_year TEXT, grade INT, section TEXT,
               class_teacher_membership_id FK tenant_memberships,
               UNIQUE(tenant_id, academic_year, grade, section))

students(id, tenant_id, admission_no UNIQUE_PER_TENANT, name, dob, gender,
         status TEXT CHECK (status IN ('active','alumni','withdrawn')),
         phone, emergency_phone, address JSONB, photo_url)

student_enrollments(
  id, tenant_id,
  student_id FK students, class_section_id FK class_sections,
  academic_year TEXT, roll_no INT,
  joined_on DATE, left_on DATE,
  status TEXT CHECK (status IN ('active','promoted','transferred','withdrawn','completed')),
  promotion_source_enrollment_id FK student_enrollments,
  UNIQUE (tenant_id, student_id, academic_year, class_section_id, joined_on)
)
-- At most one active enrollment per student per tenant at a time, enforced with a partial unique index.
```

`students` does **not** store current grade, section, or roll number. Current placement is derived from the active `student_enrollments` row. Historical class placement is preserved by keeping old enrollment rows instead of overwriting them.

### 7.2 Attendance

```sql
attendance_records(
  id, tenant_id,
  student_id FK students,
  enrollment_id FK student_enrollments,
  class_section_id FK class_sections,
  date DATE, status TEXT CHECK (status IN ('present','absent','late','leave')),
  note TEXT, marked_by_membership_id FK tenant_memberships, marked_at TIMESTAMPTZ,
  UNIQUE (tenant_id, student_id, date)
)
CREATE INDEX ON attendance_records (tenant_id, class_section_id, date);
CREATE INDEX ON attendance_records (tenant_id, enrollment_id, date);
```

### 7.3 Timetable

```sql
subjects(id, tenant_id, name, code UNIQUE_PER_TENANT)
timetable_slots(
  id, tenant_id, class_section_id FK class_sections,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  period_index SMALLINT, subject_id FK subjects,
  teacher_membership_id FK tenant_memberships,
  UNIQUE (tenant_id, class_section_id, day_of_week, period_index)
)
-- Conflict check: teacher cannot appear twice in same (day, period) across classes — enforced in service.
```

### 7.4 Exams & Grades

```sql
exam_terms(id, tenant_id, academic_year TEXT, name, starts_on, ends_on)
exams(id, tenant_id, term_id FK, class_section_id FK, subject_id FK, exam_date, max_marks)
marks(id, tenant_id, exam_id FK, student_id FK students,
      enrollment_id FK student_enrollments, marks NUMERIC(5,2),
      remarks TEXT, UNIQUE (exam_id, student_id))
-- Report cards generated on demand: SELECT aggregates joined by (term, student)
report_cards(id, tenant_id, student_id, term_id, pdf_url, generated_at)
```

### 7.5 Fees (Per-Student Fee Structure)

> Fee flexibility: each student can have a base template (tuition, lab, transport) plus optional add-on heads (karate, music, swimming). Scholarships reduce the invoice total. Previous-year dues are tracked as finance carry-forward rows, not on `student_enrollments`.

```sql
-- Fee templates: one per grade band, defines the base fee heads
fee_templates(id, tenant_id, name TEXT, grade_band TEXT, academic_year TEXT,
              UNIQUE (tenant_id, grade_band, academic_year))
fee_template_heads(id, template_id FK, head_name TEXT, amount NUMERIC(12,2),
                   frequency TEXT CHECK (frequency IN ('Annual','Quarterly','Monthly','One-time')),
                   optional BOOL DEFAULT false)  -- optional heads (swimming, karate, etc.)

-- Per-student fee plan: links a student/year enrollment to a template + overrides
student_fee_plans(id, tenant_id, student_id FK, enrollment_id FK student_enrollments,
                  academic_year TEXT, template_id FK,
                  UNIQUE (tenant_id, student_id, academic_year))
student_fee_overrides(id, plan_id FK, head_name TEXT, override_amount NUMERIC(12,2),
                      included BOOL DEFAULT true)  -- true = student opted in; false = opted out

-- Previous-year outstanding dues (derived from unpaid invoices during rollover)
fee_carry_forwards(id, tenant_id, student_id FK,
                   from_academic_year TEXT, to_academic_year TEXT,
                   source_invoice_id FK fee_invoices,
                   target_invoice_id FK fee_invoices,
                   amount NUMERIC(12,2),
                   status TEXT CHECK (status IN ('open','invoiced','settled','waived')),
                   notes TEXT,
                   UNIQUE (tenant_id, student_id, from_academic_year, to_academic_year))

-- Invoices, payments, receipts
fee_invoices(id, tenant_id, student_id FK, enrollment_id FK student_enrollments,
             academic_year TEXT, total NUMERIC,
             due_on DATE, status TEXT CHECK (status IN ('pending','partial','paid','overdue','cancelled')),
             includes_previous_dues BOOL DEFAULT false)

fee_invoice_lines(id, invoice_id FK, head_name TEXT, amount NUMERIC)

fee_payments(id, tenant_id, invoice_id FK, amount NUMERIC, method TEXT,
             reference TEXT, paid_on TIMESTAMPTZ, received_by_membership_id FK tenant_memberships,
             receipt_url TEXT)

-- Scholarships & concessions
scholarships(id, tenant_id, student_id FK, type TEXT, percent NUMERIC(5,2),
             amount NUMERIC, status TEXT CHECK (status IN ('pending','approved','rejected')),
             approved_by_membership_id FK tenant_memberships, approved_at, reason TEXT,
             applied_to_heads TEXT[])  -- which fee heads the concession applies to

-- Expenses (simplified — no monthly budget, just category + tracking)
expense_categories(id, tenant_id, name TEXT)
expenses(id, tenant_id, category_id FK, vendor TEXT, amount NUMERIC,
         paid_by TEXT, incurred_on DATE, invoice_url TEXT, recorded_by_membership_id FK tenant_memberships)
```

At year-end, unpaid invoice balances remain on their original invoices. The rollover job creates `fee_carry_forwards` rows and, when the next year's invoices are generated, adds a "Previous Year Due" invoice line to the new year's invoice. This keeps the original debt auditable while still showing the amount in the current year's Fees screen.

### 7.6 Admissions

```sql
admission_leads(
  id, tenant_id, parent_name, parent_phone, parent_email, student_name,
  grade_applying_for INT, source TEXT, strength SMALLINT CHECK (strength BETWEEN 1 AND 5),
  stage TEXT CHECK (stage IN ('inquiry','application','visit','test','enrolled','dropped')),
  drop_reason TEXT,          -- populated when stage = 'dropped'
  dropped_at TIMESTAMPTZ,    -- when the lead was dropped
  assigned_to_membership_id FK tenant_memberships, last_contacted_at TIMESTAMPTZ, notes TEXT
)
```

#### 7.6.1 Enrollment Flow (Lead → Student Conversion)

When an admission lead is moved to **enrolled**, the backend performs an **atomic transaction**:

1. **Validate** — lead must exist and `stage != 'enrolled'` and `stage != 'dropped'`.
2. **Create student record** — insert into `students` table using data from the lead + enrollment form fields.
3. **Create student enrollment** — insert into `student_enrollments` for `{ academic_year, class_section_id, roll_no }`.
4. **Create parent account/link** (if needed) — look up `identities` by `parent_phone`/`parent_email`. If not found, create identity + `tenant_membership` with `role = 'parent'`. Link parent to child through `student_guardians`.
5. **Update lead** — set `stage = 'enrolled'`, `enrolled_at = NOW()`, `enrolled_student_id = new_student_id`.
6. **Write audit log** — append to `audit_logs`:
   ```json
   {
     "action": "enrollment.create",
     "actor_membership_id": "<tenant_membership_id>",
     "resource_type": "admission_lead",
     "resource_id": "<lead_id>",
     "detail": "Enrolled Simran Kaur (ADM-001234) into Grade 9-A",
     "metadata": { "student_id": "<new_student_id>", "admission_no": "ADM-001234" }
   }
   ```
7. **Optional** — trigger background job: send parent welcome SMS/email with login credentials.

**API Endpoint:**
```
POST /admissions/:leadId/enroll
Body: { admission_no, class_section_id, roll_no?, parent_email? }
Response: { data: { student_id, enrollment_id, admission_no, lead_id }, audit_id }
Permissions: admissions.write
```

All database writes happen in a single transaction. If any step fails, the entire enrollment is rolled back and a clear error is returned.

**Additional columns on `admission_leads`:**
```sql
ALTER TABLE admission_leads ADD COLUMN enrolled_at TIMESTAMPTZ;
ALTER TABLE admission_leads ADD COLUMN enrolled_student_id UUID REFERENCES students(id);
```

### 7.7 Library

```sql
books(id, tenant_id, title, author, isbn, category, total INT, available INT)
book_loans(id, tenant_id, book_id FK, student_id FK, issued_at, due_at,
           returned_at NULL, UNIQUE (book_id, student_id) WHERE returned_at IS NULL)
```

### 7.8 Staff / HR

```sql
staff(id, tenant_id, membership_id FK tenant_memberships, department TEXT, designation TEXT,
      phone, joined_on DATE, leave_balance SMALLINT, salary NUMERIC(12,2) ENCRYPTED)
leave_requests(id, tenant_id, staff_id FK, start_date, end_date, reason TEXT,
               status TEXT CHECK (status IN ('pending','approved','rejected')),
               approved_by_membership_id FK tenant_memberships)
```

### 7.9 Communications

```sql
notices(id, tenant_id, title, body TEXT, audience TEXT, attachment_url,
        posted_by_membership_id FK tenant_memberships, pinned BOOL, published_at TIMESTAMPTZ)
notice_reads(notice_id FK, membership_id FK tenant_memberships, read_at, PRIMARY KEY (notice_id, membership_id))

events(id, tenant_id, date DATE, time TIME, title, type TEXT
       CHECK (type IN ('Event','Holiday','Exam','PTM')), location, description)

broadcasts(id, tenant_id, channel TEXT CHECK (channel IN ('sms','email','push','whatsapp')),
           subject, body, audience_filter JSONB, scheduled_at, sent_at,
           sent_count INT, failed_count INT, open_count INT)
```

### 7.10 Audit (append-only)

```sql
audit_logs(
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  actor_identity_id UUID, actor_membership_id UUID, actor_role TEXT,
  action TEXT CHECK (action IN ('create','update','delete','login','logout','export')),
  resource TEXT,         -- e.g. "fee_invoice"
  resource_id UUID,
  diff JSONB,            -- before/after snapshots for updates
  ip INET, user_agent TEXT, request_id UUID
);
-- Grants: only INSERT for application user; no UPDATE/DELETE.
-- Archival: partitioned by month; cold partitions moved to object storage after 13 months.
```

### 7.11 Academic Year Rollover

The rollover process creates the next year's enrollment records and finance carry-forwards without mutating historical records.

```sql
academic_year_rollovers(
  id, tenant_id, from_academic_year TEXT, to_academic_year TEXT,
  status TEXT CHECK (status IN ('draft','running','completed','failed')),
  started_by_membership_id FK tenant_memberships,
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, summary JSONB
)
```

Process:
1. Create next-year `class_sections`.
2. For each active student, create a next-year `student_enrollments` row with `promotion_source_enrollment_id`.
3. Mark final-year students as `completed` or `alumni` instead of promoting.
4. Calculate unpaid invoice balances and create `fee_carry_forwards`.
5. Generate next-year fee plans/invoices when the admin confirms the new fee structure.
6. Write audit logs for promotion, carry-forward, and invoice creation.

### 7.12 Student Transfers Between Client Schools

Cross-tenant transfer does **not** move the existing `students` row. The destination tenant creates its own tenant-local student record and enrollment. The source tenant keeps all historical attendance, marks, fees, documents, and audit records.

```sql
student_transfer_requests(
  id UUID PRIMARY KEY,
  source_tenant_id UUID NOT NULL REFERENCES tenants(id),
  destination_tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_student_id UUID NOT NULL,
  destination_student_id UUID,
  requested_by_membership_id UUID REFERENCES tenant_memberships(id),
  approved_by_source_membership_id UUID REFERENCES tenant_memberships(id),
  parent_consent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('requested','approved','rejected','imported','cancelled')),
  transfer_summary_url TEXT,
  normalized_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ
)
```

The destination school can import an approved PDF/summary and selected normalized fields. It cannot directly query the source tenant's tables. This preserves tenant isolation while still supporting real-world transfers.

---

## 8. REST API

All routes prefixed `/api/v1`. Unless stated otherwise: cookie auth required; responses wrapped in the envelope from §4; list endpoints accept `?page`, `?pageSize` (default 50, max 100), `?search`, `?sort`. Large screens load by `class_section_id` first; school-wide lists are always paginated.

### 8.1 Auth
| Method | Path | Perm | Body / Query | Response |
|---|---|---|---|---|
| POST | `/auth/login`   | — | `{ email, password }` | sets cookies; returns `{ identity, membership, tenant, permissions[] }` or `memberships[]` picker |
| POST | `/auth/refresh` | — | — | rotates cookies |
| POST | `/auth/logout`  | — | — | 204 |
| GET  | `/auth/me`      | any | — | `{ identity, membership, tenant, permissions[] }` |
| POST | `/auth/password/forgot` | — | `{ email }` | 202 |
| POST | `/auth/password/reset`  | — | `{ token, new_password }` | 204 |

### 8.2 Tenants / Settings
| GET | `/tenant` | `settings.read` |
| PATCH | `/tenant` | `settings.write` |
| GET | `/tenant/features` | any |

### 8.2.1 Academic Setup
| GET | `/academic-years` | any | active + historical years |
| GET | `/class-sections` | any | `?academic_year=2026-2027&grade=1` returns sections + student counts |
| POST | `/academic-years/:year/rollover` | `settings.write` | creates next-year enrollments + fee carry-forwards |

### 8.3 Students
| GET    | `/students` | `students.read` | `?class_section_id=&grade=&section=A&status=&page=&pageSize=` |
| POST   | `/students` | `students.write` | see body below — admits student, creates/links parent, optionally issues first invoice |
| GET    | `/students/:id` | `students.read` |
| PATCH  | `/students/:id` | `students.write` |
| DELETE | `/students/:id` | `students.write` (soft-delete) |
| GET    | `/students/:id/enrollments` | `students.read` | year/class/section history |
| GET    | `/students/:id/report-cards` | `students.read` OR `parent_portal.read` (self) |

When the UI opens Grade N, it first calls `/class-sections?grade=N&academic_year=current`, selects Section A by default, then calls `/students?class_section_id=<grade-n-a-id>&page=1&pageSize=50`.

**POST `/students` request body:**
```json
{
  "name": "Rahul Kumar",
  "dob": "2010-08-15",
  "gender": "Male",
  "class_section_id": "class_section_uuid",
  "roll_no": 15,
  "admission_no": "STU2026-0042",          // optional — server auto-generates if omitted
  "address": { "line1": "...", "city": "...", "state": "...", "pincode": "..." },

  "parent": {                               // created/linked through identity + tenant membership if email/phone match
    "name": "Mr. Vijay Kumar",
    "phone": "+919876543210",
    "email": "vijay@example.com",
    "link_to_existing": true                // if true and an identity with this email/phone exists → reuse; else create
  },

  "generate_invoice": true,                 // if true → create fee_invoice using the student's fee plan for current academic_year
  "admission_fee_paid": 5000                // optional — if > 0, records a fee_payment against the generated invoice
}
```

**Behaviour (atomic transaction):**
1. Insert `students` row (soft-fails on duplicate `admission_no`).
2. Insert active `student_enrollments` row for `class_section_id`.
3. Resolve parent: look up existing `identities` by `email` or normalised `phone`. If none and `parent.link_to_existing` is true, create identity + parent `tenant_membership`. Link the parent to the child through `student_guardians`.
4. If `generate_invoice`, compose a `fee_invoice` from the student's fee plan for the current academic year.
5. If `admission_fee_paid > 0`, insert a `fee_payment` and emit a receipt PDF.
6. Emit `audit_logs` entries for each of the above (create student, create enrollment, create/link parent, create invoice, create payment).

**Response 201:**
```json
{ "data": { "student": {...}, "enrollment": {...}, "parent": {...}, "invoice": {...}, "receipt_url": "s3://..." } }
```

**Errors:** `CONFLICT` on duplicate admission_no; `UNPROCESSABLE` if grade has no fee structure and `generate_invoice=true`.

### 8.4 Admissions
| GET   | `/admissions/leads`       | `admissions.read`  | `?stage=&grade=` |
| POST  | `/admissions/leads`       | `admissions.write` |
| PATCH | `/admissions/leads/:id`   | `admissions.write` | includes `stage` transitions |
| POST  | `/admissions/leads/:id/enroll` | `admissions.write` | creates `student`, `student_enrollment`, guardian link, optional fee invoice |

### 8.5 Attendance
| GET  | `/attendance` | `attendance.read`  | `?class_section_id=&date=&page=&pageSize=` |
| POST | `/attendance/bulk` | `attendance.write` | `{ class_section_id, date, entries: [{student_id, enrollment_id, status, note}] }` idempotent via `date+class_section_id` |
| GET  | `/attendance/monthly/:student_id` | `attendance.read` OR `parent_portal.read` |

### 8.6 Timetable
| GET  | `/timetable/:class_section_id`                | `timetable.read` |
| PUT  | `/timetable/:class_section_id`                | `timetable.write` | full grid replace; 409 on conflicts |

### 8.7 Exams & Grades
| GET  | `/exams`                       | `exams.read` | `?term_id=&class_section_id=` |
| POST | `/exams`                       | `exams.write` |
| POST | `/exams/:id/marks`             | `exams.write` | `{ entries: [{student_id, marks, remarks}] }` |
| POST | `/report-cards/generate`       | `exams.write` | `{ term_id, class_section_id? }` — async job, returns `job_id` |
| GET  | `/report-cards/:student_id/:term_id` | `exams.read` OR self-parent | returns presigned PDF URL |

### 8.8 Library
| GET    | `/library/books` | `library.read` | `?q=&category=` |
| POST   | `/library/books` | `library.write` |
| PATCH  | `/library/books/:id` | `library.write` |
| POST   | `/library/loans/issue` | `library.write` | `{ book_id, student_id, due_at }` |
| POST   | `/library/loans/:id/return` | `library.write` |
| GET    | `/library/loans` | `library.read` | `?overdue=true` |

### 8.9 Fees
| GET   | `/fees/structure`          | `fee_structure.read` |
| PUT   | `/fees/structure`          | `fee_structure.write` | replaces all heads |
| GET   | `/fees/accounts`           | `fees.read` | `?class_section_id=&status=&page=&pageSize=` returns Fees table rows |
| GET   | `/fees/invoices`           | `fees.read` | `?status=&student_id=&academic_year=` |
| POST  | `/fees/invoices`           | `fees.write` | generate for student/class |
| GET   | `/fees/invoices/:id`       | `fees.read` |
| POST  | `/fees/invoices/:id/pay`   | `fees.write` | `{ amount, method, reference }` — issues receipt (PDF URL) |
| POST  | `/fees/invoices/:id/remind`| `fees.write` | sends SMS/email to parent |
| GET   | `/fees/payments/:id/receipt.pdf` | `fees.read` OR self-parent |

### 8.10 Scholarships
| GET   | `/scholarships`          | `scholarships.read` |
| POST  | `/scholarships`          | `scholarships.write` |
| POST  | `/scholarships/:id/approve` | `scholarships.write` |
| POST  | `/scholarships/:id/reject`  | `scholarships.write` |

### 8.11 Expenses
| GET   | `/expenses`            | `expenses.read`  | `?category=&from=&to=` |
| POST  | `/expenses`            | `expenses.write` |
| GET   | `/expenses/summary`    | `expenses.read`  | monthly budget vs actual |

### 8.12 Staff / HR
| GET   | `/staff`               | `staff.read` | `?department=` |
| POST  | `/staff`               | `staff.write` |
| PATCH | `/staff/:id`           | `staff.write` |
| POST  | `/staff/:id/leave`     | `staff.read`  | (self-request) |
| POST  | `/leave/:id/approve`   | `staff.write` |

### 8.13 Communications
| POST  | `/broadcasts`         | `communications.write` | `{ channel, audience_filter, subject, body, scheduled_at? }` |
| GET   | `/broadcasts`         | `communications.read`  |
| GET   | `/broadcasts/:id`     | `communications.read`  | delivery analytics |

### 8.14 Notices
| GET   | `/notices`                | `notices.read` |
| POST  | `/notices`                | `notices.write` |
| POST  | `/notices/:id/read`       | any | mark current user as having read it |

### 8.15 Events
| GET   | `/events`            | `events.read` | `?from=&to=` |
| POST  | `/events`            | `events.write` |
| PATCH | `/events/:id`        | `events.write` |

### 8.16 Reports
| GET | `/reports/enrollment-yoy` | `reports.read` |
| GET | `/reports/revenue-trend`  | `reports.read` |
| GET | `/reports/grade-distribution` | `reports.read` |
| GET | `/reports/subject-performance` | `reports.read` |
| GET | `/reports/export?type=…`  | `reports.read` | returns async job + S3 presigned URL |

### 8.17 Audit
| GET | `/audit-logs` | `audit.read` | `?actor=&resource=&action=&from=&to=` — read-only |

### 8.18 Parent Portal
| GET | `/portal/children`             | `parent_portal.read` |
| GET | `/portal/children/:id/summary` | `parent_portal.read` |
| GET | `/portal/children/:id/timeline`| `parent_portal.read` |

### 8.19 Transfers
| POST | `/transfers/students` | `students.write` | destination requests transfer from another tenant |
| GET  | `/transfers/students` | `students.read` | list incoming/outgoing transfer requests |
| POST | `/transfers/students/:id/approve` | `students.write` | source school approves export |
| POST | `/transfers/students/:id/import` | `students.write` | destination creates/imports approved summary |

### 8.20 Files / Attachments
| POST | `/files/presign-upload` | any write perm | `{ mime, size }` → returns presigned S3 PUT URL |
| GET  | `/files/:key` | scoped | returns presigned GET URL (5-min TTL) |

---

## 9. Validation Rules (selection)

- Email RFC 5322 + lowercased before store.
- Phone: E.164 or 10-digit Indian mobile normalized to `+91XXXXXXXXXX`.
- Money amounts: `NUMERIC(12,2)`, server rejects fractions beyond 2 decimals.
- File uploads: max 10 MB per attachment, whitelist MIME: `image/jpeg,image/png,application/pdf`.
- Bulk endpoints (attendance, marks): max 200 entries per request.

---

## 10. Security & Compliance

### 10.1 Transport
- TLS 1.2+ only. HSTS 1 year. Cert via ACME/Let's Encrypt or cloud provider.

### 10.2 Cookies
```
Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

### 10.3 CORS
Whitelist exact origins per tenant subdomain. `Access-Control-Allow-Credentials: true`.

### 10.4 Rate Limiting
- Global: 100 req/min per IP.
- Login: 5 attempts per (IP + email) per 15 min, then lockout.
- Bulk writes: 30/min per user.
- Implementation: Redis sliding window.

### 10.5 Security Headers (applied globally)
```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 10.6 Input Hardening
- Parameterized queries only (sqlc enforces).
- Output escaping handled by React on the client; server never emits raw HTML.
- File uploads streamed to S3 via presigned URL — origin server never touches user bytes.

### 10.7 PII & Encryption
- **At rest:** PG encryption at rest (cloud default) + column-level app encryption (AES-GCM) for: `students.address`, `staff.salary`, `identities.phone` (if sensitive tenants require). Keys in KMS.
- **In logs:** structured logs scrub `password`, `token`, `ssn`, `aadhaar`, `card_number`, `cvv`.

### 10.8 Backups & DR
- Point-in-time WAL archive + daily base backups, 30-day retention.
- Quarterly disaster-recovery drill — restore to staging from last week's backup.

### 10.9 Compliance
- **GDPR / India DPDP Act:** data-subject export (`GET /me/data-export`) + erase (`POST /me/erasure`) — erasure replaces PII with tombstone; student academic records kept by law for 7 years.
- **Audit retention:** 7 years (legal minimum for educational institutions).
- **Payment data:** never stored. Gateway tokens only. PCI-DSS scope minimized to SAQ-A.

---

## 11. Observability

- **Logs:** `log/slog` with JSON handler in production, text handler in dev. Shipped to Loki/ELK. Mandatory fields: `ts, level, request_id, tenant_id, identity_id, membership_id, method, path, status, latency_ms`. Never log passwords, tokens, PII.
- **Metrics:** Prometheus — RED (Rate/Errors/Duration) per route, DB pool stats, Redis ops.
- **Tracing:** OpenTelemetry, propagated from frontend via `traceparent` header.
- **Alerts:** 5xx rate > 1% for 5 min; login failures > 50/min (possible attack); DB replication lag > 30s.

---

## 12. Background Jobs

Queue: **River** (Go-native, Postgres-backed). No external broker needed at our scale.

| Job | Trigger | SLA |
|---|---|---|
| `send_broadcast` | POST /broadcasts | < 30s/100 recipients |
| `generate_report_cards` | POST /report-cards/generate | < 5 min / class |
| `aggregate_reports_cache` | nightly 02:00 tenant TZ | — |
| `academic_year_rollover` | POST /academic-years/:year/rollover | depends on tenant size |
| `overdue_fee_reminders` | cron `0 9 * * *` | — |
| `library_overdue_notices` | cron daily | — |
| `archive_audit_logs`      | monthly | — |

---

## 13. Environment Configuration

```env
# App
APP_ENV=production
APP_PORT=8080
APP_BASE_URL=https://api.schoolcrm.app

# Database
DATABASE_URL=postgres://...sslmode=require
DATABASE_MAX_CONNS=25

# Redis
REDIS_URL=rediss://...

# Auth
JWT_ACCESS_SECRET=...      # rotate quarterly
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h

# Storage
S3_ENDPOINT=...
S3_BUCKET=schoolcrm-files
S3_REGION=ap-south-1

# Outbound
SMTP_URL=...
TWILIO_SID=...; TWILIO_TOKEN=...
RAZORPAY_KEY=...; RAZORPAY_SECRET=...

# KMS
KMS_KEY_ID=...

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=...
```

All secrets injected via vault/SSM, never baked into images.

---

## 14. Testing Strategy

| Layer | Tooling | Coverage Target |
|---|---|---|
| Unit (service) | `testing` + `testify` — **table-driven tests mandatory** | ≥ 80% |
| Repository | Ephemeral Postgres via `testcontainers-go` | critical queries only |
| API integration | `net/http/httptest` + golden files | every endpoint happy + 1 error path |
| Load | k6 | 500 RPS baseline |
| Security | `gosec`, `trivy`, dependency audit | zero criticals on main |

**Test patterns:** All tests use table-driven structure. Mock interfaces for unit tests (define in `*_test.go` files). See `go-backend-standards.md` §7 for full examples.

---

## 15. Deployment

- **Artifact:** single static Go binary (~20 MB).
- **MVP deployment:** Single EC2 instance (e.g. `t3.medium`) + Caddy/Nginx reverse proxy + systemd.
- **Scaling path:** Single EC2 → ALB + 2 EC2 → ECS Fargate → (much later) EKS. No Kubernetes in MVP.
- **Zero-downtime:** Blue-green via systemd restart; ALB health checks when scaling to multi-instance. Readiness probe `/healthz/ready` gates DB ping + migration check.
- **Migrations:** run via `golang-migrate` as a controlled deployment step **before** new app versions serve traffic.
- **Feature rollout:** tenant-level feature flags in `tenants.features` JSONB — no code deploy needed to enable a module for a school.
- **Future serverless:** Lambda/EventBridge can handle scheduled reminders, report-card generation, or import/export jobs without converting the main API to Lambda.

---

## 16. Open Questions (resolve before v1 code-complete)

1. **Sub-tenancy at URL or header level?** Current plan: subdomain. Confirm before DNS/ACM work.
2. **Single DB with RLS vs. schema-per-tenant?** RLS picked for operational simplicity; revisit if any tenant exceeds ~10M rows per large table.
3. **Payment gateway:** Razorpay (India) + Stripe (international) — finalize by Phase 2.
4. **SMS vendor:** Twilio vs. MSG91 (India cost). Decide when broadcast traffic estimated.
5. **Report-card PDF engine:** `gofpdf` (pure Go, simple) vs. `gotenberg` (Chromium → HTML/CSS identical to web). Recommend gotenberg for design fidelity.
6. **Predictive admission scoring:** in-house XGBoost vs. third-party. Scope in Phase 4.
7. **Transfer consent:** source school approval only, or source school + parent consent?
8. **Transfer payload:** PDF/summary only, or normalized marks/attendance/fee-clearance import?
9. **Retention period:** confirm legal/business retention for academic, finance, and audit records.
10. **Global student registry:** MVP avoids it. Revisit only if cross-client transfers become common enough to justify the privacy/consent complexity.

---

## 17. Frontend ↔ Backend Contract Mapping

| Frontend file | Backend counterpart |
|---|---|
| `src/lib/types.ts` | Models in `internal/model/` — keep field names identical. |
| `src/lib/rbac.ts` | `internal/rbac/map.go` — mechanical mirror; CI check diffs them. |
| `src/lib/api/client.ts` | Single base URL, envelope shape §4. |
| `src/lib/auth/AuthContext.tsx` | `/auth/me` hydrates this; mock user removed when backend lands. |
| `src/lib/tenant/TenantContext.tsx` | `/auth/me` returns `tenant{}` or `/tenant` endpoint. |
| `src/app/components/nav-config.ts` | Permission keys must match the backend RBAC map exactly. |

A CI job (`make check-contract`) will diff the frontend permission union vs. the Go map and fail on drift.

---

## 18. Milestones

| Phase | Deliverable | Duration |
|---|---|---|
| **B0** | Repo scaffold, auth (login/refresh/me), tenant middleware, RLS-enabled DB, one end-to-end endpoint (`/students`). | 2 weeks |
| **B1** | Academic modules: attendance, timetable, exams, library. | 3 weeks |
| **B2** | Finance: fee structure, invoices, payments, scholarships, expenses, receipts. | 3 weeks |
| **B3** | Communication: notices, events, broadcasts (SMS/email). | 2 weeks |
| **B4** | Reports, Audit, Parent Portal. | 2 weeks |
| **B5** | Hardening: rate limits, OpenTelemetry, DR drill, load test, pen-test. | 2 weeks |

**Total:** ~14 weeks to v1 GA.

---

_Last updated: iteration 1 draft — aligned with the frontend shipped today._
