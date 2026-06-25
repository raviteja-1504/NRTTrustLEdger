# Pending Implementation Items (SchoolCRM)

This file consolidates:

1. **Pending items already identified during iteration work** (explicitly deferred / phase-2 notes)
2. **Anything still left from the README roadmap**
3. **Items identified in the iteration 2 (thoughts.md) refinement**

Status meanings:
- **Planned**: on the roadmap, not implemented yet
- **Partial**: UI exists but is mock-data / missing key workflows
- **Deferred**: intentionally postponed (usually until backend integration)
- **Done (iter2)**: resolved in iteration 2

---

## A) Items explicitly identified as pending / deferred

### A1) Backend integration (core)
- **Planned** Implement the Go backend described in `backend-spec.md`.
- **Planned** Replace mock data with a `services/` layer per domain (students, fees, admissions, etc.).
- **Deferred** Add `@tanstack/react-query` for caching/retry/invalidation once real API calls land.
- **Deferred** Add `zod` runtime validation for API responses + form schemas.
- **Planned** Admin-creates-users flow (no self-registration). See `backend-spec.md` §5.1.
- **Planned** `POST /users` endpoint for user provisioning.

### A2) Substitute-teacher attendance (phase 2)
- **Deferred** `attendance_substitutions` table + endpoints + UI.
- **Current workaround** Admin covers attendance (admin already has unrestricted `attendance.write`).

### A3) Printable/PDF documents
- **Planned** Fee receipts as downloadable/printable PDFs.
- **Planned** Report card PDF export.
- **Planned** Timetable PDF export.
- **Planned** Attendance CSV export (backend endpoint for data download).
- **Deferred** Choose / implement a PDF engine (`@react-pdf/renderer` vs server-side rendering like gotenberg). (`backend-spec.md` suggests gotenberg for fidelity.)

### A4) Parent multi-school login / tenant selection
- **Deferred** Implement `identities + tenant_memberships` split + `Pick school` flow.
- **Note** This is intentionally a phase-2/phase-3 requirement; single-tenant `users` is acceptable until first real multi-school parent appears.

### A5) Hard UX/behavior gaps to close later
- **Planned** Keyboard/escape/focus-trap hardening for modal behaviour if needed.
- **Planned** Attendance pagination for large sections (80-100+ students). Backend needs `?page=&pageSize=` support.

### A6) Items resolved in iteration 2
- **Done (iter2)** Dashboard: Recent Activity replaced with analytics (KPI row, 12-month revenue, enrollment YoY, grade distribution, YoY comparison).
- **Done (iter2)** Dashboard: Quick Actions wired to real page routes (`/students`, `/fees`, `/attendance`, `/admissions`).
- **Done (iter2)** Dashboard: Restricted to super_admin + school_admin only.
- **Done (iter2)** Notification bell removed from topbar.
- **Done (iter2)** Search bar converted to role-based page navigator.
- **Done (iter2)** Fees: Class/section chip row replaced with dropdown filters.
- **Done (iter2)** Fees: Hover glitch fixed (action buttons always visible).
- **Done (iter2)** Admissions: Close/drop lead button with reason dropdown + dropped leads summary.
- **Done (iter2)** Expenses: Budget vs Actual chart removed; simplified to monthly total + vs previous month.
- **Done (iter2)** Audit Logs: Monthly/yearly export dropdown added.
- **Done (iter2)** Settings: Trimmed to General + Roles & Permissions only.
- **Done (iter2)** Communications, Notice Board, Events hidden behind `communications` feature flag (default off for MVP).
- **Done (iter2)** Admissions: Enrollment confirmation modal (admission_no, section, parent email) with student record creation + audit log.
- **Done (iter2)** Analytics page removed — Dashboard already has admin analytics. `reports.read` permission removed.
- **Done (iter2)** `Architecture.md` created (full multi-tenant system architecture).
- **Done (iter2)** `backend-spec.md` updated: per-student fee structure, admin-creates-users auth, drop_reason on leads, RBAC matrix updated.

---

## B) Roadmap items left from README.md

### B1) Academic & Operations
- **Partial** Attendance Module
  - UI exists but needs backend persistence, bulk endpoints, monthly heatmaps, pagination for large sections, auto-alert workflows.
