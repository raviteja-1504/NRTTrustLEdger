// Shared domain types used across the app.
// Kept backend-agnostic; the Go API will produce matching JSON shapes.

export type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant"
  | "admissions_officer"
  | "parent";

// Flat permission keys: "<domain>.<action>"
// Sub-resource keys ("students.fees.read") gate individual fields/tabs on a
// parent resource. Useful when a role can see the student card but not all tabs.
export type Permission =
  | "dashboard.read"
  | "students.read" | "students.write"
  // Sub-resources on a student profile
  | "students.fees.read"
  | "students.documents.read"
  | "students.marks.read" | "students.marks.write"
  | "students.attendance.read"
  | "admissions.read" | "admissions.write"
  | "attendance.read" | "attendance.write"
  | "timetable.read" | "timetable.write"
  | "exams.read" | "exams.write"
  | "library.read" | "library.write"
  | "fees.read" | "fees.write"
  | "scholarships.read" | "scholarships.write"
  | "expenses.read" | "expenses.write"
  | "staff.read" | "staff.write"
  | "communications.read" | "communications.write"
  | "notices.read" | "notices.write"
  | "events.read" | "events.write"
  // reports.read removed — analytics is on the Dashboard only
  | "audit.read"
  | "settings.read" | "settings.write"
  | "parent_portal.read";

/** A teacher's subject assignment (one teacher can cover multiple class/subject pairs). */
export interface TeacherAssignment {
  classId: string;
  subject?: string; // optional: undefined means "class teacher / all subjects"
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  // For teachers: which classes they teach (and which subjects in those classes).
  // For parents: which studentIds they can view.
  scope?: {
    classIds?: string[];
    studentIds?: string[];
    assignments?: TeacherAssignment[]; // per-subject grant for marks/exams write
  };
}

export interface Tenant {
  id: string;
  name: string;          // "Meridian School"
  shortCode: string;     // "meridian"
  logoUrl?: string;
  primaryColor?: string; // CSS color; falls back to theme default
  accentColor?: string;
  locale: string;        // "en-IN"
  currency: string;      // "INR"
  timezone: string;      // "Asia/Kolkata"
  academicYear: string;  // "2026-2027"
  features: Record<string, boolean>; // feature flags per tenant
}

// ---- Shared domain models (minimum fields used by mock data + UI) ----

export interface ClassSection {
  id: string;
  grade: number;      // 1..12
  section: string;    // "A", "B"
  teacherId?: string;
  studentCount: number;
}

export interface Student {
  id: string;
  tenantId: string;
  admissionNo: string;
  name: string;
  grade: number;
  section: string;
  rollNo: number;
  parentName?: string;
  parentPhone?: string;
  status: "active" | "alumni" | "withdrawn";
}

/** A membership record returned by the backend (with optional tenant info for picker). */
export interface TenantMembership {
  id: string;
  identity_id: string;
  tenant_id: string;
  role: Role;
  status: string;
  tenant_name?: string;       // populated in login picker response
  tenant_short_code?: string; // populated in login picker response
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // ISO yyyy-mm-dd
  status: AttendanceStatus;
  note?: string;
}
