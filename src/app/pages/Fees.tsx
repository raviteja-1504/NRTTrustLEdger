import { useState, useEffect } from "react";
import BentoCard from "../components/BentoCard";
import { Search, DollarSign, Download, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { feesService } from "../../lib/services/fees.service";
import { studentsService } from "../../lib/services/students.service";
import type { ApiFeeInvoice, ApiStudent } from "../../lib/services/types";

export default function Fees() {
  const [invoices, setInvoices] = useState<ApiFeeInvoice[]>([]);
  const [students, setStudents] = useState<Record<string, ApiStudent>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      feesService.listInvoices({ page_size: 200 }).catch(() => null),
      studentsService.list({ page_size: 200 }).catch(() => null),
    ]).then(([invRes, stuRes]) => {
      if (invRes) setInvoices(invRes.data);
      if (stuRes) {
        const map: Record<string, ApiStudent> = {};
        stuRes.data.forEach((s) => { map[s.id] = s; });
        setStudents(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = (invoices || []).filter((inv) => {
    const student = students[inv.student_id];
    const matchesQ = student?.name.toLowerCase().includes(q.toLowerCase()) || inv.student_id.toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  const totalInvoiced = filtered.reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = filtered.reduce((s, i) => s + i.paid_amount, 0);
  const totalPending = totalInvoiced - totalPaid;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-[#FAFAFA] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Fee Management</h1>
        <p className="text-gray-600">Track invoices, payments, and outstanding balances</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by student name or ID" className="flex-1 bg-transparent outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <BentoCard>
          <div className="text-2xl font-bold text-[#1A237E]">₹{totalInvoiced.toLocaleString("en-IN")}</div>
          <div className="text-sm text-gray-600">Total Invoiced</div>
        </BentoCard>
        <BentoCard>
          <div className="text-2xl font-bold text-[#4CAF50]">₹{totalPaid.toLocaleString("en-IN")}</div>
          <div className="text-sm text-gray-600">Collected</div>
        </BentoCard>
        <BentoCard>
          <div className="text-2xl font-bold text-[#EF5350]">₹{totalPending.toLocaleString("en-IN")}</div>
          <div className="text-sm text-gray-600">Outstanding</div>
        </BentoCard>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading invoices…
        </div>
      ) : filtered.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No fee invoices found. Create fee structures and generate invoices from the Fees module.</p>
          </div>
        </BentoCard>
      ) : (
        <BentoCard>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Student","Invoice ID","Total","Paid","Balance","Status","Due Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const student = students[inv.student_id];
                const statusColors = { pending: "bg-gray-100 text-gray-700", partial: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700", overdue: "bg-red-100 text-red-700", waived: "bg-sky-100 text-sky-700" };
                return (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{student?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-semibold text-[#1A237E]">₹{inv.total_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-[#4CAF50]">₹{inv.paid_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-[#EF5350]">₹{(inv.total_amount - inv.paid_amount).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-gray-600">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </BentoCard>
      )}
    </motion.div>
  );
}
