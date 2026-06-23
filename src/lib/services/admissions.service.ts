import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiAdmissionLead } from "./types";

export const admissionsService = {
  list: (params?: { stage?: string; grade?: number; page?: number; page_size?: number }) =>
    api.get<ApiListEnvelope<ApiAdmissionLead>>("/admissions/leads", params as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<ApiEnvelope<ApiAdmissionLead>>(`/admissions/leads/${id}`),

  create: (body: {
    parent_name: string;
    parent_phone: string;
    parent_email?: string;
    student_name: string;
    grade_applying_for: number;
    source?: string;
    strength?: number;
    notes?: string;
    assigned_to_membership_id?: string;
  }) => api.post<ApiEnvelope<ApiAdmissionLead>>("/admissions/leads", body),

  update: (id: string, body: Partial<{
    parent_name: string;
    parent_phone: string;
    parent_email: string;
    student_name: string;
    grade_applying_for: number;
    source: string;
    strength: number;
    stage: string;
    drop_reason: string;
    notes: string;
    assigned_to_membership_id: string;
    last_contacted_at: string;
  }>) => api.patch<ApiEnvelope<ApiAdmissionLead>>(`/admissions/leads/${id}`, body),

  enroll: (id: string, body: {
    class_section_id: string;
    academic_year: string;
    admission_no: string;
    parent_email?: string;
    relationship?: string;
  }) => api.post<ApiEnvelope<{ student_id: string; enrollment_id: string; guardian_membership_id: string }>>(`/admissions/leads/${id}/enroll`, body),
};
