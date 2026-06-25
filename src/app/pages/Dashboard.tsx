import React, { useEffect, useState } from "react";
import BentoCard from "../components/BentoCard";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { UserPlus, DollarSign, ClipboardList, BarChart3, Users, GraduationCap, TrendingUp } from "lucide-react";
import { studentsService } from "../../lib/services/students.service";
import { admissionsService } from "../../lib/services/admissions.service";
import { feesService } from "../../lib/services/fees.service";
import { useAuth } from "../../lib/auth/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [feeSummary, setFeeSummary] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentsService.list({ page_size: 1 }).catch(() => null),
      admissionsService.list({ page_size: 200 }).catch(() => null),
      feesService.listInvoices({ page_size: 200 }).catch(() => null),
    ]).then(([students, leads, invoices]) => {
      if (students) setStudentCount(students.meta.total);
      if (leads) {
        const counts: Record<string, number> = {};
        leads.data.forEach((l) => { counts[l.stage] = (counts[l.stage] ?? 0) + 1; });
        setLeadCounts(counts);
      }
      if (invoices) {
        const total = invoices.data.reduce((s, i) => s + i.total_amount, 0);
        const paid  = invoices.data.reduce((s, i) => s + i.paid_amount, 0);
        setFeeSummary({ total, paid, pending: total - paid });
      }
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const enrolledLeads = (leadCounts["enrolled"] ?? 0);
  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-[#FAFAFA] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome back, {user?.name}. Here's your school overview.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Users}        tone="indigo"  label="Total Students"      value={loading ? "—" : String(studentCount ?? 0)} />
        <KpiCard icon={DollarSign}   tone="emerald" label="Fee Collected (YTD)" value={loading ? "—" : fmt(feeSummary.paid)} />
        <KpiCard icon={GraduationCap} tone="amber"  label="Admissions Enrolled" value={loading ? "—" : String(enrolledLeads)} />
        <KpiCard icon={TrendingUp}   tone="rose"    label="Total Leads"         value={loading ? "—" : String(totalLeads)} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Fee summary */}
        <BentoCard className="col-span-12 lg:col-span-8">
          <h2 className="text-lg font-semibold text-[#1A237E] mb-4">Fee Collection Summary</h2>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : feeSummary.total === 0 ? (
            <EmptyState message="No fee invoices yet. Create a fee structure and generate invoices from the Fees module." />
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <SummaryBox label="Total Invoiced" value={fmt(feeSummary.total)} color="text-[#1A237E]" />
              <SummaryBox label="Collected"      value={fmt(feeSummary.paid)}    color="text-[#4CAF50]" />
              <SummaryBox label="Outstanding"    value={fmt(feeSummary.pending)} color="text-[#EF5350]" />
            </div>
          )}
        </BentoCard>

        {/* Admissions pipeline */}
        <BentoCard className="col-span-12 lg:col-span-4">
          <h2 className="text-lg font-semibold text-[#1A237E] mb-4">Admissions Pipeline</h2>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : totalLeads === 0 ? (
            <EmptyState message="No admission leads yet. Add leads from the Admissions module." />
          ) : (
            <div className="space-y-2">
              {(["inquiry","application","visit","test","enrolled"] as const).map((stage) => {
                const count = leadCounts[stage] ?? 0;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                const labels: Record<string, string> = { inquiry:"Inquiry", application:"Application", visit:"Campus Visit", test:"Entrance Test", enrolled:"Enrolled" };
                const colors: Record<string, string> = { inquiry:"bg-blue-400", application:"bg-amber-400", visit:"bg-purple-400", test:"bg-sky-400", enrolled:"bg-emerald-500" };
                return (
                  <div key={stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{labels[stage]}</span>
                      <span className="font-semibold text-[#1A237E]">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${colors[stage]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BentoCard>

        {/* Quick Actions */}
        <BentoCard className="col-span-12">
          <h2 className="text-lg font-semibold text-[#1A237E] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Students", path: "/students", icon: UserPlus, bg: "bg-[#E3F2FD]", ibg: "bg-[#00897B]" },
              { label: "Fees", path: "/fees", icon: DollarSign, bg: "bg-[#E8F5E9]", ibg: "bg-[#4CAF50]" },
              { label: "Attendance", path: "/attendance", icon: ClipboardList, bg: "bg-[#FFF3E0]", ibg: "bg-[#FF9800]" },
              { label: "Admissions", path: "/admissions", icon: BarChart3, bg: "bg-[#F3E5F5]", ibg: "bg-[#9C27B0]" },
            ].map(({ label, path, icon: Icon, bg, ibg }) => (
              <button key={path} onClick={() => navigate(path)} className={`flex flex-col items-center justify-center p-4 ${bg} hover:opacity-80 rounded-xl transition-opacity group`}>
                <div className={`w-10 h-10 ${ibg} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-[#1A237E]">{label}</span>
              </button>
            ))}
          </div>
        </BentoCard>
      </div>
    </motion.div>
  );
}

function KpiCard({ icon: Icon, tone, label, value }: { icon: React.ElementType; tone: "indigo"|"emerald"|"amber"|"rose"; label: string; value: string }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600" } as const;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <BentoCard>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]} mb-3`}><Icon className="h-5 w-5" /></div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-[#1A237E]">{value}</div>
      </BentoCard>
    </motion.div>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center text-center">
      <p className="text-sm text-gray-400 max-w-xs">{message}</p>
    </div>
  );
}
