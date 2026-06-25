import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiFeeTemplate, ApiFeeInvoice, ApiScholarship } from "./types";

export const feesService = {
  // Fee structure (templates)
  listTemplates: (params?: { academic_year?: string }) =>
    api.get<ApiListEnvelope<ApiFeeTemplate>>("/fees/structure", params as Record<string, string | undefined>),

  createTemplate: (body: {
    name: string;
    grade_band: number[];
    academic_year: string;
    heads: Array<{ name: string; amount: number; frequency: string; is_optional: boolean; display_order: number }>;
  }) => api.post<ApiEnvelope<ApiFeeTemplate>>("/fees/structure", body),

  replaceHeads: (templateId: string, heads: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_optional: boolean;
    display_order: number;
  }>) => api.put<ApiEnvelope<ApiFeeTemplate>>(`/fees/structure/${templateId}/heads`, { heads }),

  // Invoices
  listInvoices: (params?: { student_id?: string; status?: string; academic_year?: string; page?: number; page_size?: number }) =>
    api.get<ApiListEnvelope<ApiFeeInvoice>>("/fees/invoices", params as Record<string, string | number | undefined>),

  getInvoice: (id: string) =>
    api.get<ApiEnvelope<ApiFeeInvoice>>(`/fees/invoices/${id}`),

  createInvoice: (body: {
    student_id: string;
    template_id: string;
    academic_year: string;
    due_date?: string;
  }) => api.post<ApiEnvelope<ApiFeeInvoice>>("/fees/invoices", body),

  recordPayment: (invoiceId: string, body: {
    amount: number;
    mode: string;
    reference?: string;
    note?: string;
  }) => api.post<ApiEnvelope<ApiFeeInvoice>>(`/fees/invoices/${invoiceId}/pay`, body),
};

export const scholarshipsService = {
  list: (params?: { student_id?: string; status?: string; academic_year?: string }) =>
    api.get<ApiListEnvelope<ApiScholarship>>("/scholarships", params as Record<string, string | undefined>),

  create: (body: {
    student_id: string;
    name: string;
    amount?: number;
    percentage?: number;
    applied_to_heads: string[];
    academic_year: string;
    notes?: string;
  }) => api.post<ApiEnvelope<ApiScholarship>>("/scholarships", body),

  approve: (id: string) =>
    api.post<ApiEnvelope<ApiScholarship>>(`/scholarships/${id}/approve`, {}),

  reject: (id: string, reason?: string) =>
    api.post<ApiEnvelope<ApiScholarship>>(`/scholarships/${id}/reject`, { reason }),
};
