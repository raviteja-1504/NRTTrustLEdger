import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiTenant, ApiTenantMembership } from "./types";

export const tenantService = {
  get: () =>
    api.get<ApiEnvelope<ApiTenant>>("/tenant"),

  update: (body: Partial<{
    name: string;
    logo_url: string;
    primary_color: string;
    accent_color: string;
    locale: string;
    currency: string;
    timezone: string;
    academic_year: string;
    features: Record<string, boolean>;
  }>) => api.patch<ApiEnvelope<ApiTenant>>("/tenant", body),
};

export const membershipsService = {
  list: (params?: { role?: string; page?: number; page_size?: number }) =>
    api.get<ApiListEnvelope<ApiTenantMembership>>("/memberships", params as Record<string, string | number | undefined>),

  provision: (body: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  }) => api.post<ApiEnvelope<ApiTenantMembership>>("/memberships", body),

  update: (id: string, body: { role?: string; status?: string }) =>
    api.patch<ApiEnvelope<ApiTenantMembership>>(`/memberships/${id}`, body),

  deactivate: (id: string) =>
    api.del<void>(`/memberships/${id}`),
};
