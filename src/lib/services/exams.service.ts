import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiExamTerm, ApiExam, ApiMark } from "./types";

export const examsService = {
  listTerms: (params?: { academic_year?: string }) =>
    api.get<ApiListEnvelope<ApiExamTerm>>("/exams/terms", params as Record<string, string | undefined>),

  createTerm: (body: {
    name: string;
    academic_year: string;
    starts_on: string;
    ends_on: string;
  }) => api.post<ApiEnvelope<ApiExamTerm>>("/exams/terms", body),

  listExams: (params?: { term_id?: string; class_section_id?: string }) =>
    api.get<ApiListEnvelope<ApiExam>>("/exams", params as Record<string, string | undefined>),

  createExam: (body: {
    term_id: string;
    class_section_id: string;
    subject: string;
    exam_date?: string;
    max_marks: number;
    pass_marks: number;
  }) => api.post<ApiEnvelope<ApiExam>>("/exams", body),

  submitMarks: (examId: string, marks: Array<{
    student_id: string;
    marks_obtained?: number;
    is_absent?: boolean;
    grade?: string;
    remarks?: string;
  }>) => api.post<ApiEnvelope<{ count: number }>>(`/exams/${examId}/marks`, { marks }),

  getReportCard: (studentId: string, termId: string) =>
    api.get<ApiEnvelope<{ student_id: string; term: ApiExamTerm; marks: ApiMark[] }>>(`/report-cards/${studentId}/${termId}`),
};
