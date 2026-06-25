import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiStudent, ApiClassSection } from "./types";

export interface ListStudentsParams {
  page?: number;
  page_size?: number;
  status?: string;
  class_section_id?: string;
  academic_year?: string;
  q?: string;
}

export const studentsService = {
  list: (params?: ListStudentsParams) =>
    api.get<ApiListEnvelope<ApiStudent>>("/students", params as Record<string, string | number | boolean | undefined>),

  get: (id: string) =>
    api.get<ApiEnvelope<ApiStudent>>(`/students/${id}`),

  create: (body: {
    admission_no: string;
    name: string;
    gender?: string;
    dob?: string;
    phone?: string;
    class_section_id?: string;
    academic_year?: string;
  }) => api.post<ApiEnvelope<ApiStudent>>("/students", body),

  update: (id: string, body: Partial<{
    name: string;
    gender: string;
    dob: string;
    phone: string;
    emergency_phone: string;
    status: string;
    photo_url: string;
    address: Record<string, string>;
  }>) => api.patch<ApiEnvelope<ApiStudent>>(`/students/${id}`, body),

  delete: (id: string) =>
    api.del<void>(`/students/${id}`),

  bulkMarkAttendance: (body: Array<{ student_id: string; status: string; date: string }>) =>
    api.post("/attendance/bulk", body),
};

export const classSectionsService = {
  list: (params?: { academic_year?: string }) =>
    api.get<ApiListEnvelope<ApiClassSection>>("/class-sections", params as Record<string, string | undefined>),

  get: (id: string) =>
    api.get<ApiEnvelope<ApiClassSection>>(`/class-sections/${id}`),

  create: (body: { grade: number; section: string; academic_year: string }) =>
    api.post<ApiEnvelope<ApiClassSection>>("/class-sections", body),
};
