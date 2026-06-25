import { api } from "../api/client";
import type { ApiEnvelope, ApiListEnvelope, ApiExpenseCategory, ApiExpense } from "./types";

export const expensesService = {
  listCategories: () =>
    api.get<ApiListEnvelope<ApiExpenseCategory>>("/expenses/categories"),

  createCategory: (body: { name: string; budget?: number }) =>
    api.post<ApiEnvelope<ApiExpenseCategory>>("/expenses/categories", body),

  list: (params?: { category_id?: string; from?: string; to?: string; page?: number }) =>
    api.get<ApiListEnvelope<ApiExpense>>("/expenses", params as Record<string, string | number | undefined>),

  create: (body: {
    category_id: string;
    amount: number;
    description?: string;
    expense_date: string;
    receipt_url?: string;
  }) => api.post<ApiEnvelope<ApiExpense>>("/expenses", body),
};