- **Partial** Timetable / Schedule Manager
  - UI exists; needs PDF export, persistence, teacher conflict resolution rules backed by data.
- **Partial** Exam & Grades Module
  - UI exists (marks entry + scoped editability); needs exam definitions, report cards, exports, persistence.
- **Partial** Library Management
  - UI exists; needs backend tables, issue/return workflows, and overdue notices.

### B2) Finance
- **Partial** Fee Structure Builder (Per-Student)
  - UI exists; needs per-student plan UI (template selection, optional head toggles, overrides), previous-year dues display, persistence.
- **Partial** Receipt Generation
  - Payment modal exists; needs real payment records + receipt PDFs.
- **Partial** Scholarship & Concession Tracker
  - UI + create form exists; needs approval workflow, per-head application, persistence, audit logs.
- **Partial** Expense Tracking
  - UI simplified (monthly total); needs persistence, category management, exports.

### B3) Communication & Engagement — **DEFERRED (MVP)**
> All communication modules hidden behind `communications` feature flag. Will be enabled when SMS/email vendor integrations are ready.
- **Deferred** Communications (SMS/email/WhatsApp broadcasts)
- **Deferred** Notice Board (attachments + read receipts persistence)
- **Deferred** Event & Calendar Module (persistence, invite/RSVP, calendar exports)
- **Partial** Parent Portal Login
  - Portal pages exist; needs real auth, child linking, payments, downloads.
- **Partial** Staff Directory & HR Module
  - UI + add staff form exists; needs persistence, leave requests, edit button for admin.

### B4) Data & Insights
- **Partial** Dashboard Analytics
  - Dashboard now shows KPIs + charts for admins; needs real aggregated data + caching via `GET /dashboard/summary`.
- **Removed** Separate Analytics Page — Dashboard is the sole analytics surface.
- **Planned** Custom Report Builder
  - Report-builder UX + saved report configs still pending (deferred — may not be MVP).
- **Planned** Predictive Admission Scoring
  - Not implemented (requires historical admissions outcomes + model choice).

### B5) Technical
- **Planned** Backend Integration (see section A1).
- **Partial** Authentication & Roles
  - Frontend RBAC exists, route guards exist; backend enforcement + admin-creates-users still pending.
- **Canceled/De-scoped** Dark Mode
  - Removed; can be restored later if requested.
- **Planned** Progressive Web App (PWA)
  - Not implemented (manifest, service worker, offline strategy).
- **Partial** Audit Logs
  - UI exists with export dropdown; backend append-only log persistence + partitioning still pending.

---

## C) Suggested next implementation order (practical)

1. **Backend B0 slice — Auth + Tenant + Students**
   - `/auth/login`, `/auth/me`, `POST /users` (admin creates credentials)
   - Tenant middleware + RLS setup
   - `/students` CRUD end-to-end
2. **Fees B2 slice — Per-Student Fee Plans**
   - fee_templates → student_fee_plans → invoice generation → payment recording → receipts
   - previous_year_dues migration + display
3. **Attendance B1 slice**
   - daily attendance + bulk API + pagination for large sections + parent SMS notifications
4. **Dashboard B3 slice — Aggregation Endpoints**
   - `GET /dashboard/summary` (KPIs, revenue trend, enrollment YoY, grade dist)
   - Redis caching (5 min TTL)
5. **Admissions B4 slice**
   - Lead CRUD + stage transitions + drop_reason + Kanban persistence
   - `POST /admissions/:leadId/enroll` — atomic enrollment (create student + parent account + audit log)
6. **Hardening B5**
   - rate limits, audit retention jobs + monthly partitioning, OTEL, DR drill
7. **Communications B6 slice (Phase 2)**
   - notices + broadcasts + templates + SMS/email vendor integration
   - Enable `communications` feature flag per tenant

---

## D) Notes

- Many modules are "UI-complete" but still **mock-data**. The main unlock is the backend and a consistent `services/` layer, after which each module becomes a straightforward wire-up.
- **Architecture.md** is now the single source of truth for the overall multi-tenant system architecture.
- **Multi-branch schools**: modeled as separate tenants. Group-level dashboard deferred to phase 3.
- **Per-student fee flexibility**: base template + optional add-ons + scholarship overrides. See `backend-spec.md` §7.5 and `Architecture.md` §6.2.
