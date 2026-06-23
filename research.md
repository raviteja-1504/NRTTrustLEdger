# SchoolCRM — Research & Decisions Log

This file records **every architectural or library decision** made while implementing the Planned Improvements roadmap. Each entry includes: **what** we did, **why**, and **trade-offs**.

---

## Core Principles

1. **Multi-tenant by design** — All data, branding, and config are scoped to a `tenantId` (school). The same codebase serves many schools.
2. **RBAC everywhere** — Every route, component, and (eventually) API endpoint is gated by role + permission. Frontend gates are UX-only; the Go backend is the source of truth.
3. **Contract-first** — UI consumes a typed `services/` layer. Swapping mock data for real API calls is a one-file change per domain.
4. **Extensible** — New modules drop into `src/app/pages/<Module>.tsx` + one entry in `routes.tsx` + one entry in the RBAC permission map. No other code changes needed.
5. **Design system first** — All colors, radii, spacing flow from CSS variables in `theme.css`. Dark mode toggles the same variables.

---

## Tech Stack Decisions

### Already present (kept)
| Library | Role | Reason |
|---|---|---|
| React 18 + TypeScript + Vite 6 | SPA core | Fastest dev DX, strict types |
| React Router v7 | Routing | Nested layouts, type-safe loaders available when we migrate to data APIs |
| Tailwind CSS v4 | Styling | Utility-first, zero runtime, matches theme CSS variables |
| shadcn/ui (Radix) | Component primitives | Accessible, headless, owned source |
| Recharts | Charts | Declarative, composable, good enough for CRM analytics |
| Motion (Framer Motion) | Animations | Smooth page transitions, staggered lists |
| React DnD | Drag & drop | Admissions Kanban + Timetable builder |
| date-fns | Date utils | Tree-shakeable, immutable |
| Sonner | Toasts | Tiny, themeable |
| **next-themes** | Dark mode | Already installed; SSR-safe, class-based toggling via `.dark` |

