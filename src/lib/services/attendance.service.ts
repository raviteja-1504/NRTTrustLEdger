import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiAttendanceRecord } from "./types";

export interface BulkAttendanceEntry {
  student_id: string;
  status: "present" | "absent" | "late" | "leave";
  note?: string;
}

export const attendanceService = {
  list: (params: { class_section_id: string; date: string }) =>
    api.get<ApiListEnvelope<ApiAttendanceRecord>>("/attendance", params),

  bulkMark: (body: {
    class_section_id: string;
    date: string;
    records: BulkAttendanceEntry[];
  }) => api.post<ApiEnvelope<{ count: number }>>("/attendance/bulk", body),

  monthly: (studentId: string, params: { year: number; month: number }) =>
    api.get<ApiEnvelope<{ records: ApiAttendanceRecord[]; present: number; absent: number; late: number }>>(`/attendance/monthly/${studentId}`, params as Record<string, number>),
};
