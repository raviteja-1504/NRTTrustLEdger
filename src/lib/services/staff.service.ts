import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiStaff, ApiLeaveRequest } from "./types";

export const staffService = {
  list: (params?: { department?: string; page?: number; page_size?: number }) =>
    api.get<ApiListEnvelope<ApiStaff>>("/staff", params as Record<string, string | number | undefined>),

  get: (id: string) =>
    api.get<ApiEnvelope<ApiStaff>>(`/staff/${id}`),

  create: (body: {
    membership_id: string;
    employee_code: string;
    department?: string;
    designation?: string;
    joined_on?: string;
    salary?: number;
  }) => api.post<ApiEnvelope<ApiStaff>>("/staff", body),

  update: (id: string, body: Partial<{
    department: string;
    designation: string;
    joined_on: string;
    salary: number;
  }>) => api.patch<ApiEnvelope<ApiStaff>>(`/staff/${id}`, body),

  requestLeave: (body: {
    leave_type: string;
    from_date: string;
    to_date: string;
    reason?: string;
  }) => api.post<ApiEnvelope<ApiLeaveRequest>>("/staff/leave", body),

  approveLeave: (id: string) =>
    api.post<ApiEnvelope<ApiLeaveRequest>>(`/leave/${id}/approve`, {}),

  rejectLeave: (id: string, reason?: string) =>
    api.post<ApiEnvelope<ApiLeaveRequest>>(`/leave/${id}/reject`, { reason }),
};
