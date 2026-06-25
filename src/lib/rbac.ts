import type { Permission, Role, User } from "./types";

// Source of truth for Role -> Permission mapping.
// Mirror this exactly in the Go backend (`internal/rbac/map.go`).
//
// The app also supports *scoped* authorization via `authorize(user, perm, ctx)`.
// Example: a teacher has `students.marks.write` only for classes they teach.

// Full super-set for super_admin / school_admin (kept DRY).
const ALL_ADMIN_PERMS: Permission[] = [
  "dashboard.read",
  "students.read", "students.write",
  "students.fees.read",
  "students.documents.read",
  "students.marks.read", "students.marks.write",
  "students.attendance.read",
  "admissions.read", "admissions.write",
  "attendance.read", "attendance.write",
  "timetable.read", "timetable.write",
  "exams.read", "exams.write",
  "library.read", "library.write",
  "fees.read", "fees.write",
  "scholarships.read", "scholarships.write",
  "expenses.read", "expenses.write",
  "staff.read", "staff.write",
  "communications.read", "communications.write",
  "notices.read", "notices.write",
  "events.read", "events.write",
  "audit.read",
  "settings.read", "settings.write",
];

export const rolePermissions: Record<Role, Permission[]> = {
  // Platform operator — sees everything across every tenant.
  super_admin: ALL_ADMIN_PERMS,

  // Per-school administrator — full school access.
  school_admin: ALL_ADMIN_PERMS,

  // Teacher: academic focus, NO communications, NO timetable edit.
  // `attendance.write` and `students.marks.write` are granted but FURTHER
  // scoped by `authorize()` to only the classes the teacher is in-charge of
  // (class teacher) or assigned to (subject teacher).
  teacher: [
    "students.read",
    "students.marks.read", "students.marks.write",
    "students.attendance.read",
    "attendance.read",
    "attendance.write",           // scoped: only classes in user.scope.classIds
    "timetable.read",             // view-only; school_admin creates the timetable
    "exams.read", "exams.write",
    "library.read",
    "notices.read",
    "events.read",
  ],

  // Accountant: finance + fee-related student context (incl. documents for
  // fee verification — e.g., scholarship proofs).
  accountant: [
    "students.read",
    "students.fees.read",
    "students.documents.read",
    "fees.read", "fees.write",
    "scholarships.read", "scholarships.write",
    "expenses.read", "expenses.write",
  ],

  // Admissions officer: pipeline + student fee/documents for onboarding quotes.
  admissions_officer: [
    "admissions.read", "admissions.write",
    "students.read",
    "students.fees.read",
    "students.documents.read",
    "fees.read",                  // read-only; only accountant collects payments
    "communications.read", "communications.write",
  ],

  // Parent: own-children portal only.
  parent: [
    "parent_portal.read",
    "students.marks.read",
    "students.attendance.read",
    "students.fees.read",
    "students.documents.read",
    "notices.read",
    "events.read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Optional scope context for attribute-aware checks. */
export interface AuthCtx {
  classId?: string;
  studentId?: string;
  subject?: string;
}

/**
 * Full authorization: role perm + scope constraint.
 *
 * Rules:
 *  - super_admin / school_admin: unscoped
 *  - teacher: any `*.write` on a specific class/subject must match their
 *    assignments (or classIds if no subject specified)
 *  - parent: any access tied to a studentId must be for their own children
 */
export function authorize(user: User, permission: Permission, ctx?: AuthCtx): boolean {
  if (!hasPermission(user.role, permission)) return false;
  if (user.role === "super_admin" || user.role === "school_admin") return true;

  if (user.role === "teacher") {
    const { classIds = [], assignments = [] } = user.scope ?? {};

    // attendance.write → must be class teacher (in-charge) of that class.
    // No ctx.classId means caller hasn't specified which class, so deny
    // (prevents blanket "any teacher can save any attendance").
    if (permission === "attendance.write") {
      return ctx?.classId ? classIds.includes(ctx.classId) : false;
    }

    // Other *.write actions on a specific class must match the teacher's scope.
    if (permission.endsWith(".write") && ctx?.classId) {
      if (ctx.subject) {
        return assignments.some(
          (a) => a.classId === ctx.classId && (a.subject === undefined || a.subject === ctx.subject),
        );
      }
      return classIds.includes(ctx.classId) ||
             assignments.some((a) => a.classId === ctx.classId);
    }
    return true;
  }

  if (user.role === "parent" && ctx?.studentId) {
    return user.scope?.studentIds?.includes(ctx.studentId) ?? false;
  }

  return true;
}