### Added in this iteration
| Library | Role | Reason |
|---|---|---|
| — (none yet) | — | We use built-ins only for foundation. Evaluating `@tanstack/react-query` when backend lands (it will own caching/retry/invalidation — today we don't need it with mock data). |

### Deferred (documented for later)
- **`@tanstack/react-query`** — Add when wiring Go API. Handles caching, retries, optimistic updates.
- **`zod`** — Runtime validation for API responses + form schemas. Add with backend.
- **`react-hook-form` + `zod` resolver** — Already have RHF; pair with zod on backend integration.
- **`jspdf` / `@react-pdf/renderer`** — Receipt/report card PDF generation. Add when implementing printable docs.
- **`@fullcalendar/react`** — Events calendar. Evaluating vs. a custom grid built on `date-fns`. Decision in Events module section.

---

## Folder Structure (new)

```
src/
├── lib/                      # Framework-agnostic core (no React-Router deps)
│   ├── types.ts              # User, Role, Permission, Tenant, domain models
│   ├── rbac.ts               # Role→Permission map, hasPermission()
│   ├── auth/
│   │   ├── AuthContext.tsx   # currentUser, login/logout, mocked until backend
│   │   ├── Can.tsx           # <Can permission="fees.write">...</Can>
│   │   └── ProtectedRoute.tsx
│   ├── tenant/
│   │   └── TenantContext.tsx # School branding (name, logo, colors, locale)
│   ├── theme/
│   │   └── ThemeProvider.tsx # next-themes wrapper
│   └── api/
│       └── client.ts         # fetch wrapper, auth header injection, error norm.
├── app/
│   ├── components/
│   │   ├── Layout.tsx        # Sidebar, topbar, user menu, theme toggle
│   │   ├── PageHeader.tsx    # Reusable title/breadcrumb/action header
│   │   ├── BentoCard.tsx     # (existing)
│   │   └── ui/               # shadcn primitives (existing)
│   └── pages/                # One file per feature module
└── styles/                   # (existing)
```

---

## Decision Log

### D1 — Auth state container: React Context (not Zustand/Redux)
- **Why:** Auth changes rarely; Context re-render cost is negligible. Zero new deps.
- **Trade-off:** If we later need cross-slice state (notifications, cart-like flows), we can adopt Zustand for those specific slices without refactoring auth.

### D2 — RBAC shape: flat string permissions (`"fees.write"`), role→permission map
- **Why:** Human-readable in code, easy to log, easy to mirror in Go backend (`map[Role][]string`).
- **Trade-off:** No attribute-based (ABAC) rules yet (e.g., "teacher can see only their own class"). For those cases, the backend enforces row-level scoping; frontend just hides the nav entry.

### D3 — Multi-tenant: single codebase, `TenantContext` provides theme + config
- **Why:** One deploy, N schools. Tenant derived from subdomain (`acme.schoolcrm.app`) or JWT claim in production. Mocked as `defaultTenant` for now.
- **Trade-off:** Custom per-tenant feature flags require a `features` object on the tenant — implemented as `tenant.features: Record<string, boolean>`.

### D4 — Dark mode via `next-themes` + CSS variables (already in `theme.css`)
- **Why:** `theme.css` already defines `.dark` overrides. `next-themes` adds the `.dark` class on `<html>` based on user preference or system setting. No new CSS needed.

### D5 — API layer: hand-written typed fetch wrapper, not axios
- **Why:** Native `fetch` is sufficient, zero deps, smaller bundle. Typed generic `request<T>()` gives us full DX.
- **Trade-off:** We write our own retry/timeout. Acceptable given we'll add React Query later which handles retries.

### D6 — Routes grouped by domain in sidebar (collapsible sections)
- **Why:** With 15+ routes, a flat list is unusable. Groups: *Overview*, *Academics*, *Admissions*, *Finance*, *People*, *Communication*, *Analytics*, *Settings*.
- **Trade-off:** More code in Layout, but dramatically better UX at scale.

### D7 — Parent Portal uses a separate layout (`/portal/*`)
- **Why:** Parents get a simplified, mobile-first shell — no admin sidebar. Clean separation means we can ship the portal on a different subdomain later without code changes.

### D8 — Page-level Framer Motion transitions standardized
- **Why:** Every page uses the same `initial / animate / exit` pattern via a `<PageTransition>` wrapper (in `PageHeader`). Consistent feel across modules.

### D13 — Dark mode removed (iteration 2)
- **Why:** This is a staff-facing B2B CRM. Light theme is universally expected for spreadsheets/receipts/report cards, and maintaining `.dark` overrides across 20+ pages was a net-negative for QA surface area.
- **How:** `ThemeProvider` / `ThemeToggle` were deleted; the `.dark` class is never added to `<html>`, so every `dark:` Tailwind utility becomes inert automatically. No class scrubbing needed.
- **Trade-off:** If a customer explicitly asks for dark mode later, we restore `next-themes` (dev cost ~1 hour) and the latent `dark:` variants light up. Zero bridges burned.

### D14 — RBAC evolved from flat strings to flat + attribute-aware (`authorize(user, perm, ctx)`)
- **Why:** Real requirements (teacher marks only own subject, parent sees only own children, class-teacher-only attendance) cannot be expressed by role → permission[] alone.
- **Shape:** `hasPermission()` is still the cheap pure lookup (role + perm). `authorize()` layers on scope context (`classId`, `studentId`, `subject`). The frontend `<Can>` and the Go service layer both call `authorize()`; SQL uses the same scope as a WHERE filter.
- **Why not full ABAC / policy engine (Casbin, OPA):** overkill for our rules; one hand-written Go function is auditable and the full rule set fits in ~30 lines.
- **Trade-off:** Adding new scope dimensions means editing three places (types, `authorize`, SQL filters). We keep the set small (`classId, studentId, subject`) on purpose.

### D15 — Sub-resource permissions (`students.fees.read`, `students.documents.read`, …)
- **Why:** A teacher can see a student's profile but must not see fees or documents. A permission named `students.read` is too coarse. We split the student page into four sub-resources (marks, attendance, fees, documents) and gate each tab.
- **Rule of thumb:** a new sub-resource key is added only when **two different roles** need different access to a slice of the same parent resource. We don't explode the permission table for single-role carve-outs.

### D16 — Route guards wired into `routes.tsx` (not just sidebar nav)
- **Why:** Before iteration 2, `ProtectedRoute` existed but was unused. Sidebar-level filtering alone is **not** a guard — a direct URL visit (`/communications`) would have worked.
- **Now:** every authenticated route is wrapped via a `guard(perm, <Page/>)` helper so direct-URL visits go to `/403`.
- **Trade-off:** Double-gating (route + nav) is intentional — the route list is now the single source of truth; nav-config exists only for rendering labels/icons.

### D17 — Class-teacher & subject-teacher as first-class scope (not string matching)
- **Why:** Every school has per-section class teachers and per-class subject teachers. We model this as two distinct concepts stored in `User.scope`:
  - `scope.classIds`: classes this teacher is **in-charge of** (drives `attendance.write`)
  - `scope.assignments: [{classId, subject}]`: subjects this teacher **teaches** (drives `marks.write` / `exams.write`)
- **Separation matters:** A Math teacher can enter marks in 8-A/8-B/9-A without being the class teacher of any of them. The class teacher of 9-A takes attendance for 9-A even if they only teach English there.
- **UI surface:** Staff Directory → Add Staff captures both: a single "Class Teacher Of" dropdown + a chip-builder for subject assignments.

### D18 — Substitute teachers: ship admin-override now, formal substitution record later
- **Decision:** Phase 1 = school admin covers absent teacher's attendance (already has unrestricted `attendance.write`). Phase 2 = `attendance_substitutions` table + date-bounded `authorize()` extension.
- **Why defer:** Teacher absence is a 5–10/year event per school. Building a date-picker + notification flow before any customer asks for it is speculative work.

### D19 — Single `<FormModal>` + `<Field>` pattern for all create flows (Admissions / Scholarships / Staff / Students)
- **Why:** Every "Add X" button across the app needs the same chrome (overlay, header, footer with Cancel/Submit, native form submit, loading state). Rather than port shadcn `Dialog` into each page (which requires DialogHeader/DialogFooter/DialogDescription boilerplate), we wrote a ~120-line wrapper that matches the existing Fees payment modal visuals exactly.
- **Exports:** `FormModal`, `Field`, and a shared `inputClass` so every form has identical styling.
- **Trade-off:** We miss out on Radix Dialog's advanced focus-trap & portal behaviours; the plain `stopPropagation`+escape handling is sufficient for form-sized modals. If we ever need nested dialogs or command palette compositions, we swap the internals without changing any callsite.

### D20 — Fees page: class-filter-first navigation for accountants
- **Why:** Accountants collect fees one class at a time ("today I'm calling 9-A parents"). A global list of 1500 students forces constant scrolling. The chip row at the top of `/fees` filters in one click.
- **Design:** Chips include a live count per class. "All" is the default. Search is preserved and layered on top of the class filter.

---

## Iteration 2 Change Summary

### RBAC
- Flat `rolePermissions` map unchanged in shape, but **memberships revised**: teacher lost `communications.*`; accountant + admissions gained `students.fees.read` + `students.documents.read`; admissions gained read-only `fees.read`.
- Added 5 **sub-resource permissions** under `students.*` (marks r/w, attendance r, fees r, documents r).
- Added `authorize(user, permission, ctx)` with attribute checks; `AuthContext.can()` now accepts the same `ctx` argument. Backend spec §6.3 lists the rules.

### Routing
- `ProtectedRoute` actually wired in. Direct-URL access to unauthorized pages now hits `/403` instead of rendering.

### UI
- Removed `ThemeProvider` + `ThemeToggle`; deleted the `src/lib/theme/` folder.
- Added `src/app/components/FormModal.tsx` with `Field` + `inputClass` helpers.
- **New forms (functional, state-only until backend):** Add Lead (Admissions), New Concession (Scholarships), Add Staff (Staff Directory — captures class-teacher + subject assignments), Add Student (Students — captures parent details + optional invoice flag).
- **Fees:** class/section filters changed from chip row to **two dropdowns** (Class + Section). Fixes hover glitch by always showing action buttons (Remind / Collect / Paid) without conditional rendering.
- **Students profile:** tabs are now dynamic based on sub-resource permissions — teachers see Academics + Attendance, accountants see Finance + Documents, admins see all.
- **Exams:** marks input disabled per cell unless the user has `students.marks.write` for that specific `{class, subject}`. Teachers see only classes they have at least one assignment in.
- **Timetable:** subject cells are `<div>` (not clickable) for users without `timetable.write`.
- **Attendance:** class picker restricted to teacher's `scope.classIds`; Save button ctx-gated.

### Docs
- `backend-spec.md` — rewritten §6 RBAC sections (6.2 matrix, 6.3 scoped rules, 6.4 substitutions, 6.5 class-teacher management, 6.7 multi-child/multi-tenant parent identities). Extended §8.3 `POST /students` with full body contract and atomic-transaction behaviour spelling out the parent-linking + invoice-on-create flow.
- `research.md` — this block + D13–D20 above.

---

## Module Log (populated as we build)

### M1 — Attendance Module (planned)
- Daily class-wise marking grid (present / absent / late / leave)
- Monthly heatmap per student (Recharts `HeatmapChart` is not built-in → custom grid)
- Bulk mark all present, bulk SMS to absent parents
- Permission: `attendance.read`, `attendance.write`
- Backend tables needed: `attendance_records(id, tenant_id, student_id, class_id, date, status, marked_by, marked_at)`

### M2 — Timetable Manager (planned)
- Grid: days × periods. Cells draggable (React DnD).
- Conflict detection (teacher double-booked).
- Permission: `timetable.read`, `timetable.write`
- Tables: `timetable_slots(id, tenant_id, class_id, day_of_week, period_index, subject_id, teacher_id)`

### M3 — Exams & Grades (planned)
- Exam definition, marks entry per class, report card generation.
- PDF export (deferred to a later iteration; UI in place).
- Tables: `exams`, `exam_subjects`, `marks`.

### M4 — Library
- Catalogue grid with stock progress bar, issue/return side panel, overdue highlighting.
- Tables: `books(id, tenant_id, title, author, isbn, total, available, category)`, `book_loans(id, book_id, student_id, issued_at, due_at, returned_at)`.

### M5 — Fee Structure Builder (Per-Student)
- Per-grade **fee template** with base heads (tuition/transport/lab) + **optional add-ons** (karate, music, swimming).
- Each student gets a `student_fee_plan` linked to a template. Overrides allow opt-in/out of optional heads.
- Previous-year outstanding dues tracked in `previous_year_dues` table.
- Scholarships apply to specific fee heads.
- Tables: `fee_templates`, `fee_template_heads`, `student_fee_plans`, `student_fee_overrides`, `previous_year_dues`.

### M6 — Scholarships & Concessions
- Status-tracked table (Approved/Pending/Rejected), collection impact KPI.
- Tables: `scholarships(id, tenant_id, student_id, type, percent, amount, status, approved_by, approved_at)`.

### M7 — Expenses (Simplified)
- **Budget vs Actual chart removed.** Now shows total monthly expense vs previous month comparison.
- Category breakdown bars + recent ledger table retained.
- Tables: `expense_categories`, `expenses(id, tenant_id, category_id, vendor, amount, paid_by, incurred_on)`.

### M8 — Staff Directory / HR
- Card grid with avatar initials, department chip, leave balance, contact.
- Tables: `staff(id, tenant_id, user_id, role, department, leave_balance, phone, ...)`.

### M9 — Notice Board
- Feed of posts with audience, attachment, read-receipt progress bar.
- Tables: `notices(id, tenant_id, title, body, audience, attachment_url, posted_by, pinned)`, `notice_reads(notice_id, user_id, read_at)`.

### M10 — Events & Calendar
- Month grid + upcoming list sidebar, typed events (Event/Holiday/Exam/PTM) with color codes.
- Decision: custom grid built on CSS grid + date-fns instead of FullCalendar — lighter bundle, matches our look.
- Tables: `events(id, tenant_id, date, title, type, time, location)`.

### M11 — Analytics (renamed from Reports)
- KPI row + 4 charts (enrollment YoY area, grade pie, revenue line, subject bar).
- Nav label changed from "Reports" to "Analytics".
- Key analytics (enrollment, grade dist, revenue, fee collection YTD) also shown on Dashboard for admins.
- Uses only existing Recharts; no new deps.

### M12 — Audit Logs
- Immutable feed grouped by day, action-colored icons (create/update/delete/login), searchable.
- **Export dropdown added:** Today / This Month / Last Month / This Year.
- Backend contract: append-only table, no UPDATE/DELETE grants. Partitioned monthly.

### M13 — Parent Portal
- Read-only child summary card, fee "pay now" CTA, timeline feed, downloadable report cards.
- Permission: single `parent_portal.read` — parents have **no** admin nav (filtered in `Layout`).

### M14 — Login + Forbidden
- Branded gradient login screen with role picker (dev convenience).
- `/403` page reached via `ProtectedRoute` when permission check fails.

---

## Layout & Design System Decisions (D9+)

### D9 — Grouped collapsible sidebar with animated active indicator
- Used Framer Motion `layoutId` on the green active pill — smoothly animates between nav items.
- Sidebar filters items by `can(permission)` AND `hasFeature(featureFlag)` so parent/teacher roles see clean, minimal menus.

### D10 — Global topbar with role-based page navigator, user menu
- **Notification bell removed** — no 1-1 messaging system; audit logs serve the tracking purpose.
- **Search bar is now a page navigator** — filters from the RBAC-visible nav items; typing "Fee" surfaces Fees, Fee Structure, etc. Replaces the placeholder command palette.
- User menu retained for role switching (dev) and logout.

### D11 — Reusable `PageShell` + `PageHeader`
- Standardizes page background, enter animation, breadcrumb, and action buttons.
- Every new page is ~80% layout-free — you write only the domain content.

### D12 — Multi-tenant resilience
- `TenantContext` drives `tenant.name`, academic year, feature flags, currency.
- Changing a feature flag (e.g. `library: false`) hides the Library module everywhere — nav, routes, dashboards — with zero code changes.

---

## How to add a new module (5-step recipe)

1. Add permission keys to `src/lib/types.ts` → `Permission` union.
2. Grant them to roles in `src/lib/rbac.ts`.
3. Create `src/app/pages/MyModule.tsx` using `<PageShell>` + `<PageHeader>` + `<BentoCard>`.
4. Register the route in `src/app/routes.tsx`.
5. Add one nav entry in `src/app/components/nav-config.ts` with its permission (and optional feature flag).

No changes needed to auth, layout, theme, or tenant code.


---

## Security Notes (Frontend Responsibilities)

Frontend is NOT the security boundary. Still, we enforce:
- **`<Can>` gates** hide privileged UI and prevent accidental calls.
- **`<ProtectedRoute>`** redirects unauthenticated users to `/login`.
- **No secrets in the bundle** — API base URL is the only env var exposed.
- **Auth token storage:** when backend lands, tokens live in `httpOnly` cookies set by the Go server. Frontend never touches `localStorage` for auth material.
- **XSS hygiene:** React escapes by default; we avoid `dangerouslySetInnerHTML` except for rich-text content sanitized via DOMPurify (to be added when a rich-text editor is introduced).

---

---

## Iteration 2 — Decision Log (thoughts.md refinement)

| # | Decision | Detail |
|---|---|---|
| D21 | Dashboard restricted to admin roles | `dashboard.read` removed from teacher, accountant, admissions_officer. They land on their primary module page. |
| D22 | No notification bell | Removed from topbar. No messaging system needed. |
| D23 | Search bar = role-based page navigator | Filters visible nav items by name, navigates on click. |
| D24 | Quick Actions wired to real routes | Dashboard buttons navigate to `/students`, `/fees`, `/attendance`, `/admissions`. |
| D25 | Dashboard analytics | Recent Activity replaced with: KPI row, 12-month revenue chart, enrollment YoY, grade distribution, YoY comparison cards. |
| D26 | Fees: dropdown filters | Chip row replaced with Class + Section dropdowns. Section resets when class changes. |
| D27 | Fees: hover glitch fixed | Action buttons always visible (Remind / Collect / Paid badge). No conditional hover rendering. |
| D28 | Per-student fee structure | `fee_templates` + `student_fee_plans` + `student_fee_overrides` in DB schema. Optional add-ons (swimming, karate). |
| D29 | Previous-year outstanding dues | `previous_year_dues` table tracks carried-forward balances per student per academic year. |
| D30 | Admissions: close/drop lead | X button on each lead card → dropdown with reason (Not Interested, Enrolled Elsewhere, Fee Concerns, Relocated, No Response, Other). Dropped leads shown in summary below Kanban. |
| D31 | Expenses simplified | Budget vs Actual chart removed. Monthly total + vs previous month comparison. |
| D32 | Audit Logs export options | Dropdown: Today / This Month / Last Month / This Year (Full). |
| D33 | Settings trimmed | Only General + Roles & Permissions tabs. Security, Billing, Notifications, Integrations removed. |
| D34 | Communications deferred (MVP) | Communications, Notice Board, Events hidden behind `communications` feature flag (default false). |
| D35 | Admin creates user credentials | No self-registration. School admin provisions accounts via Settings or `POST /users`. |
| D36 | Multi-branch = separate tenants | Each branch is its own tenant. Group dashboard deferred to phase 3. |
| D37 | Architecture.md created | Single source of truth for multi-tenant arch: frontend, backend, DB, infra, security. |
| D38 | Admissions: enrollment confirmation flow | Dragging lead to "Enrolled" opens confirmation modal (admission_no, section, parent email). Creates student record + parent account + audit log in single atomic transaction. See `backend-spec.md` §7.6.1. |
| D39 | Analytics page removed | Separate `/reports` page eliminated. Dashboard already shows analytics for admins. `reports.read` permission removed from all roles. Audit Logs remains as standalone page. |

_Last updated: iteration 2 — thoughts.md analysis + frontend refinement + architecture documentation._
