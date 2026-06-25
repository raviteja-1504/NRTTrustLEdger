import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Loader2 } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";
import { expensesService } from "../../lib/services/expenses.service";
import type { ApiExpense } from "../../lib/services/types";

export default function Expenses() {
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    expensesService.list({ page_size: 200 })
      .then((res) => setExpenses(res?.data || []))
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  }, []);

  const totalMonth = (expenses || []).reduce((a, c) => a + c.amount, 0);
  const byCategory = (expenses || []).reduce((acc, exp) => {
    const cat = exp.category || "Other";
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);
  const categoryList = Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-rose-500", "bg-violet-500"];

  return (
    <PageShell>
      <PageHeader
        title="Expenses"
        subtitle="School expenditure tracking with category breakdown"
        actions={
          <Can permission="expenses.write">
            <button className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          </Can>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading expenses…
        </div>
      ) : !expenses || expenses.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No expenses recorded yet. Add expense categories and start tracking expenditures.</p>
          </div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <BentoCard className="col-span-12 lg:col-span-8">
            <h2 className="mb-4 text-lg font-semibold text-[#1A237E]">Total Expenses</h2>
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <p className="text-3xl font-bold text-[#1A237E]">₹{totalMonth.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} recorded expenses</p>
            </div>
          </BentoCard>

          <BentoCard className="col-span-12 lg:col-span-4">
            <h2 className="mb-4 text-lg font-semibold text-[#1A237E]">By Category</h2>
            <div className="space-y-3">
              {categoryList.map((c, i) => {
                const pct = (c.amount / totalMonth) * 100;
                return (
                  <motion.div key={c.category} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700">{c.category}</span>
                      <span className="font-semibold text-[#1A237E]">₹{c.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </BentoCard>

          <BentoCard padding={false} className="col-span-12">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-[#1A237E]">Recent Expenses</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Date","Vendor","Category","Amount","Paid By"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(expenses || []).slice(0, 20).map((exp) => (
                  <tr key={exp.id}>
                    <td className="px-4 py-3 text-gray-600">{new Date(exp.expense_date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{exp.vendor || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{exp.category || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#1A237E]">₹{exp.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{exp.payment_method || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BentoCard>
        </div>
      )}
    </PageShell>
  );
}
