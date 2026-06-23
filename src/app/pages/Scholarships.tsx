import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Award, CheckCircle2, Clock, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";
import { feesService } from "../../lib/services/fees.service";
import type { ApiScholarship } from "../../lib/services/types";

const typeColors: Record<string, string> = {
  merit: "bg-indigo-50 text-indigo-700",
  sports: "bg-emerald-50 text-emerald-700",
  need_based: "bg-rose-50 text-rose-700",
  staff: "bg-amber-50 text-amber-700",
};
const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

export default function Scholarships() {
  const [scholarships, setScholarships] = useState<ApiScholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feesService.listScholarships({ page_size: 200 })
      .then((res) => setScholarships(res?.data || []))
      .catch(() => setScholarships([]))
      .finally(() => setLoading(false));
  }, []);

  const approved = scholarships.filter((r) => r.status === "approved");
  const totalImpact = approved.reduce((a, r) => a + (r.discount_amount || 0), 0);

  return (
    <PageShell>
      <PageHeader
        title="Scholarships & Concessions"
        subtitle="Approve discounts and track their impact on fee collections"
        actions={
          <Can permission="scholarships.write">
            <button className="rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
              + New Concession
            </button>
          </Can>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading scholarships…
        </div>
      ) : scholarships.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No scholarships recorded yet. Create scholarship applications to track fee concessions.</p>
          </div>
        </BentoCard>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={Award} tone="bg-indigo-50 text-indigo-600" label="Total Recipients" value={String(scholarships.length)} />
            <Stat icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" label="Approved" value={String(approved.length)} />
            <Stat icon={Clock} tone="bg-amber-50 text-amber-600" label="Pending" value={String(scholarships.filter((r) => r.status === "pending").length)} />
            <Stat icon={TrendingDown} tone="bg-rose-50 text-rose-600" label="Collection Impact" value={`₹${(totalImpact / 1000).toFixed(0)}k`} />
          </div>

          <BentoCard padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Student","Type","%","Amount","Status","Approver"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scholarships.map((r, i) => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.student_id}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[r.scholarship_type] || "bg-gray-100 text-gray-700"}`}>{r.scholarship_type}</span></td>
                      <td className="px-4 py-3 text-gray-700">{r.discount_percent}%</td>
                      <td className="px-4 py-3 font-semibold text-[#1A237E]">₹{(r.discount_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[r.status] || "bg-gray-100 text-gray-700"}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-gray-500">{r.approved_by || "—"}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </>
      )}
    </PageShell>
  );
}

function Stat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <BentoCard>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold text-[#1A237E]">{value}</div>
        </div>
      </div>
    </BentoCard>
  );
}
