import { api } from "../api/client";
import type { ApiEnvelope, ApiTimetableSlot } from "./types";

export const timetableService = {
  get: (classSectionId: string) =>
    api.get<ApiEnvelope<ApiTimetableSlot[]>>(`/timetable/${classSectionId}`),

  replace: (classSectionId: string, slots: Array<{
    day_of_week: number;
    period_index: number;
    subject?: string;
    teacher_membership_id?: string;
    room?: string;
    starts_at?: string;
    ends_at?: string;
  }>) => api.put<ApiEnvelope<ApiTimetableSlot[]>>(`/timetable/${classSectionId}`, { slots }),
};
