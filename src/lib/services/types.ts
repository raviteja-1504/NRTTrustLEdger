// API envelope shapes returned by the Go backend

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiListEnvelope<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
  };
}

// ─── Domain response types (snake_case = Go JSON tags) ───────────────────────

export interface ApiStudent {
  id: string;
  tenant_id: string;
  admission_no: string;
  name: string;
  dob?: string;
  gender?: string;
  status: "active" | "alumni" | "withdrawn";
  phone?: string;
  emergency_phone?: string;
  address?: Record<string, string>;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  // joined via enrollment
  roll_no?: number;
  academic_year?: string;
}

export interface ApiClassSection {
  id: string;
  tenant_id: string;
  academic_year: string;
  grade: number;
  section: string;
  class_teacher_membership_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiAttendanceRecord {
  id: string;
  tenant_id: string;
  student_id: string;
  class_section_id: string;
  date: string;
  status: "present" | "absent" | "late" | "leave";
  note?: string;
  recorded_by_membership_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiTimetableSlot {
  id: string;
  class_section_id: string;
  day_of_week: number; // 1=Mon … 7=Sun
  period_index: number;
  subject?: string;
  teacher_membership_id?: string;
  room?: string;
  starts_at?: string; // "HH:MM"
  ends_at?: string;
}

export interface ApiExamTerm {
  id: string;
  tenant_id: string;
  name: string;
  academic_year: string;
  starts_on: string;
  ends_on: string;
  created_at: string;
}

export interface ApiExam {
  id: string;
  term_id: string;
  class_section_id: string;
  subject: string;
  exam_date?: string;
  max_marks: number;
  pass_marks: number;
  created_at: string;
}

export interface ApiMark {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained?: number;
  is_absent: boolean;
  grade?: string;
  remarks?: string;
}

export interface ApiAdmissionLead {
  id: string;
  tenant_id: string;
  parent_name: string;
  parent_phone?: string;
  parent_email?: string;
  student_name: string;
  grade_applying_for: number;
  source?: string;
  strength?: number;
  stage: "inquiry" | "application" | "visit" | "test" | "enrolled" | "dropped";
  drop_reason?: string;
  notes?: string;
  assigned_to_membership_id?: string;
  last_contacted_at?: string;
  enrolled_at?: string;
  enrolled_student_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiFeeTemplate {
  id: string;
  tenant_id: string;
  name: string;
  grade_band: number[];
  academic_year: string;
  is_active: boolean;
  created_at: string;
  heads?: ApiFeeTemplateHead[];
}

export interface ApiFeeTemplateHead {
  id: string;
  template_id: string;
  name: string;
  amount: number;
  frequency: string;
  is_optional: boolean;
  display_order: number;
}

export interface ApiFeeInvoice {
  id: string;
  tenant_id: string;
  student_id: string;
  academic_year: string;
  due_date?: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: "pending" | "partial" | "paid" | "overdue" | "waived";
  created_at: string;
  lines?: ApiFeeInvoiceLine[];
}

export interface ApiFeeInvoiceLine {
  id: string;
  invoice_id: string;
  head_name: string;
  amount: number;
  discount_amount: number;
  net_amount: number;
}

export interface ApiScholarship {
  id: string;
  tenant_id: string;
  student_id: string;
  name: string;
  amount?: number;
  percentage?: number;
  applied_to_heads: string[];
  status: "pending" | "approved" | "rejected";
  approved_by_membership_id?: string;
  academic_year: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiStaff {
  id: string;
  tenant_id: string;
  membership_id: string;
  employee_code?: string;
  department?: string;
  designation?: string;
  phone?: string;
  joined_on?: string;
  salary?: number;
  created_at: string;
  updated_at: string;
  // Denormalised from identity JOIN
  name: string;
  email: string;
  role: string;
}

export interface ApiLeaveRequest {
  id: string;
  tenant_id: string;
  staff_membership_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_membership_id?: string;
  created_at: string;
}

export interface ApiExpenseCategory {
  id: string;
  tenant_id: string;
  name: string;
  budget?: number;
  created_at: string;
}

export interface ApiExpense {
  id: string;
  tenant_id: string;
  category_id: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  recorded_by_membership_id: string;
  created_at: string;
}

export interface ApiTenantMembership {
  id: string;
  identity_id: string;
  tenant_id: string;
  role: string;
  status: string;
  scope?: Record<string, unknown>;
  started_on?: string;
  ended_on?: string;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  tenant_short_code?: string;
}

export interface ApiTenant {
  id: string;
  name: string;
  short_code: string;
  logo_url?: string;
  primary_color: string;
  accent_color: string;
  locale: string;
  currency: string;
  timezone: string;
  academic_year: string;
  features: Record<string, boolean>;
  plan: string;
  created_at: string;
  updated_at: string;
}
